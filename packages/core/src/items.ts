// SPDX-License-Identifier: MIT
// Ported from L0158 packages/api/src/items.js. Credentials (key/secret) are
// supplied per call (injected via config in compiler.ts); the non-secret
// `domain` is baked at construction.
import { v4 as uuid } from "uuid";

// Translate a DSL item-level metadata list into the Learnosity item record's
// faceted `tags`, `metadata` bag, and top-level scalar fields (`note`,
// `description`, `source`, `adaptive.difficulty`).
//
// Input is an array of tagged entries produced by the arity-1 member
// constructors in the DSL: `{ kind, value }` where kind is one of
// "tags" | "notes" | "acknowledgements" |
// "description" | "source" | "difficulty_level".
//
// Faceted conventions like Difficulty, DOK, and standards have no
// dedicated Learnosity fields — authors put them in the `tags` record
// (e.g. `tags { Difficulty: "medium", DOK: 2 }`) and the Author Site
// filter rail surfaces them automatically.
//
// Item details page fields bind to specific Learnosity locations:
//   notes            → item.note (top-level, singular)
//   description      → item.description (top-level)
//   source           → item.source (top-level)
//   difficulty-level → item.adaptive.difficulty (integer Rasch calibration)
//   acknowledgements → item.metadata.acknowledgements (nested bag)
//
// Tag type names follow Learnosity's sample-data convention: title-case for
// words ("Difficulty") and caps for acronyms. Tag values are strings
// (integers are stringified). `tags` entries accept a record whose values are
// a string or an array of strings — a bare string is treated as a single-
// element array for authoring convenience.
export function translateItemMetadata(entries: any) {
  const empty = {
    tags: undefined,
    note: undefined,
    description: undefined,
    source: undefined,
    adaptive: undefined,
    metadata: undefined,
  };
  if (!Array.isArray(entries)) {
    return empty;
  }
  const tags: any = {};
  const meta: any = {};
  let note;
  let description;
  let source;
  let difficultyLevel;
  const pushTag = (type: string, value: any) => {
    if (!tags[type]) tags[type] = [];
    tags[type].push(String(value));
  };
  for (const entry of entries) {
    if (entry == null || typeof entry !== "object") continue;
    const { kind, value } = entry;
    if (value == null) continue;
    if (kind === "tags") {
      if (value == null || typeof value !== "object") continue;
      for (const [type, raw] of Object.entries(value)) {
        if (raw == null) continue;
        const values = Array.isArray(raw) ? raw : [raw];
        for (const v of values) pushTag(type, v);
      }
    } else if (kind === "notes") {
      note = value;
    } else if (kind === "description") {
      description = value;
    } else if (kind === "source") {
      source = value;
    } else if (kind === "difficulty_level") {
      difficultyLevel = value;
    } else if (kind === "acknowledgements") {
      meta.acknowledgements = value;
    }
  }
  return {
    tags: Object.keys(tags).length > 0 ? tags : undefined,
    note,
    description,
    source,
    adaptive: difficultyLevel !== undefined ? { difficulty: difficultyLevel } : undefined,
    metadata: Object.keys(meta).length > 0 ? meta : undefined,
  };
}

const getDynamicContentData = (data: any) => {
  if (!data) {
    return;
  }
  const reference = "graffiticode-" + new Date().toISOString().split(":").join("").split(".").join("");
  let cols: any;
  const rows: any = {};
  if (data) {
    data.forEach((d: any, i: number) => {
      if (!cols) {
        cols = Object.keys(d);
      }
      const vals = Object.values(d);
      rows[reference + "-row-" + i] = {
        "values": vals,
        "index": i,
      };
    });
  }
  return {
    cols: cols,
    rows: rows,
  };
};

export const buildCreateItems = ({
  sdk,
  key,
  secret,
  domain,
  dataApi,
}: any) => async ({
  items,
  id,
  saveToItembank = false,
  key: optKey,
  secret: optSecret,
}: any) => {
  const effKey = optKey ?? key;
  const effSecret = optSecret ?? secret;
  const [ item ] = items;
  // Inherited (from an embedded L0166 custom question) overrides hardwired
  // (declared via the item-level `params` keyword). When a widget is embedded,
  // its expansion is authoritative.
  const dynamicRows =
    (Array.isArray(item.templateVariablesRecords) && item.templateVariablesRecords.length > 0)
      ? item.templateVariablesRecords
      : item.params;
  const itemRef = `graffiticode-${id || "0"}`;
  const questionRecords = item.data.questions;
  const questionWidgets = questionRecords.map((q: any) => ({ reference: q.reference }));
  const dynamicContentData = getDynamicContentData(dynamicRows);
  const { tags, note, description, source, adaptive, metadata } = translateItemMetadata(item.metadata);
  const itemRecord: any = {
    reference: itemRef,
    definition: {
      widgets: questionWidgets,
    },
    dynamic_content_data: dynamicContentData,
    questions: questionWidgets,
  };
  if (tags !== undefined) itemRecord.tags = tags;
  if (note !== undefined) itemRecord.note = note;
  if (description !== undefined) itemRecord.description = description;
  if (source !== undefined) itemRecord.source = source;
  if (adaptive !== undefined) itemRecord.adaptive = adaptive;
  if (metadata !== undefined) itemRecord.metadata = metadata;

  let itemBankResult;
  if (saveToItembank) {
    // Saved items always land as drafts. Publishing is an Author Site
    // concern — the Learnosity item bank UX toggles `status: "published"`.
    itemRecord.status = "unpublished";
    const itemsReq = sdk.init(
      "data",
      {
        consumer_key: effKey,
        domain,
      },
      effSecret,
      {
        items: [itemRecord],
      },
      "set",
    );
    await dataApi({
      route: "/itembank/items",
      request: itemsReq,
    });
    // dataApi throws on non-2xx, so reaching here means the write succeeded.
    // Surface a confirmation so callers (MCP, agents) can verify the save.
    itemBankResult = {
      saved: true,
      references: [itemRef],
      savedAt: new Date().toISOString(),
    };
  }

  // Rendering always goes through Questions API with inline question data.
  // The item bank write (above) is for listing/search only — it doesn't
  // affect the preview, and Items API can't render unpublished items anyway.
  // When item-level features (shared stimulus, layout) land, published items
  // will need to route through Items API from the bank to preserve fidelity.
  const inlineQuestions = questionRecords.map((q: any) => ({
    response_id: q.reference,
    type: q.type,
    ...q.data,
  }));
  const data: any = {
    id: `${id || "0"}`,
    name: "Test",
    questions: inlineQuestions,
    session_id: uuid(),
  };
  if (dynamicContentData) data.dynamic_content_data = dynamicContentData;
  if (itemBankResult) data.itemBank = itemBankResult;
  return { type: "questions", data };
};

export const buildInitItems = ({
  sdk,
  key,
  secret,
  domain,
}: any) => async ({ data }: any, { key: optKey, secret: optSecret }: any = {}) => {
  // Construct a items api request.
  const user_id = uuid();
  const consumer = {
    consumer_key: optKey ?? key,
    domain,
    user_id,
  };
  const signedRequest = sdk.init(
    "items",
    consumer,
    optSecret ?? secret,
    data,
  );
  return signedRequest;
};
