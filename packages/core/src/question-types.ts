// SPDX-License-Identifier: MIT
// Ported from L0158 packages/api/src/question-types.js — pure logic, no compiler
// dependency. Objects that are mutated after construction are typed `any` so the
// non-strict TS build accepts the incremental field assignment.

// Default mock data per question type
const DEFAULTS: Record<string, any> = {
  mcq: {
    stimulus: "Which of the following is correct?",
    options: ["Option A", "Option B", "Option C", "Option D"],
    valid_response: [0],
  },
  shorttext: {
    stimulus: "Type your answer below.",
    valid_response: "answer",
  },
  longtext: {
    stimulus: "Write a detailed response.",
    max_length: 500,
    placeholder: "Start writing here...",
  },
  plaintext: {
    stimulus: "Write your response in plain text.",
    max_length: 300,
    placeholder: "Start writing here...",
  },
  clozetext: {
    stimulus: "The {{response}} is the answer.",
    valid_response: ["answer"],
  },
  clozeassociation: {
    stimulus: "Drag the correct {{response}} here.",
    possible_responses: ["correct", "incorrect", "maybe"],
    valid_response: ["correct"],
  },
  clozedropdown: {
    stimulus: "Select the correct {{response}}.",
    possible_responses: [["correct", "incorrect", "maybe"]],
    valid_response: ["correct"],
  },
  clozeformula: {
    stimulus: "Solve: {{response}}",
    valid_response: ["x+1"],
    method: "equivLiteral",
  },
  choicematrix: {
    stimulus: "Select the correct answer for each row.",
    rows: ["Statement 1", "Statement 2"],
    columns: ["True", "False"],
    valid_response: [[0], [1]],
  },
  orderlist: {
    stimulus: "Arrange the items in the correct order.",
    list: ["First", "Second", "Third", "Fourth"],
    valid_response: [0, 1, 2, 3],
  },
  classification: {
    stimulus: "Sort the items into the correct categories.",
    categories: ["Category A", "Category B"],
    possible_responses: ["Item 1", "Item 2", "Item 3", "Item 4"],
    valid_response: [[0, 2], [1, 3]],
  },
  bowtie: {
    stimulus: "Review the scenario and complete the diagram.",
    column_titles: ["Actions to Take", "Condition Most Likely", "Parameters to Monitor"],
    possible_responses: [
      ["Action A", "Action B", "Action C", "Action D"],
      ["Condition X", "Condition Y", "Condition Z"],
      ["Parameter P", "Parameter Q", "Parameter R", "Parameter S"],
    ],
    valid_response: [
      ["Action A", "Action B"],
      ["Condition X"],
      ["Parameter P", "Parameter Q"],
    ],
  },
  tokenhighlight: {
    stimulus: "Highlight the verbs in the sentence.",
    passage: "The cat runs then jumps high.",
    valid_response: ["runs", "jumps"],
    distractors: ["cat", "high"],
  },
};

function withDefaults(type: string, attrs: any) {
  const defaults = DEFAULTS[type] || {};
  return { ...defaults, ...attrs };
}

// Translate a DSL question-level metadata list into a Learnosity question
// metadata object. Input is an array of tagged entries ({kind, value}) where
// kind is one of "acknowledgements" | "distractor_rationale".
// Returns undefined when there is nothing to attach, so no-metadata programs
// produce byte-identical output to pre-feature behavior.
export function translateQuestionMetadata(entries: any) {
  if (!Array.isArray(entries)) {
    return undefined;
  }
  const out: any = {};
  for (const entry of entries) {
    if (entry == null || typeof entry !== "object") continue;
    const { kind, value } = entry;
    if (value == null) continue;
    if (kind === "distractor_rationale") {
      out.distractor_rationale = Array.isArray(value)
        ? value.map((v, i) => `${i + 1}. ${v}`).join("\n")
        : value;
    } else if (kind === "acknowledgements") {
      out.acknowledgements = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function attachQuestionMetadata(question: any, metadata: any) {
  const translated = translateQuestionMetadata(metadata);
  if (translated !== undefined) {
    question.metadata = translated;
  }
  return question;
}

export function buildMcq(attrs: any) {
  const {
    stimulus,
    options,
    valid_response,
    multiple_responses,
    instant_feedback,
    shuffle_options,
    metadata,
    ...rest
  } = withDefaults("mcq", attrs);
  const question: any = {
    type: "mcq",
    stimulus,
    options: options.map((label: any, i: number) => ({ label, value: String(i) })),
    ...rest,
  };
  if (multiple_responses != null) {
    question.multiple_responses = multiple_responses;
  }
  if (shuffle_options != null) {
    question.shuffle_options = shuffle_options;
  }
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response.map(String),
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildShorttext(attrs: any) {
  const {
    stimulus,
    valid_response,
    max_length,
    case_sensitive,
    instant_feedback,
    placeholder,
    metadata,
    ...rest
  } = withDefaults("shorttext", attrs);
  const question: any = {
    type: "shorttext",
    stimulus,
    ...rest,
  };
  if (max_length != null) {
    question.max_length = max_length;
  }
  if (case_sensitive != null) {
    question.case_sensitive = case_sensitive;
  }
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (placeholder != null) {
    question.placeholder = placeholder;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildLongtext(attrs: any) {
  const {
    stimulus,
    max_length,
    placeholder,
    metadata,
    ...rest
  } = withDefaults("longtext", attrs);
  const question: any = {
    type: "longtextV2",
    stimulus,
    ...rest,
  };
  if (max_length != null) {
    question.max_length = max_length;
  }
  if (placeholder != null) {
    question.placeholder = placeholder;
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildPlaintext(attrs: any) {
  const {
    stimulus,
    max_length,
    placeholder,
    metadata,
    ...rest
  } = withDefaults("plaintext", attrs);
  const question: any = {
    type: "plaintext",
    stimulus,
    ...rest,
  };
  if (max_length != null) {
    question.max_length = max_length;
  }
  if (placeholder != null) {
    question.placeholder = placeholder;
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildClozetext(attrs: any) {
  const {
    stimulus,
    valid_response,
    case_sensitive,
    instant_feedback,
    metadata,
    ...rest
  } = withDefaults("clozetext", attrs);
  const question: any = {
    type: "clozetext",
    template: stimulus,
    ...rest,
  };
  if (case_sensitive != null) {
    question.case_sensitive = case_sensitive;
  }
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildClozeassociation(attrs: any) {
  const {
    stimulus,
    possible_responses,
    valid_response,
    instant_feedback,
    metadata,
    ...rest
  } = withDefaults("clozeassociation", attrs);
  const question: any = {
    type: "clozeassociation",
    template: stimulus,
    possible_responses,
    ...rest,
  };
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildClozedropdown(attrs: any) {
  const {
    stimulus,
    possible_responses,
    valid_response,
    instant_feedback,
    metadata,
    ...rest
  } = withDefaults("clozedropdown", attrs);
  const question: any = {
    type: "clozedropdown",
    template: stimulus,
    possible_responses,
    ...rest,
  };
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildClozeformula(attrs: any) {
  const {
    stimulus,
    valid_response,
    method,
    instant_feedback,
    metadata,
    ...rest
  } = withDefaults("clozeformula", attrs);
  const mathMethod = method || "equivLiteral";
  const question: any = {
    type: "clozeformulaV2",
    template: stimulus,
    is_math: true,
    ui_style: { type: "block-on-focus-keyboard" },
    response_containers: [],
    show_hints_button: true,
    ...rest,
  };
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    const values = Array.isArray(valid_response) ? valid_response : [valid_response];
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: values.map((v: any) => [{
          method: mathMethod,
          value: v,
          options: {
            ignoreOrder: false,
            setDecimalSeparator: ".",
            setThousandsSeparator: [],
            inverseResult: false,
          },
        }]),
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildChoicematrix(attrs: any) {
  const {
    stimulus,
    rows,
    columns,
    valid_response,
    instant_feedback,
    shuffle_options,
    metadata,
    ...rest
  } = withDefaults("choicematrix", attrs);
  const question: any = {
    type: "choicematrix",
    stimulus,
    options: columns,
    stems: rows,
    ...rest,
  };
  if (shuffle_options != null) {
    question.shuffle_options = shuffle_options;
  }
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildOrderlist(attrs: any) {
  const {
    stimulus,
    list,
    valid_response,
    instant_feedback,
    metadata,
    ...rest
  } = withDefaults("orderlist", attrs);
  const question: any = {
    type: "orderlist",
    stimulus,
    list,
    ...rest,
  };
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildClassification(attrs: any) {
  const {
    stimulus,
    categories,
    possible_responses,
    valid_response,
    instant_feedback,
    metadata,
    ...rest
  } = withDefaults("classification", attrs);
  const question: any = {
    type: "classification",
    stimulus,
    possible_responses,
    ui_style: {
      column_count: categories.length,
      column_titles: categories,
    },
    ...rest,
  };
  if (instant_feedback != null) {
    question.instant_feedback = instant_feedback;
  }
  if (valid_response != null) {
    question.validation = {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
  }
  return attachQuestionMetadata(question, metadata);
}

// The bow-tie (NGN/NCLEX) shape is fixed: 2 correct answers in the left area,
// 1 in the center, 2 in the right. These counts are baked into Learnosity's
// widget and enforced here so authors get clear errors instead of a silently
// misshapen question.
const BOWTIE_AREA_COUNTS = [2, 1, 2];

function ensureArrayOfLength(value: any, length: number, label: string) {
  if (!Array.isArray(value) || value.length !== length) {
    throw new Error(
      `bowtie: ${label} must be an array of ${length} entries (got ${Array.isArray(value) ? value.length : typeof value})`
    );
  }
}

export function buildBowtie(attrs: any) {
  const {
    stimulus,
    column_titles,
    possible_responses,
    valid_response,
    metadata,
    ...rest
  } = withDefaults("bowtie", attrs);

  ensureArrayOfLength(column_titles, 3, "column-titles");
  ensureArrayOfLength(possible_responses, 3, "possible-responses");
  ensureArrayOfLength(valid_response, 3, "valid-response");

  for (let i = 0; i < 3; i++) {
    const pool = possible_responses[i];
    if (!Array.isArray(pool) || pool.some((x: any) => typeof x !== "string")) {
      throw new Error(`bowtie: possible-responses[${i}] must be an array of strings`);
    }
    const picks = valid_response[i];
    if (!Array.isArray(picks) || picks.some((x: any) => typeof x !== "string")) {
      throw new Error(`bowtie: valid-response[${i}] must be an array of strings`);
    }
    if (picks.length !== BOWTIE_AREA_COUNTS[i]) {
      throw new Error(
        `bowtie: valid-response must have 2-1-2 correct answers (got ${valid_response.map((r: any) => r.length).join("-")})`
      );
    }
    if (pool.length < BOWTIE_AREA_COUNTS[i]) {
      throw new Error(
        `bowtie: possible-responses[${i}] needs at least ${BOWTIE_AREA_COUNTS[i]} options (got ${pool.length})`
      );
    }
    const seen = new Set();
    for (const pick of picks) {
      if (seen.has(pick)) {
        throw new Error(`bowtie: valid-response[${i}] has a duplicate entry "${pick}"`);
      }
      seen.add(pick);
      if (!pool.includes(pick)) {
        throw new Error(
          `bowtie: valid-response[${i}] entry "${pick}" is not in possible-responses[${i}]`
        );
      }
    }
  }

  // Global index = pool offset + index of the pick within its pool.
  const offsets = [0, possible_responses[0].length, possible_responses[0].length + possible_responses[1].length];
  const validValue = valid_response.map((picks: any, i: number) =>
    picks.map((pick: any) => offsets[i] + possible_responses[i].indexOf(pick))
  );

  const question: any = {
    type: "bowtie",
    stimulus,
    ui_style: {
      column_titles,
      show_drag_handle: false,
    },
    group_possible_responses: true,
    max_response_per_cell: 1,
    possible_response_groups: possible_responses.map((responses: any, i: number) => ({
      title: column_titles[i],
      responses,
    })),
    validation: {
      scoring_type: "exactMatch",
      valid_response: {
        score: 1,
        value: validValue,
      },
    },
    ...rest,
  };
  return attachQuestionMetadata(question, metadata);
}

export function buildCustom(attrs: any) {
  const { lang, data, ...rest } = attrs || {};
  if (typeof lang !== "string" || lang.length === 0) {
    throw new Error('custom requires lang to be a non-empty string (e.g. lang "0166").');
  }
  const base = `https://l${lang}.graffiticode.org`;
  const out: any = {
    type: "custom",
    custom_type: `custom_question_l${lang}`,
    js: {
      question: `${base}/question.js`,
      scorer: `${base}/scorer.js`,
    },
    css: `${base}/question.css`,
    ...rest,
  };
  if (data !== undefined) {
    out.data = data;
  }
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Token highlight (hot-text). Tokens are explicitly listed: `valid_response`
// holds the correct clickable tokens and `distractors` the clickable-but-wrong
// ones. Only listed tokens are clickable, so tokenization is always "custom":
// we wrap each whole-word occurrence of a listed token in
// <span class="lrn_token"> and reference the correct ones by their span index
// (document order). A token string that occurs more than once is wrapped — and,
// when correct, scored — at every occurrence.
function markTokens(passage: any, validResponse: any, distractors: any) {
  if (typeof passage !== "string" || passage.length === 0) {
    throw new Error("hot-text requires a non-empty passage string.");
  }
  const correct = Array.isArray(validResponse) ? validResponse : (validResponse == null ? [] : [validResponse]);
  const wrong = Array.isArray(distractors) ? distractors : (distractors == null ? [] : [distractors]);
  const clickable = [...correct, ...wrong];
  for (const t of clickable) {
    if (typeof t !== "string" || t.length === 0) {
      throw new Error("hot-text: valid-response and distractors must be non-empty strings.");
    }
  }
  if (correct.length === 0) {
    throw new Error("hot-text requires at least one correct token in valid-response.");
  }
  // Matching is case-insensitive so a sentence-initial capital still matches a
  // lowercase token (valid-response "run" matches "Run" starting a sentence).
  const correctSet = new Set(correct.map((s: any) => s.toLowerCase()));
  for (const d of wrong) {
    if (correctSet.has(d.toLowerCase())) {
      throw new Error(`hot-text: "${d}" is listed in both valid-response and distractors.`);
    }
  }
  // Match whole-word occurrences of any clickable token, longest first so a
  // longer token isn't pre-empted by a shorter overlapping one.
  const ordered = [...new Set(clickable)].sort((a: any, b: any) => b.length - a.length);
  const pattern = new RegExp(`(?<![\\w-])(${ordered.map(escapeRegExp).join("|")})(?![\\w-])`, "gi");
  const found = new Set();
  const value: number[] = [];
  let index = 0;
  const template = passage.replace(pattern, (match: string) => {
    found.add(match.toLowerCase());
    if (correctSet.has(match.toLowerCase())) {
      value.push(index);
    }
    index += 1;
    return `<span class="lrn_token">${match}</span>`;
  });
  for (const t of clickable) {
    if (!found.has(t.toLowerCase())) {
      throw new Error(`hot-text: token "${t}" was not found in the passage.`);
    }
  }
  return { template, value: value.sort((a, b) => a - b) };
}

export function buildHotText(attrs: any) {
  const {
    stimulus,
    passage,
    valid_response,
    distractors,
    max_selection,
    metadata,
    ...rest
  } = withDefaults("tokenhighlight", attrs);
  const { template, value } = markTokens(passage, valid_response, distractors);
  const question: any = {
    type: "tokenhighlight",
    stimulus,
    template,
    tokenization: "custom",
    ...rest,
  };
  if (max_selection != null) {
    question.max_selection = max_selection;
  }
  question.validation = {
    scoring_type: "exactMatch",
    valid_response: {
      score: 1,
      value,
    },
  };
  return attachQuestionMetadata(question, metadata);
}

// Registry mapping AST names to builders
export const questionTypeBuilders: Record<string, (attrs: any) => any> = {
  MCQ: buildMcq,
  SHORTTEXT: buildShorttext,
  LONGTEXT: buildLongtext,
  PLAINTEXT: buildPlaintext,
  CLOZETEXT: buildClozetext,
  CLOZEASSOCIATION: buildClozeassociation,
  CLOZEDROPDOWN: buildClozedropdown,
  CLOZEFORMULA: buildClozeformula,
  CHOICEMATRIX: buildChoicematrix,
  ORDERLIST: buildOrderlist,
  CLASSIFICATION: buildClassification,
  BOWTIE: buildBowtie,
  CUSTOM: buildCustom,
  // hot-text and token-highlight are synonyms: two AST names, one builder
  // (mirrors the MAX_LENGTH/MAX_WORD_COUNT field-alias precedent below).
  HOT_TEXT: buildHotText,
  TOKEN_HIGHLIGHT: buildHotText,
};

// Registry mapping AST names to attribute field names and expected types
// valueType: "string" | "number" | "boolean" | "array" | "any"
export const attributeFields: Record<string, any> = {
  STIMULUS: { field: "stimulus", valueType: "string" },
  OPTIONS: { field: "options", valueType: "array" },
  VALID_RESPONSE: { field: "valid_response", valueType: "any" },
  INSTANT_FEEDBACK: { field: "instant_feedback", valueType: "boolean" },
  IS_MATH: { field: "is_math", valueType: "boolean" },
  SHUFFLE_OPTIONS: { field: "shuffle_options", valueType: "boolean" },
  MULTIPLE_RESPONSES: { field: "multiple_responses", valueType: "boolean" },
  CASE_SENSITIVE: { field: "case_sensitive", valueType: "boolean" },
  MAX_LENGTH: { field: "max_length", valueType: "number" },
  MAX_WORD_COUNT: { field: "max_length", valueType: "number" },
  PLACEHOLDER: { field: "placeholder", valueType: "string" },
  POSSIBLE_RESPONSES: { field: "possible_responses", valueType: "array" },
  ROWS: { field: "rows", valueType: "array" },
  COLUMNS: { field: "columns", valueType: "array" },
  ORDER_LIST: { field: "list", valueType: "array" },
  CATEGORIES: { field: "categories", valueType: "array" },
  COLUMN_TITLES: { field: "column_titles", valueType: "array" },
  PASSAGE: { field: "passage", valueType: "string" },
  DISTRACTORS: { field: "distractors", valueType: "array" },
  MAX_SELECTION: { field: "max_selection", valueType: "number" },
  METHOD: { field: "method", valueType: "string", allowed: ["equivLiteral", "equivSymbolic", "equivValue", "isSimplified", "isFactorised", "isExpanded", "stringMatch", "isUnit"] },
  ID: { field: "id", valueType: "string" },
  LANG: { field: "lang", valueType: "string" },
  MODEL: { field: "data", valueType: "any" },
  METADATA: { field: "metadata", valueType: "array" },
  PARAMS: { field: "params", valueType: "array" },
};

// Metadata member constructors (arity 1). Each maps a DSL keyword to the
// `kind` string attached to its tagged-entry output, so the translators in
// items.ts and question-types.ts can dispatch on kind.
export const metadataMembers: Record<string, { kind: string }> = {
  TAGS: { kind: "tags" },
  NOTES: { kind: "notes" },
  DISTRACTOR_RATIONALE: { kind: "distractor_rationale" },
  ACKNOWLEDGEMENTS: { kind: "acknowledgements" },
  DESCRIPTION: { kind: "description" },
  SOURCE: { kind: "source" },
  DIFFICULTY_LEVEL: { kind: "difficulty_level" },
};

// Which attributes are valid for each question type
export const validAttributes: Record<string, string[]> = {
  MCQ: ["stimulus", "options", "valid_response", "instant_feedback", "is_math", "shuffle_options", "multiple_responses", "metadata"],
  SHORTTEXT: ["stimulus", "valid_response", "instant_feedback", "is_math", "case_sensitive", "max_length", "placeholder", "metadata"],
  LONGTEXT: ["stimulus", "is_math", "max_length", "placeholder", "metadata"],
  PLAINTEXT: ["stimulus", "is_math", "max_length", "placeholder", "metadata"],
  CLOZETEXT: ["stimulus", "valid_response", "instant_feedback", "is_math", "case_sensitive", "metadata"],
  CLOZEASSOCIATION: ["stimulus", "possible_responses", "valid_response", "instant_feedback", "is_math", "metadata"],
  CLOZEDROPDOWN: ["stimulus", "possible_responses", "valid_response", "instant_feedback", "is_math", "metadata"],
  CLOZEFORMULA: ["stimulus", "valid_response", "instant_feedback", "is_math", "method", "metadata"],
  CHOICEMATRIX: ["stimulus", "rows", "columns", "valid_response", "instant_feedback", "is_math", "shuffle_options", "metadata"],
  ORDERLIST: ["stimulus", "list", "valid_response", "instant_feedback", "is_math", "metadata"],
  CLASSIFICATION: ["stimulus", "categories", "possible_responses", "valid_response", "instant_feedback", "is_math", "metadata"],
  BOWTIE: ["stimulus", "column_titles", "possible_responses", "valid_response", "is_math", "metadata"],
  HOT_TEXT: ["stimulus", "passage", "valid_response", "distractors", "max_selection", "metadata"],
  TOKEN_HIGHLIGHT: ["stimulus", "passage", "valid_response", "distractors", "max_selection", "metadata"],
};
