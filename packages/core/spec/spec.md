<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0176 Vocabulary

This specification documents dialect-specific functions available in the
**L0176** language of Graffiticode. These functions extend the core language
with functionality for building Learnosity assessment integrations.

The core language specification including the definition of its syntax,
semantics and base library can be found here:
[Graffiticode Language Specification](./graffiticode-language-spec.html)

## Functions

| Function | Arity | Signature | Description |
| :------- | :---: | :-------- | :---------- |
| `learnosity` | 2 | `<record, continuation: record>` | Top-level wrapper for Learnosity API requests |
| `init` | 1 | `<record: record>` | Initializes a Learnosity API session |
| `items` | 1 | `<record: record>` | Creates a Learnosity Items API request from a record or list of items |
| `item` | 1 | `<record: record>` | Defines a single item (for use in a list passed to `items`) |
| `questions` | 2 | `<list: list, continuation: record>` | Chainable attribute: sets the questions for an item |
| `features` | 2 | `<list: list, continuation: record>` | Chainable attribute: sets the features for an item (placeholder) |
| `layout` | 2 | `<string: string, continuation: record>` | Chainable attribute: sets the layout template for an item (placeholder) |
| `author` | 1 | `<record: record>` | Creates a Learnosity Author API request |
| `hello` | 1 | `<string: string>` | Renders a hello message |

### Question Type Functions

Each question type function takes a record of attributes (built via chainable
attribute keywords) and produces a Learnosity question JSON object. Attributes
not provided are filled with sensible defaults, so `mcq {}` produces a
complete renderable question.

| Function | Arity | Learnosity Type | Description |
| :------- | :---: | :-------------- | :---------- |
| `mcq` | 1 | `mcq` | Multiple choice question |
| `shorttext` | 1 | `shorttext` | Short typed response |
| `longtext` | 1 | `longtextV2` | Essay with rich text editor |
| `plaintext` | 1 | `plaintext` | Essay with plain text |
| `clozetext` | 1 | `clozetext` | Fill-in-the-blank (typed responses) |
| `clozeassociation` | 1 | `clozeassociation` | Fill-in-the-blank (drag and drop) |
| `clozedropdown` | 1 | `clozedropdown` | Fill-in-the-blank (dropdown select) |
| `clozeformula` | 1 | `clozeformulaV2` | Fill-in-the-blank (math/formula) |
| `choicematrix` | 1 | `choicematrix` | Grid of options by stems |
| `orderlist` | 1 | `orderlist` | Drag items into correct order |
| `classification` | 1 | `classification` | Sort items into categories |
| `bowtie` | 1 | `bowtie` | NGN/NCLEX bow-tie: 2-1-2 drag-and-drop |
| `hot-text` | 1 | `tokenhighlight` | Highlight tokens in a passage (synonym: `token-highlight`) |
| `token-highlight` | 1 | `tokenhighlight` | Synonym for `hot-text` |
| `custom` | 1 | `custom` | Embed a separately deployed Graffiticode-language interaction |

### Attribute Keywords

Attribute keywords are arity-2 functions that chain together to build a record
of attributes for a question type. The chain terminates with `{}`.

| Keyword | Value Type | Learnosity Field | Used By |
| :------ | :--------- | :--------------- | :------ |
| `stimulus` | string | `stimulus` | All types |
| `options` | string[] | `options` | mcq, choicematrix |
| `valid-response` | varies | `validation.valid_response.value` | All scored types |
| `instant-feedback` | boolean | `instant_feedback` | All types |
| `is-math` | boolean | `is_math` | All types (enables MathJax for LaTeX) |
| `shuffle-options` | boolean | `shuffle_options` | mcq, choicematrix |
| `multiple-responses` | boolean | `multiple_responses` | mcq |
| `case-sensitive` | boolean | `case_sensitive` | shorttext, clozetext |
| `max-length` | number | `max_length` | shorttext |
| `max-word-count` | number | `max_word_count` | longtext, plaintext |
| `placeholder` | string | `placeholder` | longtext, plaintext, shorttext |
| `possible-responses` | array | `possible_responses` | clozeassociation, clozedropdown, classification |
| `rows` | string[] | `stems` | choicematrix |
| `columns` | string[] | `options` | choicematrix |
| `list` | string[] | `list` | orderlist |
| `categories` | string[] | `ui_style.column_titles` | classification |
| `column-titles` | string[] | `ui_style.column_titles` + `possible_response_groups[].title` | bowtie |
| `passage` | string | `template` (with `lrn_token` spans injected) | hot-text |
| `distractors` | string[] | — (clickable tokens only, not scored) | hot-text |
| `max-selection` | number | `max_selection` | hot-text |
| `method` | string | `validation method` | clozeformula |
| `lang` | string | — (URL/`custom_type` synthesis) | custom |
| `model` | record or string | `data` (JSON-stringified) | custom |
| `metadata` | list | `metadata` / `tags` | item, all question types |
| `save-to-itembank` | boolean | — (compiler flag) | items chain |

#### Metadata Member Constructors

The `metadata` keyword takes a list whose members are arity-1 constructor
calls. Each member tags its payload with a `kind`, so the compiler can route
faceted fields to `tags` and free-form fields to `metadata` in the Learnosity
output.

| Keyword | Value Type | Level | Notes |
| :------ | :--------- | :---- | :---- |
| `tags` | record `{ Type: string \| string[] }` | item | Each record value is a string or array of strings. Bare strings are normalized to a single-element array. Faceted-only conventions like `Difficulty` and `DOK` are written here directly (e.g. `tags { Difficulty: "medium", DOK: 2 }`) — there are no dedicated Learnosity fields for them. |
| `notes` | string | item | Free-form author note emitted as the item's top-level `note` field, which backs the Notes field on the Author Site item details page. |
| `description` | string | item | Emitted as the item's top-level `description` field (Author Site item details page Description). |
| `source` | string | item | Emitted as the item's top-level `source` field (Author Site item details page Source). |
| `difficulty-level` | integer | item | Emitted as `adaptive.difficulty` — the integer Rasch calibration backing the Author Site item details page Difficulty level spinner. Distinct from the `difficulty` tag (which is a text label like "medium"). |
| `distractor-rationale` | string or string[] | question | Emitted as `metadata.distractor_rationale`. A list is joined into a numbered multi-line string (`"1. ...\n2. ..."`) so the Author Site's single Distractor Rationale field shows per-option intent. |
| `acknowledgements` | string | question | Attribution. |

## Function Reference

### learnosity

Top-level wrapper for Learnosity API requests. Takes two arguments: an API
call (`items` or `author`) and a continuation record.

```
learnosity
  items [
    item
      questions [
        mcq
          stimulus "What is 2 + 2?"
          options ["3", "4", "5"]
          valid-response [1]
          {}
      ]
      {}
  ] {}
```

### init

Initializes a Learnosity API session for items, questions, or author mode
based on the `type` field in the given record.

```
init { "type": "items" }
```

### items

Creates a Learnosity Items API request from a list of `item` objects.

```
items [
  item
    questions [
      mcq
        stimulus "What is the capital of France?"
        options ["Paris", "London", "Berlin", "Madrid"]
        valid-response [0]
        {}
    ]
    {}
]
```

By default `items` emits a preview: the item (and its questions) render
inline through Questions API without being written to the Learnosity
item bank. Chain `save-to-itembank true` into the items continuation to
persist the item. Saved items always land as `status: "unpublished"`
(draft) — publishing is an Author Site concern, not a DSL one.

Item-bank writes require caller-supplied Learnosity credentials, set with
`set-var "learnosity-key" ...` and `set-var "learnosity-secret" ...` before
`items`. The two must be supplied together (only one is an error). When
present they sign every Learnosity request (preview and write); when absent,
previews use the server's default credentials but `save-to-itembank true` is
an error — the default credentials may sign previews but never mutate the bank.

```
id "mitochondria-mcq"
set-var "learnosity-key" get-val-public "learnosityKey"
set-var "learnosity-secret" get-val-private "learnositySecret"
items [
  item questions [mcq stimulus "..." options [...] valid-response [0] {}] {}
]
  save-to-itembank true
  {}
```

### item

Defines a single item for use in a list passed to `items`. Takes a record
of chained attributes (questions, features, layout).

```
item
  questions [mcq {}]
  {}
```

### questions

Chainable arity-2 attribute that sets the questions for an item. Takes a
list of question objects and a continuation.

```
questions [
  mcq
    stimulus "What is 2 + 2?"
    options ["3", "4", "5"]
    valid-response [1]
    {}
] {}
```

### features

Chainable arity-2 attribute that sets the features for an item. Takes a
list of feature objects and a continuation. (Placeholder — not yet implemented.)

```
features [
  { "type": "sharedpassage", "content": "Read the following passage..." }
] {}
```

### layout

Chainable arity-2 attribute that sets the HTML layout template for an item.
Takes a string and a continuation. (Placeholder — not yet implemented.)

```
layout "<div class='row'><span class='learnosity-response question-q0'></span></div>" {}
```

### author

Creates a Learnosity Author API request from the given configuration record.

```
author { "mode": "item_edit" }
```

### hello

Renders a hello message that includes the given string.

```
hello "world"
```

### mcq

Creates a multiple choice question. Options are provided as a string array
and `valid-response` is an array of correct option indices.

```
mcq
  stimulus "Which planet is closest to the Sun?"
  options ["Mercury", "Venus", "Earth", "Mars"]
  valid-response [0]
  instant-feedback true
  {}
```

### shorttext

Creates a short text response question.

```
shorttext
  stimulus "What is the chemical symbol for water?"
  valid-response "H2O"
  case-sensitive false
  {}
```

### longtext

Creates an essay question with a rich text editor. No auto-scoring.

```
longtext
  stimulus "Describe the water cycle in your own words."
  max-word-count 300
  placeholder "Write your essay here..."
  {}
```

### plaintext

Creates an essay question with a plain text editor. No auto-scoring.

```
plaintext
  stimulus "Explain your reasoning."
  max-word-count 200
  {}
```

### clozetext

Creates a fill-in-the-blank question where students type responses.
Use `{{response}}` markers in the stimulus for each blank. The
`valid-response` is a flat list of strings with one entry per blank.

```
clozetext
  stimulus "The {{response}} is the powerhouse of the cell."
  valid-response ["mitochondria"]
  case-sensitive false
  {}
```

Multiple blanks:

```
clozetext
  stimulus "The {{response}} War ended in {{response}}."
  valid-response ["Civil", "1865"]
  {}
```

### clozeassociation

Creates a fill-in-the-blank question where students drag responses from
a pool of options into blanks. Use `possible-responses` (not `options`)
to provide the draggable choices.

```
clozeassociation
  stimulus "Drag the correct answer: {{response}} is the capital of France."
  possible-responses ["Paris", "London", "Berlin"]
  valid-response ["Paris"]
  {}
```

### clozedropdown

Creates a fill-in-the-blank question with dropdown selects. Use
`possible-responses` (not `options`) to provide the dropdown choices.
Each blank gets its own list of choices, so `possible-responses` is
a list of lists.

```
clozedropdown
  stimulus "Select the answer: The sky is {{response}}."
  possible-responses [["blue", "red", "green"]]
  valid-response ["blue"]
  {}
```

### clozeformula

Creates a fill-in-the-blank question for math/formula input.
The `method` attribute controls how the answer is validated.

```
clozeformula
  stimulus "Solve for x: 2x + 4 = 10. x = {{response}}"
  valid-response ["3"]
  method "equivLiteral"
  {}
```

Supported methods: `equivLiteral`, `equivSymbolic`, `equivValue`,
`isSimplified`, `isFactorised`, `isExpanded`, `stringMatch`, `isUnit`.

### choicematrix

Creates a grid question where students select an option for each row.

```
choicematrix
  stimulus "Classify each statement as true or false."
  rows ["The sun is a star", "The moon is a planet"]
  columns ["True", "False"]
  valid-response [[0], [1]]
  {}
```

### orderlist

Creates a question where students drag items into the correct order.

```
orderlist
  stimulus "Arrange these events in chronological order."
  list ["World War II", "World War I", "Moon Landing", "Internet"]
  valid-response [1, 0, 2, 3]
  {}
```

### classification

Creates a question where students sort items into categories.

```
classification
  stimulus "Sort the animals into the correct categories."
  categories ["Mammals", "Reptiles"]
  possible-responses ["Dog", "Snake", "Cat", "Lizard"]
  valid-response [[0, 2], [1, 3]]
  {}
```

### bowtie

Creates a Next-Gen NCLEX bow-tie question: three source pools feed three
drop zones in a 2-1-2 layout (two on the left, one in the center, two on
the right). `column-titles` labels both the source pools and the drop
zones. Correct answers are written as the option text — the compiler
flattens the three pools and resolves each string to the global index
Learnosity expects.

```
bowtie
  stimulus "65-year-old male presents with chest pain and diaphoresis."
  column-titles ["Actions to Take", "Condition Most Likely", "Parameters to Monitor"]
  possible-responses [
    ["give aspirin", "give nitro", "call cardiology", "obtain 12-lead ECG"],
    ["myocardial infarction", "pulmonary embolism", "pericarditis"],
    ["ST segment changes", "blood pressure", "troponin", "respiratory rate"]
  ]
  valid-response [
    ["give aspirin", "obtain 12-lead ECG"],
    ["myocardial infarction"],
    ["ST segment changes", "troponin"]
  ]
  {}
```

The 2-1-2 shape is enforced at compile time: `valid-response` must have
exactly two entries in the first and third lists and one in the middle,
every entry must appear in the matching pool, and no list may contain
duplicates.

### hot-text

Creates a token-highlight question: the learner clicks tokens in a `passage`
to select them. `token-highlight` is an exact synonym. Clickable tokens are
listed explicitly — `valid-response` holds the correct tokens and
`distractors` the clickable-but-incorrect ones. The compiler wraps each
whole-word occurrence of a listed token in `<span class="lrn_token">` (so only
listed tokens are clickable; everything else is plain text) and emits
`tokenization: "custom"`. Correct tokens are scored by their span index in
document order.

```
hot-text
  stimulus "Highlight the verbs."
  passage "The cat runs then jumps high."
  valid-response ["runs", "jumps"]
  distractors ["cat", "high"]
  max-selection 2
  {}
```

Matching is case-insensitive and whole-word, so `"runs"` matches `"Runs"` at a
sentence start but not the substring of `"runner"`. A correct token that
appears more than once is highlighted and scored at every occurrence.
`max-selection` optionally caps how many tokens the learner may select. The
compiler errors if a listed token is not found in the passage or if a token
appears in both `valid-response` and `distractors`.

### custom

Embeds a separately deployed Graffiticode-language interaction as a Learnosity
custom question. `lang` is required and identifies the deployed interaction;
the compiler synthesizes `custom_type` and the question / scorer / CSS
URLs from `https://l<lang>.graffiticode.org/...`.

The continuation record passes through onto the emitted question object
as peers of `type` (and, once wrapped through items, `response_id`). The
`data` field — Learnosity's per-question payload string — is special-
cased: a record value is JSON-stringified for the SDK; a string passes
through as-is.

The `data` field is most cleanly set with the chained `model` attribute
(arity 2), which folds its value into the continuation's `data:`. The
record-literal form (`{ data: ... }` in the terminator) also works; if
both are present the chained `model` wins.

The exact shape of the model is determined by the deployed interaction
at `l<lang>.graffiticode.org` — consult that integration's docs for the
fields it expects.

```
custom
  lang "0166"
  stimulus "..."
  model { ...interaction-specific fields... }
  {}
```

Compiles to:

```json
{
  "type": "custom",
  "custom_type": "custom_question_l0166",
  "stimulus": "...",
  "js": {
    "question": "https://l0166.graffiticode.org/question.js",
    "scorer":   "https://l0166.graffiticode.org/scorer.js"
  },
  "css": "https://l0166.graffiticode.org/question.css",
  "data": "<JSON-stringified interaction data>"
}
```

#### Pipeline composition

When an L0176 program is wired downstream of another Graffiticode task in
the console pipeline, the upstream task's compiled output is read via the
base-language `data` primitive and threaded into the `custom` question's
`data:` field via the `model` attribute. There are two equivalent forms:

```
custom
  lang "0166"
  stimulus "Use the spreadsheet to compute the column totals."
  model data use "0166"
  {}
```

```
custom
  lang "0166"
  stimulus "Use the spreadsheet to compute the column totals."
  model data {}
  {}
```

- **`data use "<lang>"`** (preferred) declares the upstream language
  explicitly. The console reads this annotation at write time, fetches
  `L<lang>/schema.json`, and reactively generates the upstream task to
  chain. Falls back to `{}` if no upstream is bound at runtime.
- **`data {default}`** is the untyped form: returns the upstream's
  compiled output if a producer is wired, or the supplied default
  otherwise. No language hint, so the console will not auto-discover
  an upstream — the chain must be assembled manually.
- For both forms, the `lang` of the surrounding `custom` should match
  the upstream dialect.
- Wiring of producer task ID to consumer is set in the console's pipeline
  editor (or assembled reactively from the `use` hint), not by hand in
  source.
- An L0176 program has at most one upstream. Multiple `custom` questions
  in the same program all read the same upstream value.
- Scoring is the deployed interaction's own concern (`scorer.js`).
  `valid-response` is not used with `custom`.
- `save-to-itembank true` freezes the upstream value at compile time into
  the saved item — the bank entry is a snapshot, not a live reference.
  Re-authoring the upstream after save does not update the bank entry.

## Program Examples

Multiple choice assessment:

```
set-var "lrn-id" get-val-public "itemId"
learnosity
  items [
    item
      questions [
        mcq
          stimulus "What color means go?"
          options ["Red", "Yellow", "Green"]
          valid-response [2]
          instant-feedback true
          {}
      ]
      {}
  ] {}..
```

Multiple questions in one item:

```
set-var "lrn-id" get-val-public "itemId"
learnosity
  items [
    item
      questions [
        mcq
          stimulus "What is 2 + 2?"
          options ["3", "4", "5"]
          valid-response [1]
          {},
        shorttext
          stimulus "Spell the word for the number 4."
          valid-response "four"
          case-sensitive false
          {}
      ]
      {}
  ] {}..
```

Question with all defaults (renders a mock MCQ):

```
set-var "lrn-id" get-val-public "itemId"
learnosity items [item questions [mcq {}] {}] {}..
```

Multiple items:

```
set-var "lrn-id" get-val-public "itemId"
learnosity
  items [
    item questions [mcq {}] {},
    item questions [shorttext {}] {}
  ] {}..
```

Spreadsheet question reading an upstream L0166 task:

```
set-var "lrn-id" get-val-public "itemId"
learnosity
  items [
    item
      questions [
        custom
          lang "0166"
          stimulus "Use the spreadsheet to compute the column totals."
          model data use "0166"
          {}
      ]
      {}
  ] {}..
```
