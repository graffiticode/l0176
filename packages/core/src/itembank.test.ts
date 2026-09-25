import { describe, test, expect } from "vitest";
import { buildCreateItems, buildSaveToItembank } from "./items.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Learnosity = require("learnosity-sdk-nodejs");

// An item record references its widgets rather than carrying them, so the
// questions must be in the bank before the item that points at them. Learnosity
// reports the violation as 30001 "Widget ... was not found. Create widget
// first." Rendering never exposed it, because the preview inlines question data.
describe("saving an item to the item bank", () => {
  const run = async () => {
    const calls: any[] = [];
    const save = buildSaveToItembank({
      sdk: new Learnosity(),
      domain: "localhost",
      dataApi: async ({ route, request }: any) => {
        calls.push({ route, body: JSON.parse(request.request) });
        return { meta: { status: true } };
      },
    });
    const { savePlan } = await buildCreateItems()({
      items: [{ data: { questions: [
        { response_id: "ignored", type: "clozeformulaV2", stimulus: "Q1" },
        { response_id: "ignored", type: "mcq", stimulus: "Q2" },
      ] } }],
      id: "batch",
    });
    await save(savePlan, { key: "k", secret: "s".repeat(20) });
    return calls;
  };

  test("questions are written before the item that references them", async () => {
    const calls = await run();
    expect(calls.map((c) => c.route))
      .toEqual(["/itembank/questions", "/itembank/items"]);
  });

  test("every widget the item references was written as a question", async () => {
    const calls = await run();
    const written = new Set(calls[0].body.questions.map((q: any) => q.reference));
    const referenced = calls[1].body.items.flatMap((i: any) =>
      i.definition.widgets.map((w: any) => w.reference));
    expect(referenced.length).toBeGreaterThan(0);
    for (const ref of referenced) expect(written, `${ref} was never written`).toContain(ref);
  });

  test("a question is stored as {type, reference, data} with no response_id", async () => {
    const calls = await run();
    const q = calls[0].body.questions[0];
    expect(Object.keys(q).sort()).toEqual(["data", "reference", "type"]);
    expect(q.reference).toBe("artcompiler-clozeformulaV2-batch-0-0");
    expect(q.data.response_id).toBeUndefined();
    expect(q.data.stimulus).toBe("Q1");
  });
});

describe("building never writes", () => {
  test("createItems returns a plan and makes no provider call", async () => {
    const built = await buildCreateItems()({
      items: [{ data: { questions: [{ response_id: "x", type: "mcq", stimulus: "Q" }] } }],
      id: "b",
    });
    expect(built.activity.type).toBe("questions");
    expect(built.activity.data.itemBank).toBeUndefined();
    expect(built.savePlan.itemRecords).toHaveLength(1);
    expect(built.savePlan.itemRecords[0].status).toBe("unpublished");
  });
});
