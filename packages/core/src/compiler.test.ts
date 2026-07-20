// SPDX-License-Identifier: MIT
// Unit tests for the L0176 compiler. These assert the shape of the compiled
// Learnosity output directly.
import { describe, test, expect } from "vitest";
import { parser } from "@graffiticode/parser";
import { compiler, lexicon } from "./index.js";

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

  test("hot-text marks tokens and scores correct spans by document order", async () => {
    const out = await compile('set-var "lrn-id" "t" questions [hot-text {passage: "The cat runs and jumps.", valid_response: ["runs", "jumps"], distractors: ["cat"]}] {}..');
    const d = out.data.questions[0].data;
    expect(d.type).toBe("tokenhighlight");
    expect(d.template).toContain('<span class="lrn_token">runs</span>');
    // cat is token 0, runs token 1, jumps token 2 → correct spans [1, 2]
    expect(d.validation.valid_response.value).toEqual([1, 2]);
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

describe("questions render request (init)", () => {
  // The Questions API renders by response_id and reads question fields at the
  // top level. Signing the internal {type, reference, data} envelope directly
  // produced questions with no response_id (Learnosity then threw an undefined
  // "triggerBufferedEvents" error), so init must flatten them like the items path.
  const cfg = { learnosity: { key: "yis0TYCu7U9V4o7M", secret: "74c5fd430cf1242a527f6223aebd42d30464be22" } };
  test("signed questions request is flat with a response_id", async () => {
    const out = await compile('set-var "lrn-id" "t" init questions [mcq {stimulus: "2+2?"}] {}..', {}, cfg);
    expect(out.signature).toBeTruthy();
    const q = out.questions[0];
    expect(q.response_id).toBe("artcompiler-mcq-t-0");
    expect(q.type).toBe("mcq");
    expect(q.stimulus).toBe("2+2?");
    expect(q.data).toBeUndefined();
    expect(q.reference).toBeUndefined();
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

  test("save-to-itembank without program credentials errors", async () => {
    await expect(
      compile('set-var "lrn-id" "t" questions [mcq {}] save-to-itembank true {}..'),
    ).rejects.toBeTruthy();
  });
});
