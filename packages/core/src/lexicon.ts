// SPDX-License-Identifier: MIT
// L0176's lexicon = L0000's base vocabulary + L0176's Learnosity additions
// (child keys win on merge). Ported from L0158 (@graffiticode/basis) verbatim —
// the entry shape (tk/name/cls/length/arity) is identical between basis and L0000.
import { lexicon as base } from "@graffiticode/l0000";

const additions = {
  // Block / structural keywords
  init: { tk: 1, name: "INIT", cls: "function", length: 1, arity: 1 },
  learnosity: { tk: 1, name: "LEARNOSITY", cls: "function", length: 1, arity: 1 },
  items: { tk: 1, name: "ITEMS", cls: "function", length: 2, arity: 2 },
  item: { tk: 1, name: "ITEM", cls: "function", length: 1, arity: 1 },
  questions: { tk: 1, name: "QUESTIONS", cls: "function", length: 2, arity: 2 },
  features: { tk: 1, name: "FEATURES", cls: "function", length: 2, arity: 2 },
  layout: { tk: 1, name: "LAYOUT", cls: "function", length: 2, arity: 2 },
  author: { tk: 1, name: "AUTHOR", cls: "function", length: 1, arity: 1 },
  hello: { tk: 1, name: "HELLO", cls: "function", length: 1, arity: 1 },

  // Question-type keywords (arity 1)
  mcq: { tk: 1, name: "MCQ", cls: "function", length: 1, arity: 1 },
  shorttext: { tk: 1, name: "SHORTTEXT", cls: "function", length: 1, arity: 1 },
  longtext: { tk: 1, name: "LONGTEXT", cls: "function", length: 1, arity: 1 },
  plaintext: { tk: 1, name: "PLAINTEXT", cls: "function", length: 1, arity: 1 },
  clozetext: { tk: 1, name: "CLOZETEXT", cls: "function", length: 1, arity: 1 },
  clozeassociation: { tk: 1, name: "CLOZEASSOCIATION", cls: "function", length: 1, arity: 1 },
  clozedropdown: { tk: 1, name: "CLOZEDROPDOWN", cls: "function", length: 1, arity: 1 },
  clozeformula: { tk: 1, name: "CLOZEFORMULA", cls: "function", length: 1, arity: 1 },
  choicematrix: { tk: 1, name: "CHOICEMATRIX", cls: "function", length: 1, arity: 1 },
  orderlist: { tk: 1, name: "ORDERLIST", cls: "function", length: 1, arity: 1 },
  classification: { tk: 1, name: "CLASSIFICATION", cls: "function", length: 1, arity: 1 },
  bowtie: { tk: 1, name: "BOWTIE", cls: "function", length: 1, arity: 1 },
  custom: { tk: 1, name: "CUSTOM", cls: "function", length: 1, arity: 1 },
  "token-highlight": { tk: 1, name: "TOKEN_HIGHLIGHT", cls: "function", length: 1, arity: 1 },

  // Attribute keywords (arity 2)
  stimulus: { tk: 1, name: "STIMULUS", cls: "function", length: 2, arity: 2 },
  options: { tk: 1, name: "OPTIONS", cls: "function", length: 2, arity: 2 },
  "valid-response": { tk: 1, name: "VALID_RESPONSE", cls: "function", length: 2, arity: 2 },
  "alternative-response": { tk: 1, name: "ALTERNATIVE_RESPONSE", cls: "function", length: 2, arity: 2 },
  "instant-feedback": { tk: 1, name: "INSTANT_FEEDBACK", cls: "function", length: 2, arity: 2 },
  "is-math": { tk: 1, name: "IS_MATH", cls: "function", length: 2, arity: 2 },
  "shuffle-options": { tk: 1, name: "SHUFFLE_OPTIONS", cls: "function", length: 2, arity: 2 },
  "multiple-responses": { tk: 1, name: "MULTIPLE_RESPONSES", cls: "function", length: 2, arity: 2 },
  "partial-credit": { tk: 1, name: "PARTIAL_CREDIT", cls: "function", length: 2, arity: 2 },
  "case-sensitive": { tk: 1, name: "CASE_SENSITIVE", cls: "function", length: 2, arity: 2 },
  "max-length": { tk: 1, name: "MAX_LENGTH", cls: "function", length: 2, arity: 2 },
  "max-word-count": { tk: 1, name: "MAX_WORD_COUNT", cls: "function", length: 2, arity: 2 },
  placeholder: { tk: 1, name: "PLACEHOLDER", cls: "function", length: 2, arity: 2 },
  "possible-responses": { tk: 1, name: "POSSIBLE_RESPONSES", cls: "function", length: 2, arity: 2 },
  rows: { tk: 1, name: "ROWS", cls: "function", length: 2, arity: 2 },
  columns: { tk: 1, name: "COLUMNS", cls: "function", length: 2, arity: 2 },
  list: { tk: 1, name: "ORDER_LIST", cls: "function", length: 2, arity: 2 },
  categories: { tk: 1, name: "CATEGORIES", cls: "function", length: 2, arity: 2 },
  "column-titles": { tk: 1, name: "COLUMN_TITLES", cls: "function", length: 2, arity: 2 },
  passage: { tk: 1, name: "PASSAGE", cls: "function", length: 2, arity: 2 },
  distractors: { tk: 1, name: "DISTRACTORS", cls: "function", length: 2, arity: 2 },
  "max-selection": { tk: 1, name: "MAX_SELECTION", cls: "function", length: 2, arity: 2 },
  method: { tk: 1, name: "METHOD", cls: "function", length: 2, arity: 2 },
  id: { tk: 1, name: "ID", cls: "function", length: 2, arity: 2 },
  lang: { tk: 1, name: "LANG", cls: "function", length: 2, arity: 2 },
  model: { tk: 1, name: "MODEL", cls: "function", length: 2, arity: 2 },
  "save-to-itembank": { tk: 1, name: "SAVE_TO_ITEMBANK", cls: "function", length: 2, arity: 2 },
  params: { tk: 1, name: "PARAMS", cls: "function", length: 2, arity: 2 },

  // --- Aligned Learnosity vocabulary -------------------------------------
  // Every word below is the kebab-case spelling of the Learnosity field it
  // emits, and nests the way the field nests. Introduced with `clozetext`; the
  // remaining question types still use the older flat spellings above and are
  // converted one at a time. Which words a given type accepts is scoped by
  // `validAttributes` in question-types.ts, not by the lexicon, which is global.

  // Question-level fields
  template: { tk: 1, name: "TEMPLATE", cls: "function", length: 2, arity: 2 },
  "stimulus-review": { tk: 1, name: "STIMULUS_REVIEW", cls: "function", length: 2, arity: 2 },
  "instructor-stimulus": { tk: 1, name: "INSTRUCTOR_STIMULUS", cls: "function", length: 2, arity: 2 },
  "character-map": { tk: 1, name: "CHARACTER_MAP", cls: "function", length: 2, arity: 2 },
  "multiple-line": { tk: 1, name: "MULTIPLE_LINE", cls: "function", length: 2, arity: 2 },
  spellcheck: { tk: 1, name: "SPELLCHECK", cls: "function", length: 2, arity: 2 },
  "ignore-leading-and-trailing-spaces": { tk: 1, name: "IGNORE_LEADING_AND_TRAILING_SPACES", cls: "function", length: 2, arity: 2 },
  "match-all-possible-responses": { tk: 1, name: "MATCH_ALL_POSSIBLE_RESPONSES", cls: "function", length: 2, arity: 2 },
  "feedback-attempts": { tk: 1, name: "FEEDBACK_ATTEMPTS", cls: "function", length: 2, arity: 2 },

  // validation (arity 2) — value is the record built by the words beneath it
  validation: { tk: 1, name: "VALIDATION", cls: "function", length: 2, arity: 2 },
  "scoring-type": { tk: 1, name: "SCORING_TYPE", cls: "function", length: 2, arity: 2 },
  "alt-responses": { tk: 1, name: "ALT_RESPONSES", cls: "function", length: 2, arity: 2 },
  "allow-negative-scores": { tk: 1, name: "ALLOW_NEGATIVE_SCORES", cls: "function", length: 2, arity: 2 },
  penalty: { tk: 1, name: "PENALTY", cls: "function", length: 2, arity: 2 },
  "min-score-if-attempted": { tk: 1, name: "MIN_SCORE_IF_ATTEMPTED", cls: "function", length: 2, arity: 2 },
  unscored: { tk: 1, name: "UNSCORED", cls: "function", length: 2, arity: 2 },
  automarkable: { tk: 1, name: "AUTOMARKABLE", cls: "function", length: 2, arity: 2 },
  "enable-fullwidth-scoring": { tk: 1, name: "ENABLE_FULLWIDTH_SCORING", cls: "function", length: 2, arity: 2 },
  "accent-sensitivity": { tk: 1, name: "ACCENT_SENSITIVITY", cls: "function", length: 2, arity: 2 },
  enabled: { tk: 1, name: "ENABLED", cls: "function", length: 2, arity: 2 },
  "accent-penalty-points": { tk: 1, name: "ACCENT_PENALTY_POINTS", cls: "function", length: 2, arity: 2 },

  // ui-style and response containers (arity 2) — values are records
  "ui-style": { tk: 1, name: "UI_STYLE", cls: "function", length: 2, arity: 2 },
  fontsize: { tk: 1, name: "FONTSIZE", cls: "function", length: 2, arity: 2 },
  "validation-stem-numeration": { tk: 1, name: "VALIDATION_STEM_NUMERATION", cls: "function", length: 2, arity: 2 },
  "response-container": { tk: 1, name: "RESPONSE_CONTAINER", cls: "function", length: 2, arity: 2 },
  "response-containers": { tk: 1, name: "RESPONSE_CONTAINERS", cls: "function", length: 2, arity: 2 },
  height: { tk: 1, name: "HEIGHT", cls: "function", length: 2, arity: 2 },
  width: { tk: 1, name: "WIDTH", cls: "function", length: 2, arity: 2 },
  "input-type": { tk: 1, name: "INPUT_TYPE", cls: "function", length: 2, arity: 2 },
  "aria-label": { tk: 1, name: "ARIA_LABEL", cls: "function", length: 2, arity: 2 },

  // Leaf-object members (arity 1). Each returns a single-key record; the
  // enclosing collector merges a list of them into one object. Modelled on
  // L0169's `assess [method "value" expected 42]`.
  score: { tk: 1, name: "SCORE", cls: "function", length: 1, arity: 1 },
  value: { tk: 1, name: "VALUE", cls: "function", length: 1, arity: 1 },

  // Metadata container (arity 2) — value is a list of member constructors
  metadata: { tk: 1, name: "METADATA", cls: "function", length: 2, arity: 2 },

  // Metadata member constructors (arity 1) — each returns a tagged entry
  tags: { tk: 1, name: "TAGS", cls: "function", length: 1, arity: 1 },
  notes: { tk: 1, name: "NOTES", cls: "function", length: 1, arity: 1 },
  "distractor-rationale": { tk: 1, name: "DISTRACTOR_RATIONALE", cls: "function", length: 1, arity: 1 },
  acknowledgements: { tk: 1, name: "ACKNOWLEDGEMENTS", cls: "function", length: 1, arity: 1 },
  description: { tk: 1, name: "DESCRIPTION", cls: "function", length: 1, arity: 1 },
  source: { tk: 1, name: "SOURCE", cls: "function", length: 1, arity: 1 },
  "difficulty-level": { tk: 1, name: "DIFFICULTY_LEVEL", cls: "function", length: 1, arity: 1 },
};

// Retired spellings. They still lex — a source saved before the rename must keep
// compiling — but each maps onto the current keyword's AST name, so there is one
// node type and one builder downstream. They are stripped from the published
// lexicon.json (see tools/build-static.js), so nothing advertises them: no
// autocomplete entry, no spec row, no generator prompt. Removing one is a
// breaking change for already-saved sources.
const deprecatedAliases: Record<string, string> = {
  "hot-text": "token-highlight", // renamed to match the Learnosity widget name
};

const aliasEntries = Object.fromEntries(
  Object.entries(deprecatedAliases).map(([alias, current]) => [
    alias,
    (additions as Record<string, any>)[current],
  ]),
);

// The alias words, for build-static.js to filter out of the public lexicon.json.
export const deprecatedWords = Object.keys(deprecatedAliases);

export const lexicon = { ...base, ...additions, ...aliasEntries };
