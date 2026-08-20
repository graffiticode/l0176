// SPDX-License-Identifier: MIT
// Unit tests for the L0176 compiler. These assert the shape of the compiled
// Learnosity output directly.
import { describe, test, expect } from "vitest";
import { parser } from "@graffiticode/parser";
import { compiler, lexicon, deprecatedWords } from "./index.js";

async function compile(src: string, data: any = {}, config: any = {}): Promise<any> {
  const code = await parser.parse(176, src, lexicon);
  return await new Promise((resolve, reject) => {
    compiler.compile(code, data, config, (err: any, val: any) => {
      const errors = Array.isArray(err) ? err.filter(Boolean) : err ? [err] : [];
      if (errors.length > 0) reject(errors);
      else resolve(val);
    });
  });
}

describe("questions path", () => {
  test("mcq with defaults produces a Learnosity questions envelope", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [mcq []] {}..');
    expect(out.type).toBe("questions");
    const q = out.data.questions[0];
    expect(q.type).toBe("mcq");
    expect(q.reference).toBe("artcompiler-mcq-t-0");
    expect(q.data.type).toBe("mcq");
    expect(q.data.options).toHaveLength(4);
  });

  test("mcq options are the {label, value} objects Learnosity documents", async () => {
    // The builder used to invent `value` from the array index. It is what a
    // response records, so it is the author's to choose.
    const out = await compile(`set-var "lrn-id" "t" questions [
      mcq [
        stimulus "Which has the smallest wavelength?"
        options [[label "Red" value "red"] [label "Violet" value "violet"]]
        validation [valid-response [score 1 value ["violet"]]]
      ]] {}..`);
    const d = out.data.questions[0].data;
    expect(d.options).toEqual([
      { label: "Red", value: "red" },
      { label: "Violet", value: "violet" },
    ]);
    expect(d.validation).toEqual({ valid_response: { score: 1, value: ["violet"] } });
  });

  test("scoring-type replaces the partial-credit boolean", async () => {
    const out = await compile(`set-var "lrn-id" "t" questions [
      mcq [
        options [[label "a" value "0"] [label "b" value "1"]]
        multiple-responses true
        validation [scoring-type "partialMatch" valid-response [score 1 value ["0", "1"]]]
      ]] {}..`);
    expect(out.data.questions[0].data.validation.scoring_type).toBe("partialMatch");
  });

  test("partial-credit is gone from every converted type", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [mcq [valid-response [0] partial-credit true]] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("not attributes of mcq"),
    }));
  });

  test("token-highlight takes its own lrn_token markup and span indices", async () => {
    // markTokens used to wrap the spans and compute the indices from a plain
    // passage plus token strings. The author writes both now.
    const out = await compile(`set-var "lrn-id" "t" questions [
      token-highlight [
        stimulus "Highlight the verbs."
        template "The <span class=\\"lrn_token\\">cat</span> <span class=\\"lrn_token\\">runs</span>."
        tokenization "custom"
        validation [valid-response [score 1 value [1]]]
      ]] {}..`);
    const d = out.data.questions[0].data;
    expect(d.type).toBe("tokenhighlight");
    expect(d.template).toContain('<span class="lrn_token">runs</span>');
    expect(d.validation.valid_response.value).toEqual([1]);
  });

  // `hot-text` was renamed to `token-highlight` and dropped from every public surface,
  // but sources saved under the old spelling must keep compiling identically.
  test("the deprecated hot-text alias still compiles as token-highlight", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [hot-text [stimulus "x"]] {}..');
    expect(out.data.questions[0].data.type).toBe("tokenhighlight");
  });

  test("the deprecated alias is absent from the published lexicon", async () => {
    expect(lexicon["hot-text"]).toBeDefined(); // still lexes
    expect(deprecatedWords).toContain("hot-text"); // but is stripped from lexicon.json
  });
});

// `valid-response` on clozeformula is positional — one entry per {{response}} blank.
// A nested entry lists the expressions that blank accepts; the extras become
// Learnosity alt_responses, which is the only way to accept a finite set of answers.
describe("clozeformula accepted answers", () => {
  const answers = (o: any) => o.value.map((blank: any) => blank[0].value);

  test("flat entries stay one blank each", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozeformula [stimulus "a {{response}} b {{response}}" valid-response ["11", "5"]]] {}..');
    const v = out.data.questions[0].data.validation;
    expect(answers(v.valid_response)).toEqual(["11", "5"]);
    expect(v.alt_responses).toBeUndefined();
  });

  test("a nested entry accepts several expressions in one blank", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozeformula [stimulus "S {{response}}" valid-response [["1/2", "0.5", "2/4"]] method "equivLiteral"]] {}..');
    const v = out.data.questions[0].data.validation;
    expect(answers(v.valid_response)).toEqual(["1/2"]);
    expect(v.alt_responses.map(answers)).toEqual([["0.5"], ["2/4"]]);
    expect(v.alt_responses[0].score).toBe(1);
    expect(v.alt_responses[0].value[0][0].method).toBe("equivLiteral");
  });

  test("alternates in one blank pair with every other blank's answer", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozeformula [stimulus "a {{response}} b {{response}}" valid-response [["2x", "x*2"], ["5"]]]] {}..');
    const v = out.data.questions[0].data.validation;
    expect(answers(v.valid_response)).toEqual(["2x", "5"]);
    expect(v.alt_responses.map(answers)).toEqual([["x*2", "5"]]);
  });

  test("too many combinations is a compile error, not an unwieldy alt_responses", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozeformula [valid-response [["a", "b", "c", "d"], ["e", "f", "g"], ["h", "i", "j"]]]] {}..')
    ).rejects.toMatchObject([{ message: expect.stringContaining("36 accepted answer combinations") }]);
  });

  test("an empty accepted-answer list is a compile error", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozeformula [valid-response [[]]]] {}..')
    ).rejects.toMatchObject([{ message: expect.stringContaining("empty list") }]);
  });
});

describe("items path", () => {
  test("items renders inline questions under a questions envelope", async () => {
    const out = await compile('set-var "lrn-id" "item-1" items [item [questions [mcq []] {}]] {}..');
    expect(out.type).toBe("questions");
    expect(out.data.id).toBe("item-1");
    expect(out.data.questions[0].response_id).toBe("artcompiler-mcq-item-1-0");
    expect(out.data.questions[0].type).toBe("mcq");
  });
});

describe("error paths", () => {
  test("questions without lrn-id yields an empty record (no error)", async () => {
    const out = await compile('questions [mcq []] {}..');
    expect(out).toEqual({});
  });

  test("bowtie with wrong 2-1-2 counts errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [bowtie [column-titles ["A", "C", "P"] possible-responses [["a1", "a2"], ["c1"], ["p1", "p2"]] valid-response [["a1"], ["c1"], ["p1"]]]] {}..'),
    ).rejects.toBeTruthy();
  });

  test("partial-credit on a single-response mcq errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [mcq [valid-response [0] partial-credit true]] {}..'),
    ).rejects.toBeTruthy();
  });

  test("partial-credit on an all-or-nothing type errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [shorttext [valid-response "a" partial-credit true]] {}..'),
    ).rejects.toBeTruthy();
  });

  test("save-to-itembank without program credentials errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [mcq []] save-to-itembank true {}..'),
    ).rejects.toBeTruthy();
  });
});

// clozetext is the first question type converted to the aligned vocabulary:
// every attribute is named for the Learnosity field it emits, and the program
// nests the way the object nests. These tests pin that correspondence.
describe("clozetext (aligned vocabulary)", () => {
  const program = `set-var "lrn-id" "t" questions [
    clozetext [
      stimulus "Fill in the blanks."
      template "The {{response}} is the {{response}}."
      case-sensitive false
      max-length 20
      response-container [placeholder "type here" width "80px"]
      validation [
        scoring-type "partialMatch"
        valid-response [score 1 value ["cat", "mat"]]
        alt-responses [[score 1 value ["feline", "mat"]]
                       [value ["cat", "rug"]]]
      ]
    ]
  ] {}..`;

  test("the program transcribes to the Learnosity object", async () => {
    const out = await compile(program);
    expect(out.data.questions[0].data).toEqual({
      type: "clozetext",
      stimulus: "Fill in the blanks.",
      template: "The {{response}} is the {{response}}.",
      case_sensitive: false,
      max_length: 20,
      response_container: { placeholder: "type here", width: "80px" },
      validation: {
        scoring_type: "partialMatch",
        valid_response: { score: 1, value: ["cat", "mat"] },
        alt_responses: [
          { score: 1, value: ["feline", "mat"] },
          { value: ["cat", "rug"] },
        ],
      },
    });
  });

  test("stimulus is the prompt and template carries the blanks", async () => {
    // The pre-alignment builder wrote `stimulus` into `template` and emitted no
    // `stimulus` at all, so a cloze could not carry a prompt of its own.
    const d = (await compile(program)).data.questions[0].data;
    expect(d.stimulus).toBe("Fill in the blanks.");
    expect(d.template).toContain("{{response}}");
  });

  test("score and value merge into one object per member list", async () => {
    const out = await compile(`set-var "lrn-id" "t" questions [
      clozetext [template "A {{response}}."
        validation [valid-response [value ["x"] score 3]]]] {}..`);
    expect(out.data.questions[0].data.validation.valid_response).toEqual({
      value: ["x"], score: 3,
    });
  });

  test("a member list may omit score", async () => {
    const out = await compile(`set-var "lrn-id" "t" questions [
      clozetext [template "A {{response}}."
        validation [alt-responses [[value ["x"]]]]]] {}..`);
    expect(out.data.questions[0].data.validation.alt_responses).toEqual([{ value: ["x"] }]);
  });

  test("defaults produce a complete question in the aligned shape", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozetext []] {}..');
    expect(out.data.questions[0].data).toEqual({
      type: "clozetext",
      template: "The {{response}} is the answer.",
      validation: {
        scoring_type: "exactMatch",
        valid_response: { score: 1, value: ["answer"] },
      },
    });
  });

  test("an attribute belonging to another type is rejected", async () => {
    // Before per-type validation this compiled and emitted the stray field.
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext [template "A {{response}}." options ["x"]]] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("`options` is not an attribute of clozetext"),
    }));
  });

  test("the pre-alignment flat spelling is rejected", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext [valid-response ["x"] partial-credit true]] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("not attributes of clozetext"),
    }));
  });

  test("an unsupported scoring-type is rejected rather than silently ignored", async () => {
    // Learnosity falls back to exactMatch on an unrecognized value, which turns
    // a typo into a silently mis-scored question.
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext [template "A {{response}}." validation [scoring-type "partialMatchElement"]]] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("use one of exactMatch, partialMatchV2, partialMatch"),
    }));
  });

  test("alt-responses rejects a bare list of answers", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext [template "A {{response}}." validation [alt-responses ["x"]]]] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("alt-responses[1]: expected a member list"),
    }));
  });

  test("clozeformula is the last type still on the flat spelling", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozeformula [stimulus "a {{response}}" valid-response ["11"]]] {}..');
    expect(out.data.questions[0].data.validation.valid_response.value[0][0].value).toBe("11");
  });
});

// The seven types whose builders did nothing but rename and lift. Each is now a
// transcription of the Learnosity object, so the test for each is that the
// program and the emitted JSON have the same shape.
describe("the mechanical types (aligned vocabulary)", () => {
  const q = async (src: string) => (await compile(`set-var "lrn-id" "t" questions [${src}] {}..`)).data.questions[0].data;

  test("shorttext: valid_response.value is a bare string, not an array", async () => {
    expect(await q(`shorttext [
      stimulus "What is the capital of Ireland?"
      case-sensitive true
      validation [
        valid-response [value "Dublin"]
        alt-responses [[score 2 value "Baile Atha Cliath"]]
      ]
    ]`)).toEqual({
      type: "shorttext",
      stimulus: "What is the capital of Ireland?",
      case_sensitive: true,
      validation: {
        valid_response: { value: "Dublin" },
        alt_responses: [{ score: 2, value: "Baile Atha Cliath" }],
      },
    });
  });

  test("longtext emits longtextV2, the current type for the bare slug's widget", async () => {
    const d = await q('longtext [stimulus "Write about your hobbies." max-length 400]');
    expect(d.type).toBe("longtextV2");
    expect(d.max_length).toBe(400);
  });

  test("plaintext carries its own clipboard controls", async () => {
    const d = await q('plaintext [stimulus "Write." show-copy true show-paste false]');
    expect(d).toMatchObject({ type: "plaintext", show_copy: true, show_paste: false });
  });

  test("orderlist reaches partialMatchPairwise, which no other type documents", async () => {
    const d = await q(`orderlist [
      stimulus "Order them."
      list ["a", "b", "c"]
      validation [scoring-type "partialMatchPairwise" valid-response [score 1 value [2, 0, 1]]]
    ]`);
    expect(d.validation).toEqual({
      scoring_type: "partialMatchPairwise",
      valid_response: { score: 1, value: [2, 0, 1] },
    });
  });

  test("clozeassociation carries a prompt and a passage as separate fields", async () => {
    const d = await q(`clozeassociation [
      stimulus "Drag each word into place."
      template "The {{response}} sat on the {{response}}."
      possible-responses ["cat", "mat", "hat"]
      validation [valid-response [value ["cat", "mat"]]]
    ]`);
    expect(d.stimulus).toBe("Drag each word into place.");
    expect(d.template).toContain("{{response}}");
    expect(d.possible_responses).toEqual(["cat", "mat", "hat"]);
  });

  test("clozedropdown takes one list of options per drop-down", async () => {
    const d = await q(`clozedropdown [
      template "The {{response}} sat on the {{response}}."
      possible-responses [["cat", "dog"], ["mat", "rug"]]
      validation [valid-response [value ["cat", "mat"]]]
    ]`);
    expect(d.possible_responses).toEqual([["cat", "dog"], ["mat", "rug"]]);
  });

  test("choicematrix uses Learnosity's stems and options, not rows and columns", async () => {
    const d = await q(`choicematrix [
      stimulus "True or false?"
      stems ["Sydney is the capital of Australia." "Darwin is in the NT."]
      options ["True", "False"]
      multiple-responses false
      validation [valid-response [score 1 value [[1], [0]]]]
    ]`);
    expect(d).toMatchObject({
      type: "choicematrix",
      stems: ["Sydney is the capital of Australia.", "Darwin is in the NT."],
      options: ["True", "False"],
    });
    expect(d.rows).toBeUndefined();
    expect(d.columns).toBeUndefined();
  });

  test("each rejects an attribute that belongs to another type", async () => {
    await expect(q('shorttext [stimulus "x" template "y"]'))
      .rejects.toContainEqual(expect.objectContaining({
        message: expect.stringContaining("`template` is not an attribute of shorttext"),
      }));
    await expect(q('choicematrix [stimulus "x" list ["a"]]'))
      .rejects.toContainEqual(expect.objectContaining({
        message: expect.stringContaining("`list` is not an attribute of choicematrix"),
      }));
  });

  test("an unsupported scoring-type is rejected per type", async () => {
    // partialMatchPairwise is orderlist's alone.
    await expect(q('clozedropdown [template "a {{response}}" validation [scoring-type "partialMatchPairwise"]]'))
      .rejects.toContainEqual(expect.objectContaining({
        message: expect.stringContaining("use one of exactMatch, partialMatchV2, partialMatch"),
      }));
    // shorttext documents only one mode.
    await expect(q('shorttext [stimulus "x" validation [scoring-type "partialMatch"]]'))
      .rejects.toContainEqual(expect.objectContaining({
        message: expect.stringContaining("use one of exactMatch"),
      }));
  });

  test("defaults still produce a complete question for each", async () => {
    for (const [kw, type] of [["shorttext", "shorttext"], ["longtext", "longtextV2"],
                              ["plaintext", "plaintext"], ["orderlist", "orderlist"],
                              ["clozeassociation", "clozeassociation"],
                              ["clozedropdown", "clozedropdown"], ["choicematrix", "choicematrix"]]) {
      const d = await q(`${kw} []`);
      expect(d.type, kw).toBe(type);
    }
  });
});
