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
    const out = await compile('set-var "lrn-id" "t" questions [mcq {}] {}..');
    expect(out.type).toBe("questions");
    const q = out.data.questions[0];
    expect(q.type).toBe("mcq");
    expect(q.reference).toBe("artcompiler-mcq-t-0");
    expect(q.data.type).toBe("mcq");
    expect(q.data.options).toHaveLength(4);
  });

  test("custom mcq attributes override defaults and build validation", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [mcq {stimulus: "2+2?", options: ["3", "4"], valid_response: [1]}] {}..');
    const d = out.data.questions[0].data;
    expect(d.stimulus).toBe("2+2?");
    expect(d.options).toEqual([
      { label: "3", value: "0" },
      { label: "4", value: "1" },
    ]);
    expect(d.validation).toEqual({
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: ["1"] },
    });
  });

  test("partial-credit switches a multi-response mcq to partialMatch scoring", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [mcq {stimulus: "Pick two", options: ["a", "b", "c"], valid_response: [0, 1], multiple_responses: true, partial_credit: true}] {}..');
    const d = out.data.questions[0].data;
    expect(d.validation).toEqual({
      scoring_type: "partialMatch",
      valid_response: { score: 1, value: ["0", "1"] },
    });
    // The attribute picks a scoring mode; it is not itself a Learnosity field.
    expect(d.partial_credit).toBeUndefined();
  });

  test("partial-credit chains as an attribute keyword", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [mcq options ["a", "b", "c"] valid-response [0, 1] multiple-responses true partial-credit true {}] {}..');
    expect(out.data.questions[0].data.validation.scoring_type).toBe("partialMatch");
  });

  test("partial-credit false leaves scoring exact", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [mcq {valid_response: [0], partial_credit: false}] {}..');
    expect(out.data.questions[0].data.validation.scoring_type).toBe("exactMatch");
  });

  test("partial-credit applies to the multi-blank cloze types", async () => {
    // clozetext is excluded: it is on the aligned vocabulary and writes
    // scoring-type directly. See the clozetext describe block below.
    const out = await compile('set-var "lrn-id" "t" questions [clozeassociation {valid_response: ["a", "b"], partial_credit: true}] {}..');
    expect(out.data.questions[0].data.validation.scoring_type).toBe("partialMatch");
  });

  test("token-highlight marks tokens and scores correct spans by document order", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [token-highlight {passage: "The cat runs and jumps.", valid_response: ["runs", "jumps"], distractors: ["cat"]}] {}..');
    const d = out.data.questions[0].data;
    expect(d.type).toBe("tokenhighlight");
    expect(d.template).toContain('<span class="lrn_token">runs</span>');
    // cat is token 0, runs token 1, jumps token 2 → correct spans [1, 2]
    expect(d.validation.valid_response.value).toEqual([1, 2]);
  });

  // `hot-text` was renamed to `token-highlight` and dropped from every public surface,
  // but sources saved under the old spelling must keep compiling identically.
  test("the deprecated hot-text alias still compiles as token-highlight", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [hot-text {passage: "The cat runs and jumps.", valid_response: ["runs", "jumps"], distractors: ["cat"]}] {}..');
    const d = out.data.questions[0].data;
    expect(d.type).toBe("tokenhighlight");
    expect(d.validation.valid_response.value).toEqual([1, 2]);
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
    const out = await compile('set-var "lrn-id" "t" questions [clozeformula stimulus "a {{response}} b {{response}}" valid-response ["11", "5"] {}] {}..');
    const v = out.data.questions[0].data.validation;
    expect(answers(v.valid_response)).toEqual(["11", "5"]);
    expect(v.alt_responses).toBeUndefined();
  });

  test("a nested entry accepts several expressions in one blank", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozeformula stimulus "S {{response}}" valid-response [["1/2", "0.5", "2/4"]] method "equivLiteral" {}] {}..');
    const v = out.data.questions[0].data.validation;
    expect(answers(v.valid_response)).toEqual(["1/2"]);
    expect(v.alt_responses.map(answers)).toEqual([["0.5"], ["2/4"]]);
    expect(v.alt_responses[0].score).toBe(1);
    expect(v.alt_responses[0].value[0][0].method).toBe("equivLiteral");
  });

  test("alternates in one blank pair with every other blank's answer", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozeformula stimulus "a {{response}} b {{response}}" valid-response [["2x", "x*2"], ["5"]] {}] {}..');
    const v = out.data.questions[0].data.validation;
    expect(answers(v.valid_response)).toEqual(["2x", "5"]);
    expect(v.alt_responses.map(answers)).toEqual([["x*2", "5"]]);
  });

  test("too many combinations is a compile error, not an unwieldy alt_responses", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozeformula valid-response [["a", "b", "c", "d"], ["e", "f", "g"], ["h", "i", "j"]] {}] {}..')
    ).rejects.toMatchObject([{ message: expect.stringContaining("36 accepted answer combinations") }]);
  });

  test("an empty accepted-answer list is a compile error", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozeformula valid-response [[]] {}] {}..')
    ).rejects.toMatchObject([{ message: expect.stringContaining("empty list") }]);
  });
});

describe("items path", () => {
  test("items renders inline questions under a questions envelope", async () => {
    const out = await compile('set-var "lrn-id" "item-1" items [item questions [mcq {}] {}] {}..');
    expect(out.type).toBe("questions");
    expect(out.data.id).toBe("item-1");
    expect(out.data.questions[0].response_id).toBe("artcompiler-mcq-item-1-0");
    expect(out.data.questions[0].type).toBe("mcq");
  });
});

describe("error paths", () => {
  test("questions without lrn-id yields an empty record (no error)", async () => {
    const out = await compile('questions [mcq {}] {}..');
    expect(out).toEqual({});
  });

  test("bowtie with wrong 2-1-2 counts errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [bowtie {column_titles: ["A", "C", "P"], possible_responses: [["a1", "a2"], ["c1"], ["p1", "p2"]], valid_response: [["a1"], ["c1"], ["p1"]]}] {}..'),
    ).rejects.toBeTruthy();
  });

  test("partial-credit on a single-response mcq errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [mcq {valid_response: [0], partial_credit: true}] {}..'),
    ).rejects.toBeTruthy();
  });

  test("partial-credit on an all-or-nothing type errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [shorttext {valid_response: "a", partial_credit: true}] {}..'),
    ).rejects.toBeTruthy();
  });

  test("save-to-itembank without program credentials errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [mcq {}] save-to-itembank true {}..'),
    ).rejects.toBeTruthy();
  });
});

// clozetext is the first question type converted to the aligned vocabulary:
// every attribute is named for the Learnosity field it emits, and the program
// nests the way the object nests. These tests pin that correspondence.
describe("clozetext (aligned vocabulary)", () => {
  const program = `set-var "lrn-id" "t" questions [
    clozetext
      stimulus "Fill in the blanks."
      template "The {{response}} is the {{response}}."
      case-sensitive false
      max-length 20
      validation
        scoring-type "partialMatch"
        valid-response [score 1 value ["cat", "mat"]]
        alt-responses [[score 1 value ["feline", "mat"]]
                       [value ["cat", "rug"]]]
        {}
      {}
  ] {}..`;

  test("the program transcribes to the Learnosity object", async () => {
    const out = await compile(program);
    expect(out.data.questions[0].data).toEqual({
      type: "clozetext",
      stimulus: "Fill in the blanks.",
      template: "The {{response}} is the {{response}}.",
      case_sensitive: false,
      max_length: 20,
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
      clozetext template "A {{response}}."
        validation valid-response [value ["x"] score 3] {}
      {}] {}..`);
    expect(out.data.questions[0].data.validation.valid_response).toEqual({
      value: ["x"], score: 3,
    });
  });

  test("a member list may omit score", async () => {
    const out = await compile(`set-var "lrn-id" "t" questions [
      clozetext template "A {{response}}."
        validation alt-responses [[value ["x"]]] {}
      {}] {}..`);
    expect(out.data.questions[0].data.validation.alt_responses).toEqual([{ value: ["x"] }]);
  });

  test("defaults produce a complete question in the aligned shape", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozetext {}] {}..');
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
    // Before per-type validation this compiled and emitted `passage` — a
    // token-highlight field — onto the clozetext.
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext template "A {{response}}." passage "x" {}] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("`passage` is not an attribute of clozetext"),
    }));
  });

  test("the pre-alignment flat spelling is rejected", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext valid-response ["x"] partial-credit true {}] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("not attributes of clozetext"),
    }));
  });

  test("an unsupported scoring-type is rejected rather than silently ignored", async () => {
    // Learnosity falls back to exactMatch on an unrecognized value, which turns
    // a typo into a silently mis-scored question.
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext template "A {{response}}." validation scoring-type "partialMatchElement" {} {}] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("use one of exactMatch, partialMatchV2, partialMatch"),
    }));
  });

  test("alt-responses rejects a bare list of answers", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [clozetext template "A {{response}}." validation alt-responses ["x"] {} {}] {}..')
    ).rejects.toContainEqual(expect.objectContaining({
      message: expect.stringContaining("is not a member list"),
    }));
  });

  test("the other question types keep the flat spelling until converted", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [clozedropdown {valid_response: ["a"], partial_credit: true}] {}..');
    expect(out.data.questions[0].data.validation).toEqual({
      scoring_type: "partialMatch",
      valid_response: { score: 1, value: ["a"] },
    });
  });
});
