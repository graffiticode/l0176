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
    template: "The {{response}} is the answer.",
    validation: {
      scoring_type: "exactMatch",
      valid_response: { score: 1, value: ["answer"] },
    },
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

// Learnosity scores a question either all-or-nothing (`exactMatch`) or awards a
// fraction of the score per correct response (`partialMatch`). `partial-credit`
// picks between them. The score stays 1 either way, so a partial-credit question
// awards a fraction of that single point per correct response rather than
// changing the question's total worth.
//
// Only types with more than one scorable response accept it — the rest are
// all-or-nothing by construction, and silently ignoring the attribute there
// would emit a question that scores differently than the author asked for.
// `clozetext` is absent: it takes `scoring-type` directly, so there is no
// synthetic boolean to gate. The remaining types keep the older spelling until
// each is converted.
const PARTIAL_CREDIT_TYPES = new Set([
  "mcq",
  "choicematrix",
  "clozeassociation",
  "clozedropdown",
  "orderlist",
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
  const {
    stimulus,
    valid_response,
    alternative_response,
    max_length,
    case_sensitive,
    instant_feedback,
    placeholder,
    partial_credit,
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
      scoring_type: scoringType("shorttext", partial_credit),
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

export function buildLongtext(attrs: any) {
  const {
    stimulus,
    max_length,
    placeholder,
    partial_credit,
    metadata,
    ...rest
  } = withDefaults("longtext", attrs);
  // Unscored type — reject partial-credit rather than let it reach the output.
  scoringType("longtext", partial_credit);
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
    partial_credit,
    metadata,
    ...rest
  } = withDefaults("plaintext", attrs);
  // Unscored type — reject partial-credit rather than let it reach the output.
  scoringType("plaintext", partial_credit);
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

// clozetext is the first type converted to the aligned vocabulary: every
// attribute is named for the Learnosity field it emits and nests the way the
// field nests, so there is nothing left to rename or lift. The builder stamps
// the type, applies defaults, and checks what the docs say is checkable.
export function buildClozetext(attrs: any) {
  const merged = withDefaults("clozetext", attrs);
  assertKnownAttributes("clozetext", "CLOZETEXT", merged);
  assertScoringType("clozetext", merged.validation);
  return {
    type: "clozetext",
    ...merged,
  };
}

export function buildClozeassociation(attrs: any) {
  const {
    stimulus,
    possible_responses,
    valid_response,
    alternative_response,
    instant_feedback,
    partial_credit,
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
      scoring_type: scoringType("clozeassociation", partial_credit),
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

export function buildClozedropdown(attrs: any) {
  const {
    stimulus,
    possible_responses,
    valid_response,
    alternative_response,
    instant_feedback,
    partial_credit,
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
      scoring_type: scoringType("clozedropdown", partial_credit),
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

export function buildChoicematrix(attrs: any) {
  const {
    stimulus,
    rows,
    columns,
    valid_response,
    alternative_response,
    instant_feedback,
    shuffle_options,
    partial_credit,
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
      scoring_type: scoringType("choicematrix", partial_credit),
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

export function buildOrderlist(attrs: any) {
  const {
    stimulus,
    list,
    valid_response,
    alternative_response,
    instant_feedback,
    partial_credit,
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
      scoring_type: scoringType("orderlist", partial_credit),
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
export const attributeFields: Record<string, any> = {
  STIMULUS: { field: "stimulus", valueType: "string" },
  OPTIONS: { field: "options", valueType: "array" },
  // VALID_RESPONSE is hand-written in compiler.ts: it accepts either a bare
  // value (the older flat spelling) or a member list to merge.
  ALTERNATIVE_RESPONSE: { field: "alternative_response", valueType: "array" },
  INSTANT_FEEDBACK: { field: "instant_feedback", valueType: "boolean" },
  IS_MATH: { field: "is_math", valueType: "boolean" },
  SHUFFLE_OPTIONS: { field: "shuffle_options", valueType: "boolean" },
  MULTIPLE_RESPONSES: { field: "multiple_responses", valueType: "boolean" },
  PARTIAL_CREDIT: { field: "partial_credit", valueType: "boolean" },
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

  // --- Aligned Learnosity fields ------------------------------------------
  // Named for the field they emit, so the generated transformer places them
  // with no builder involvement. Values that are records (validation,
  // ui_style, response_container) need nothing special: the generic
  // transformer already accepts a record built by a nested attribute chain.
  TEMPLATE: { field: "template", valueType: "string" },
  STIMULUS_REVIEW: { field: "stimulus_review", valueType: "string" },
  INSTRUCTOR_STIMULUS: { field: "instructor_stimulus", valueType: "string" },
  CHARACTER_MAP: { field: "character_map", valueType: "any" },
  MULTIPLE_LINE: { field: "multiple_line", valueType: "boolean" },
  SPELLCHECK: { field: "spellcheck", valueType: "boolean" },
  IGNORE_LEADING_AND_TRAILING_SPACES: { field: "ignore_leading_and_trailing_spaces", valueType: "boolean" },
  MATCH_ALL_POSSIBLE_RESPONSES: { field: "match_all_possible_responses", valueType: "boolean" },
  FEEDBACK_ATTEMPTS: { field: "feedback_attempts", valueType: "number" },

  VALIDATION: { field: "validation", valueType: "any" },
  SCORING_TYPE: { field: "scoring_type", valueType: "string" },
  ALLOW_NEGATIVE_SCORES: { field: "allow_negative_scores", valueType: "boolean" },
  PENALTY: { field: "penalty", valueType: "number" },
  MIN_SCORE_IF_ATTEMPTED: { field: "min_score_if_attempted", valueType: "number" },
  UNSCORED: { field: "unscored", valueType: "boolean" },
  AUTOMARKABLE: { field: "automarkable", valueType: "boolean" },
  ENABLE_FULLWIDTH_SCORING: { field: "enable_fullwidth_scoring", valueType: "boolean" },
  ACCENT_SENSITIVITY: { field: "accent_sensitivity", valueType: "any" },
  ENABLED: { field: "enabled", valueType: "boolean" },
  ACCENT_PENALTY_POINTS: { field: "accent_penalty_points", valueType: "number" },

  UI_STYLE: { field: "ui_style", valueType: "any" },
  FONTSIZE: { field: "fontsize", valueType: "string" },
  VALIDATION_STEM_NUMERATION: { field: "validation_stem_numeration", valueType: "string" },
  RESPONSE_CONTAINER: { field: "response_container", valueType: "any" },
  RESPONSE_CONTAINERS: { field: "response_containers", valueType: "array" },
  HEIGHT: { field: "height", valueType: "string" },
  WIDTH: { field: "width", valueType: "string" },
  INPUT_TYPE: { field: "input_type", valueType: "string" },
  ARIA_LABEL: { field: "aria_label", valueType: "string" },
};

// Leaf-object members (arity 1). Each returns a single-key record; the
// enclosing collector merges a list of them into one object. Modelled on
// L0169's ASSESS/METHOD/EXPECTED (l0169/packages/api/src/compiler.js:328).
export const validationMembers: Record<string, { field: string }> = {
  SCORE: { field: "score" },
  VALUE: { field: "value" },
};

// The member field names, for the shape test that lets VALID_RESPONSE tell a
// member list apart from a bare value.
export const memberFields = new Set(Object.values(validationMembers).map((m) => m.field));

// Merge a list of single-key member records into one object, per L0169.
export function mergeMembers(members: any[]) {
  return members.reduce((acc: any, item: any) => ({ ...acc, ...item }), {});
}

// True when every element is a single-key record whose key is a known member
// field -- i.e. the list was written as `[score 1 value "x"]` rather than as a
// bare array of answers.
export function isMemberList(v: any) {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(
      (e: any) =>
        e != null &&
        typeof e === "object" &&
        !Array.isArray(e) &&
        Object.keys(e).length === 1 &&
        memberFields.has(Object.keys(e)[0]),
    )
  );
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
  SHORTTEXT: ["stimulus", "valid_response", "alternative_response", "instant_feedback", "is_math", "case_sensitive", "max_length", "placeholder", "metadata"],
  LONGTEXT: ["stimulus", "is_math", "max_length", "placeholder", "metadata"],
  PLAINTEXT: ["stimulus", "is_math", "max_length", "placeholder", "metadata"],
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
  CLOZEASSOCIATION: ["stimulus", "possible_responses", "valid_response", "alternative_response", "instant_feedback", "is_math", "partial_credit", "metadata"],
  CLOZEDROPDOWN: ["stimulus", "possible_responses", "valid_response", "alternative_response", "instant_feedback", "is_math", "partial_credit", "metadata"],
  CLOZEFORMULA: ["stimulus", "valid_response", "alternative_response", "instant_feedback", "is_math", "method", "metadata"],
  CHOICEMATRIX: ["stimulus", "rows", "columns", "valid_response", "alternative_response", "instant_feedback", "is_math", "shuffle_options", "partial_credit", "metadata"],
  ORDERLIST: ["stimulus", "list", "valid_response", "alternative_response", "instant_feedback", "is_math", "partial_credit", "metadata"],
  CLASSIFICATION: ["stimulus", "categories", "possible_responses", "valid_response", "alternative_response", "instant_feedback", "is_math", "partial_credit", "metadata"],
  BOWTIE: ["stimulus", "column_titles", "possible_responses", "valid_response", "alternative_response", "is_math", "metadata"],
  TOKEN_HIGHLIGHT: ["stimulus", "passage", "valid_response", "alternative_response", "distractors", "max_selection", "partial_credit", "metadata"],
};
