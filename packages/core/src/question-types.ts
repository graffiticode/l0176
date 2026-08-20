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
    validation: {
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: "answer" },
    },
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
    template: "The {{response}} is the answer.",
    validation: {
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: ["answer"] },
    },
  },
  clozeassociation: {
    template: "Drag the correct {{response}} here.",
    possible_responses: ["correct", "incorrect", "maybe"],
    validation: {
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: ["correct"] },
    },
  },
  clozedropdown: {
    template: "Select the correct {{response}}.",
    possible_responses: [["correct", "incorrect", "maybe"]],
    validation: {
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: ["correct"] },
    },
  },
  clozeformula: {
    stimulus: "Solve: {{response}}",
    valid_response: ["x+1"],
    method: "equivLiteral",
  },
  choicematrix: {
    stimulus: "Select the correct answer for each row.",
    stems: ["Statement 1", "Statement 2"],
    options: ["True", "False"],
    validation: {
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: [[0], [1]] },
    },
  },
  orderlist: {
    stimulus: "Arrange the items in the correct order.",
    list: ["First", "Second", "Third", "Fourth"],
    validation: {
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: [0, 1, 2, 3] },
    },
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

// Learnosity scores a question either all-or-nothing (`exactMatch`) or awards a
// fraction of the score per correct response (`partialMatch`). `partial-credit`
// picks between them. The score stays 1 either way, so a partial-credit question
// awards a fraction of that single point per correct response rather than
// changing the question's total worth.
//
// Only types with more than one scorable response accept it — the rest are
// all-or-nothing by construction, and silently ignoring the attribute there
// would emit a question that scores differently than the author asked for.
// Only the types still on the older spelling. A converted type writes
// `scoring-type` directly inside `validation`, so it has no synthetic boolean to
// gate — and reaches modes the boolean cannot express, such as orderlist's
// partialMatchPairwise. This set empties as the remaining types are converted,
// at which point `partial-credit` and `scoringType()` go with it.
const PARTIAL_CREDIT_TYPES = new Set([
  "mcq",
  "classification",
  "tokenhighlight",
]);

function scoringType(type: string, partialCredit: any) {
  if (!partialCredit) {
    return "exactMatch";
  }
  if (!PARTIAL_CREDIT_TYPES.has(type)) {
    throw new Error(
      `${type}: partial-credit is not supported — Learnosity scores this type all-or-nothing.`
    );
  }
  return "partialMatch";
}

// Reject attributes the question type does not take. Learnosity ignores unknown
// fields silently, so without this an attribute belonging to another type — or a
// typo — reaches the item bank and the question simply behaves unexpectedly.
// Only types listed in `validAttributes` are enforced; the rest are unconverted.
function assertKnownAttributes(type: string, key: string, attrs: any) {
  const allowed = validAttributes[key];
  if (!allowed) {
    return;
  }
  const unknown = Object.keys(attrs).filter((k) => !allowed.includes(k));
  if (unknown.length > 0) {
    throw new Error(
      `${type}: ${unknown.map((u) => `\`${u}\``).join(", ")} ` +
        `${unknown.length === 1 ? "is not an attribute" : "are not attributes"} of ${type}. ` +
        `It takes: ${allowed.join(", ")}.`,
    );
  }
}

// The scoring types a widget accepts, from its Learnosity article. Learnosity
// falls back to exactMatch on an unrecognized value rather than erroring, which
// turns a typo into a silently mis-scored question.
const SCORING_TYPES: Record<string, string[]> = {
  clozetext: ["exactMatch", "partialMatchV2", "partialMatch"],
  clozeassociation: ["exactMatch", "partialMatchV2", "partialMatch"],
  clozedropdown: ["exactMatch", "partialMatchV2", "partialMatch"],
  choicematrix: ["exactMatch", "partialMatchV2", "partialMatch"],
  // The only mode this widget documents.
  shorttext: ["exactMatch"],
  // Alone in offering pairwise comparison of adjacent entries.
  orderlist: ["exactMatch", "partialMatchV2", "partialMatch", "partialMatchPairwise"],
  // longtext and plaintext are absent: neither documents scoring_type at all —
  // they are manually scored, and their validation carries max_score instead.
};

function assertScoringType(type: string, validation: any) {
  const allowed = SCORING_TYPES[type];
  if (!allowed || validation == null || typeof validation !== "object") {
    return;
  }
  const given = validation.scoring_type;
  if (given !== undefined && !allowed.includes(given)) {
    throw new Error(
      `${type}: scoring-type "${given}" is not supported — use one of ${allowed.join(", ")}.`,
    );
  }
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
    alternative_response,
    multiple_responses,
    instant_feedback,
    shuffle_options,
    partial_credit,
    metadata,
    ...rest
  } = withDefaults("mcq", attrs);
  if (partial_credit && !multiple_responses) {
    throw new Error(
      "mcq: partial-credit requires multiple-responses true — a single-response mcq is all-or-nothing."
    );
  }
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
      scoring_type: scoringType("mcq", partial_credit),
      valid_response: {
        score: 1,
        value: valid_response.map(String),
      },
    };
    if (alternative_response != null) {
      question.validation.alt_responses = alternative_response.map((v: any) => ({
        score: 1,
        value: Array.isArray(v) ? v.map(String) : [String(v)],
      }));
    }
  }
  return attachQuestionMetadata(question, metadata);
}

export function buildShorttext(attrs: any) {
  const merged = withDefaults("shorttext", attrs);
  assertKnownAttributes("shorttext", "SHORTTEXT", merged);
  assertScoringType("shorttext", merged.validation);
  return {
    ...merged,
    type: "shorttext",
  };
}

// The bare `longtext` slug is Learnosity's deprecated type; the current one is
// longtextV2, which is what the keyword emits.
export function buildLongtext(attrs: any) {
  const merged = withDefaults("longtext", attrs);
  assertKnownAttributes("longtext", "LONGTEXT", merged);
  assertScoringType("longtext", merged.validation);
  return {
    ...merged,
    type: "longtextV2",
  };
}

export function buildPlaintext(attrs: any) {
  const merged = withDefaults("plaintext", attrs);
  assertKnownAttributes("plaintext", "PLAINTEXT", merged);
  assertScoringType("plaintext", merged.validation);
  return {
    ...merged,
    type: "plaintext",
  };
}

export function buildClozetext(attrs: any) {
  const merged = withDefaults("clozetext", attrs);
  assertKnownAttributes("clozetext", "CLOZETEXT", merged);
  assertScoringType("clozetext", merged.validation);
  return {
    type: "clozetext",
    ...merged,
  };
}

// `stimulus` is the prompt and `template` the passage carrying the blanks —
// two fields, as Learnosity documents them.
export function buildClozeassociation(attrs: any) {
  const merged = withDefaults("clozeassociation", attrs);
  assertKnownAttributes("clozeassociation", "CLOZEASSOCIATION", merged);
  assertScoringType("clozeassociation", merged.validation);
  return {
    ...merged,
    type: "clozeassociation",
  };
}

// possible_responses is an array per drop-down, in order of appearance.
export function buildClozedropdown(attrs: any) {
  const merged = withDefaults("clozedropdown", attrs);
  assertKnownAttributes("clozedropdown", "CLOZEDROPDOWN", merged);
  assertScoringType("clozedropdown", merged.validation);
  return {
    ...merged,
    type: "clozedropdown",
  };
}

// Learnosity scores a clozeformula against one answer *set* — `valid_response.value`
// is indexed by blank, so N entries mean N blanks, not N accepted answers for one
// blank. Accepting several answers for the same blank is what `alt_responses` is
// for: each entry is a complete alternative set covering every blank. Hence the
// two shapes of a `valid-response` entry: a bare string is that blank's only answer
// (unchanged), and a nested list is the answers that blank accepts. Note the
// equivalence method already absorbs notational variation — under equivLiteral
// "1/2", "1 / 2" and "\frac{1}{2}" are one expression — so a list is only needed
// for genuinely different expressions (1/2 vs 0.5 vs 2/4).
const ALT_RESPONSE_LIMIT = 25;

// Every combination of one accepted answer per blank, primary combination first
// (that one becomes valid_response; the rest become alt_responses).
function answerCombinations(blanks: string[][]) {
  return blanks.reduce(
    (acc: any[][], answers: string[]) => acc.flatMap((combo) => answers.map((a) => [...combo, a])),
    [[]],
  );
}

export function buildClozeformula(attrs: any) {
  const {
    stimulus,
    valid_response,
    alternative_response,
    method,
    instant_feedback,
    partial_credit,
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
    const rule = (v: any) => [{
      method: mathMethod,
      value: v,
      options: {
        ignoreOrder: false,
        setDecimalSeparator: ".",
        setThousandsSeparator: [],
        inverseResult: false,
      },
    }];
    const entries = Array.isArray(valid_response) ? valid_response : [valid_response];
    const blanks: string[][] = entries.map((e: any) => (Array.isArray(e) ? e : [e]));
    for (const answers of blanks) {
      if (answers.length === 0) {
        throw new Error("clozeformula: a valid-response entry is an empty list — give the blank at least one accepted answer.");
      }
    }
    const combinations = answerCombinations(blanks);
    if (combinations.length > ALT_RESPONSE_LIMIT) {
      throw new Error(
        `clozeformula: ${combinations.length} accepted answer combinations exceeds the limit of ${ALT_RESPONSE_LIMIT} — list fewer alternatives per blank, or use equivSymbolic/equivValue to accept the whole equivalence class instead of enumerating it.`
      );
    }
    const [primary, ...alternatives] = combinations;
    question.validation = {
      scoring_type: scoringType("clozeformula", partial_credit),
      valid_response: {
        score: 1,
        value: primary.map(rule),
      },
    };
    const allAlternatives: any[] = [...alternatives];
    if (alternative_response != null) {
      const altEntries = Array.isArray(alternative_response) ? alternative_response : [alternative_response];
      for (const altEntry of altEntries) {
        const altBlanks: string[][] = Array.isArray(altEntry) ? altEntry.map((e: any) => (Array.isArray(e) ? e : [e])) : [Array.isArray(altEntry) ? altEntry : [altEntry]];
        if (altBlanks.length !== blanks.length) {
          throw new Error(`clozeformula: alternative-response entry has ${altBlanks.length} blanks but valid-response has ${blanks.length}`);
        }
        for (const answers of altBlanks) {
          if (answers.length === 0) {
            throw new Error("clozeformula: an alternative-response entry is an empty list — give each blank at least one accepted answer.");
          }
        }
        allAlternatives.push(altBlanks.flat());
      }
    }
    if (allAlternatives.length > ALT_RESPONSE_LIMIT) {
      throw new Error(
        `clozeformula: ${allAlternatives.length} total alt_responses exceeds the limit of ${ALT_RESPONSE_LIMIT} — reduce the number of alternatives or use equivSymbolic/equivValue.`
      );
    }
    if (allAlternatives.length > 0) {
      question.validation.alt_responses = allAlternatives.map((combo: any[]) => ({
        score: 1,
        value: combo.map(rule),
      }));
    }
  }
  return attachQuestionMetadata(question, metadata);
}

// Learnosity's names: `stems` are the row prompts, `options` the column choices.
export function buildChoicematrix(attrs: any) {
  const merged = withDefaults("choicematrix", attrs);
  assertKnownAttributes("choicematrix", "CHOICEMATRIX", merged);
  assertScoringType("choicematrix", merged.validation);
  return {
    ...merged,
    type: "choicematrix",
  };
}

export function buildOrderlist(attrs: any) {
  const merged = withDefaults("orderlist", attrs);
  assertKnownAttributes("orderlist", "ORDERLIST", merged);
  assertScoringType("orderlist", merged.validation);
  return {
    ...merged,
    type: "orderlist",
  };
}

export function buildClassification(attrs: any) {
  const {
    stimulus,
    categories,
    possible_responses,
    valid_response,
    alternative_response,
    instant_feedback,
    partial_credit,
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
      scoring_type: scoringType("classification", partial_credit),
      valid_response: {
        score: 1,
        value: valid_response,
      },
    };
    if (alternative_response != null) {
      question.validation.alt_responses = alternative_response.map((v: any) => ({ score: 1, value: v }));
    }
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

function resolveBowtieResponse(picks3: any[], possible_responses: any[], _column_titles: any[]) {
  const offsets = [0, possible_responses[0].length, possible_responses[0].length + possible_responses[1].length];
  ensureArrayOfLength(picks3, 3, "response picks");
  for (let i = 0; i < 3; i++) {
    const pool = possible_responses[i];
    const picks = picks3[i];
    if (!Array.isArray(picks) || picks.some((x: any) => typeof x !== "string")) {
      throw new Error(`bowtie: response[${i}] must be an array of strings`);
    }
    if (picks.length !== BOWTIE_AREA_COUNTS[i]) {
      throw new Error(
        `bowtie: response must have 2-1-2 correct answers (got ${picks3.map((r: any) => r.length).join("-")})`
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
        throw new Error(`bowtie: response[${i}] has a duplicate entry "${pick}"`);
      }
      seen.add(pick);
      if (!pool.includes(pick)) {
        throw new Error(
          `bowtie: response[${i}] entry "${pick}" is not in possible-responses[${i}]`
        );
      }
    }
  }
  return picks3.map((picks: any, i: number) =>
    picks.map((pick: any) => offsets[i] + possible_responses[i].indexOf(pick))
  );
}

export function buildBowtie(attrs: any) {
  const {
    stimulus,
    column_titles,
    possible_responses,
    valid_response,
    alternative_response,
    partial_credit,
    metadata,
    ...rest
  } = withDefaults("bowtie", attrs);

  scoringType("bowtie", partial_credit);

  ensureArrayOfLength(column_titles, 3, "column-titles");
  ensureArrayOfLength(possible_responses, 3, "possible-responses");
  ensureArrayOfLength(valid_response, 3, "valid-response");

  const validValue = resolveBowtieResponse(valid_response, possible_responses, column_titles);

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

  if (alternative_response != null) {
    question.validation.alt_responses = alternative_response.map((altPicks3: any) =>
      ({
        score: 1,
        value: resolveBowtieResponse(altPicks3, possible_responses, column_titles),
      })
    );
  }

  return attachQuestionMetadata(question, metadata);
}

export function buildCustom(attrs: any) {
  const { lang, data, partial_credit, ...rest } = attrs || {};
  // The embedded language owns its own scoring — reject partial-credit here
  // rather than pass it through into the custom question's JSON.
  scoringType("custom", partial_credit);
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

// Token highlight. Tokens are explicitly listed: `valid_response`
// holds the correct clickable tokens and `distractors` the clickable-but-wrong
// ones. Only listed tokens are clickable, so tokenization is always "custom":
// we wrap each whole-word occurrence of a listed token in
// <span class="lrn_token"> and reference the correct ones by their span index
// (document order). A token string that occurs more than once is wrapped — and,
// when correct, scored — at every occurrence.
function markTokens(passage: any, validResponse: any, distractors: any) {
  if (typeof passage !== "string" || passage.length === 0) {
    throw new Error("token-highlight requires a non-empty passage string.");
  }
  const correct = Array.isArray(validResponse) ? validResponse : (validResponse == null ? [] : [validResponse]);
  const wrong = Array.isArray(distractors) ? distractors : (distractors == null ? [] : [distractors]);
  const clickable = [...correct, ...wrong];
  for (const t of clickable) {
    if (typeof t !== "string" || t.length === 0) {
      throw new Error("token-highlight: valid-response and distractors must be non-empty strings.");
    }
  }
  if (correct.length === 0) {
    throw new Error("token-highlight requires at least one correct token in valid-response.");
  }
  // Matching is case-insensitive so a sentence-initial capital still matches a
  // lowercase token (valid-response "run" matches "Run" starting a sentence).
  const correctSet = new Set(correct.map((s: any) => s.toLowerCase()));
  for (const d of wrong) {
    if (correctSet.has(d.toLowerCase())) {
      throw new Error(`token-highlight: "${d}" is listed in both valid-response and distractors.`);
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
      throw new Error(`token-highlight: token "${t}" was not found in the passage.`);
    }
  }
  return { template, value: value.sort((a, b) => a - b) };
}

export function buildTokenHighlight(attrs: any) {
  const {
    stimulus,
    passage,
    valid_response,
    alternative_response,
    distractors,
    max_selection,
    partial_credit,
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
    scoring_type: scoringType("tokenhighlight", partial_credit),
    valid_response: {
      score: 1,
      value,
    },
  };
  if (alternative_response != null) {
    question.validation.alt_responses = alternative_response.map((v: any) => {
      const { value: altValue } = markTokens(passage, v, distractors);
      return { score: 1, value: altValue };
    });
  }
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
  TOKEN_HIGHLIGHT: buildTokenHighlight,
};

// Registry mapping AST names to attribute field names and expected types
// valueType: "string" | "number" | "boolean" | "array" | "any"
// Every attribute is an arity-1 member returning a single-key record, so a
// question, and every object inside it, is written as a member list. `shape`
// says how to read the member's argument:
//
//   (none)        the value as written — a scalar, or a list of scalars
//   "object"      a member list, merged into one object
//   "objectArray" a list of member lists, each merged
//
// A member needs no builder involvement: the question-type transformer merges
// the list and the field lands by name.
export type MemberShape = "object" | "objectArray";
export const memberFields: Record<string, { field: string; shape?: MemberShape }> = {
  // Question-level content
  STIMULUS: { field: "stimulus" },
  STIMULUS_REVIEW: { field: "stimulus_review" },
  INSTRUCTOR_STIMULUS: { field: "instructor_stimulus" },
  TEMPLATE: { field: "template" },
  IS_MATH: { field: "is_math" },
  OPTIONS: { field: "options" },
  POSSIBLE_RESPONSES: { field: "possible_responses" },
  ORDER_LIST: { field: "list" },
  PASSAGE: { field: "passage" },
  DISTRACTORS: { field: "distractors" },
  ROWS: { field: "rows" },
  COLUMNS: { field: "columns" },
  CATEGORIES: { field: "categories" },
  COLUMN_TITLES: { field: "column_titles" },

  // Behaviour
  INSTANT_FEEDBACK: { field: "instant_feedback" },
  FEEDBACK_ATTEMPTS: { field: "feedback_attempts" },
  SHUFFLE_OPTIONS: { field: "shuffle_options" },
  MULTIPLE_RESPONSES: { field: "multiple_responses" },
  MAX_SELECTION: { field: "max_selection" },
  CASE_SENSITIVE: { field: "case_sensitive" },
  MAX_LENGTH: { field: "max_length" },
  MAX_WORD_COUNT: { field: "max_length" },
  PLACEHOLDER: { field: "placeholder" },
  MULTIPLE_LINE: { field: "multiple_line" },
  CHARACTER_MAP: { field: "character_map" },
  SPELLCHECK: { field: "spellcheck" },
  IGNORE_LEADING_AND_TRAILING_SPACES: { field: "ignore_leading_and_trailing_spaces" },
  MATCH_ALL_POSSIBLE_RESPONSES: { field: "match_all_possible_responses" },
  METHOD: { field: "method" },
  PARTIAL_CREDIT: { field: "partial_credit" },
  ALTERNATIVE_RESPONSE: { field: "alternative_response" },

  // Nested objects
  VALIDATION: { field: "validation", shape: "object" },
  SCORING_TYPE: { field: "scoring_type" },
  VALID_RESPONSE: { field: "valid_response", shape: "object" },
  ALT_RESPONSES: { field: "alt_responses", shape: "objectArray" },
  ALLOW_NEGATIVE_SCORES: { field: "allow_negative_scores" },
  PENALTY: { field: "penalty" },
  MIN_SCORE_IF_ATTEMPTED: { field: "min_score_if_attempted" },
  UNSCORED: { field: "unscored" },
  AUTOMARKABLE: { field: "automarkable" },
  ENABLE_FULLWIDTH_SCORING: { field: "enable_fullwidth_scoring" },
  ACCENT_SENSITIVITY: { field: "accent_sensitivity", shape: "object" },
  ENABLED: { field: "enabled" },
  ACCENT_PENALTY_POINTS: { field: "accent_penalty_points" },
  SCORE: { field: "score" },
  VALUE: { field: "value" },

  UI_STYLE: { field: "ui_style", shape: "object" },
  FONTSIZE: { field: "fontsize" },
  VALIDATION_STEM_NUMERATION: { field: "validation_stem_numeration" },
  RESPONSE_CONTAINER: { field: "response_container", shape: "object" },
  RESPONSE_CONTAINERS: { field: "response_containers", shape: "objectArray" },
  HEIGHT: { field: "height" },
  WIDTH: { field: "width" },
  INPUT_TYPE: { field: "input_type" },
  ARIA_LABEL: { field: "aria_label" },

  // Seven mechanical types
  DISABLE_AUTO_LINK: { field: "disable_auto_link" },
  FORMATTING_OPTIONS: { field: "formatting_options" },
  HORIZONTAL_LAYOUT: { field: "horizontal_layout" },
  SHOW_WORD_COUNT: { field: "show_word_count" },
  SHOW_WORD_LIMIT: { field: "show_word_limit" },
  SUBMIT_OVER_LIMIT: { field: "submit_over_limit" },
  TEXT_BLOCKS: { field: "text_blocks" },
  SHOW_COPY: { field: "show_copy" },
  SHOW_CUT: { field: "show_cut" },
  SHOW_PASTE: { field: "show_paste" },
  DUPLICATE_RESPONSES: { field: "duplicate_responses" },
  GROUP_POSSIBLE_RESPONSES: { field: "group_possible_responses" },
  STEMS: { field: "stems" },
  HORIZONTAL_LINES: { field: "horizontal_lines" },
  MAX_HEIGHT: { field: "max_height" },
  MIN_HEIGHT: { field: "min_height" },
  OPTION_ROW_TITLE: { field: "option_row_title" },
  OPTION_WIDTH: { field: "option_width" },
  POSSIBILITY_LIST_POSITION: { field: "possibility_list_position" },
  SHOW_DRAG_HANDLE: { field: "show_drag_handle" },
  STEM_TITLE: { field: "stem_title" },
  STEM_WIDTH: { field: "stem_width" },
  TYPE: { field: "type" },
  WORDWRAP: { field: "wordwrap" },
  MATCHING_RULE: { field: "matching_rule" },
  MAX_SCORE: { field: "max_score" },
  SCORE_WITH_FEEDBACKAIDE: { field: "score_with_feedbackaide" },
  FEEDBACKAIDE_PASSAGES: { field: "feedbackaide_passages" },

  // Item level. `metadata` is a member at both question and item level, which is
  // why `item` takes a member list too — a word has one arity.
  METADATA: { field: "metadata" },
  PARAMS: { field: "params" },

  // custom
  LANG: { field: "lang" },
  MODEL: { field: "data" },
};

// True when every element is a single-key record — i.e. the list was written as
// members (`[score 1 value "x"]`) rather than as a bare list of values.
//
// TRANSITIONAL. `valid-response` means a member list on a converted type and a
// bare array on one that is not yet converted, and it is one word either way.
// When the last type is converted this test goes and `object`-shaped members
// become unconditional, which restores the sharper error message.
export function isMemberList(v: any) {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(
      (e: any) =>
        e != null && typeof e === "object" && !Array.isArray(e) && Object.keys(e).length === 1,
    )
  );
}

// Merge a list of single-key member records into one object, per L0169's ASSESS.
// Throws rather than silently dropping, so a malformed list is a compile error.
export function mergeMembers(members: any, where: string) {
  if (!Array.isArray(members)) {
    throw new Error(`${where}: expected a member list in [brackets], e.g. [score 1 value "x"].`);
  }
  const out: any = {};
  for (const m of members) {
    if (m == null || typeof m !== "object" || Array.isArray(m)) {
      throw new Error(
        `${where}: every entry must be an attribute applied to a value, e.g. [score 1 value "x"].`,
      );
    }
    Object.assign(out, m);
  }
  return out;
}

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
  MCQ: ["stimulus", "options", "valid_response", "alternative_response", "instant_feedback", "is_math", "shuffle_options", "multiple_responses", "partial_credit", "metadata"],
  SHORTTEXT: [
    "case_sensitive", "character_map", "feedback_attempts",
    "ignore_leading_and_trailing_spaces", "instant_feedback",
    "instructor_stimulus", "is_math", "max_length", "metadata",
    "placeholder", "response_container", "spellcheck", "stimulus",
    "stimulus_review", "ui_style", "validation",
  ],
  LONGTEXT: [
    "character_map", "disable_auto_link", "formatting_options",
    "horizontal_layout", "instructor_stimulus", "is_math", "max_length",
    "metadata", "placeholder", "show_word_count", "show_word_limit",
    "spellcheck", "stimulus", "stimulus_review", "submit_over_limit",
    "text_blocks", "ui_style", "validation",
  ],
  PLAINTEXT: [
    "character_map", "instructor_stimulus", "is_math", "max_length",
    "metadata", "placeholder", "show_copy", "show_cut", "show_paste",
    "spellcheck", "stimulus", "stimulus_review", "submit_over_limit",
    "ui_style", "validation",
  ],
  // From Cloze-text-clozetext.md's attribute table. `description` is omitted
  // (deprecated in favour of stimulus_review) and `type` is emitted, not authored.
  CLOZETEXT: [
    "stimulus", "stimulus_review", "instructor_stimulus", "template",
    "is_math", "metadata", "ui_style", "validation",
    "instant_feedback", "feedback_attempts",
    "response_container", "response_containers",
    "character_map", "max_length", "multiple_line", "spellcheck",
    "case_sensitive", "ignore_leading_and_trailing_spaces",
    "match_all_possible_responses",
  ],
  CLOZEASSOCIATION: [
    "duplicate_responses", "feedback_attempts", "group_possible_responses",
    "instant_feedback", "instructor_stimulus", "is_math",
    "match_all_possible_responses", "metadata", "possible_responses",
    "response_container", "response_containers", "shuffle_options",
    "stimulus", "stimulus_review", "template", "ui_style", "validation",
  ],
  CLOZEDROPDOWN: [
    "case_sensitive", "feedback_attempts", "instant_feedback",
    "instructor_stimulus", "is_math", "match_all_possible_responses",
    "metadata", "possible_responses", "response_container",
    "response_containers", "shuffle_options", "stimulus", "stimulus_review",
    "template", "ui_style", "validation",
  ],
  CLOZEFORMULA: ["stimulus", "valid_response", "alternative_response", "instant_feedback", "is_math", "method", "metadata"],
  CHOICEMATRIX: [
    "feedback_attempts", "instant_feedback", "instructor_stimulus",
    "is_math", "metadata", "multiple_responses", "options",
    "shuffle_options", "stems", "stimulus", "stimulus_review", "ui_style",
    "validation",
  ],
  ORDERLIST: [
    "feedback_attempts", "instant_feedback", "instructor_stimulus",
    "is_math", "list", "metadata", "shuffle_options", "stimulus",
    "stimulus_review", "ui_style", "validation",
  ],
  CLASSIFICATION: ["stimulus", "categories", "possible_responses", "valid_response", "alternative_response", "instant_feedback", "is_math", "partial_credit", "metadata"],
  BOWTIE: ["stimulus", "column_titles", "possible_responses", "valid_response", "alternative_response", "is_math", "metadata"],
  TOKEN_HIGHLIGHT: ["stimulus", "passage", "valid_response", "alternative_response", "distractors", "max_selection", "partial_credit", "metadata"],
};
