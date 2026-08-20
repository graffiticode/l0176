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
| `token-highlight` | 1 | `tokenhighlight` | Highlight tokens in a passage |
| `custom` | 1 | `custom` | Embed a separately deployed Graffiticode-language interaction |

### Attribute Keywords

An attribute keyword is named for the Learnosity field it emits, so the program
reads as a transcription of the question JSON.

Attribute keywords are arity-1 members. A question is a bracketed member list —
`mcq [ stimulus "..." options [...] ]` — and every object inside it is written the
same way, so the same keyword works at any depth. An array of objects is a list of
member lists. `{}` appears only on the arity-2 blocks (`items`, `questions`),
which take a continuation record.

| Keyword | Value Type | Learnosity Field | Used By |
| :------ | :--------- | :--------------- | :------ |
| `stimulus` | string | `stimulus` | All types |
| `options` | string[] | `options` | mcq, choicematrix |
| `valid-response` | varies | `validation.valid_response.value` | All scored types |
| `alternative-response` | varies | `validation.alt_responses[*].value` | mcq, shorttext, clozetext, clozeassociation, clozedropdown, clozeformula, choicematrix, orderlist, classification, token-highlight |
| `instant-feedback` | boolean | `instant_feedback` | All types |
| `is-math` | boolean | `is_math` | All types (enables MathJax for LaTeX) |
| `shuffle-options` | boolean | `shuffle_options` | mcq, choicematrix |
| `multiple-responses` | boolean | `multiple_responses` | mcq |
| `partial-credit` | boolean | `validation.scoring_type` | mcq (with `multiple-responses`), choicematrix, clozetext, clozeassociation, clozedropdown, orderlist, classification, token-highlight |
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
| `passage` | string | `template` (with `lrn_token` spans injected) | token-highlight |
| `distractors` | string[] | — (clickable tokens only, not scored) | token-highlight |
| `max-selection` | number | `max_selection` | token-highlight |
| `method` | string | `validation method` | clozeformula |
| `lang` | string | — (URL/`custom_type` synthesis) | custom |
| `model` | record or string | `data` (JSON-stringified) | custom |
| `metadata` | list | `metadata` / `tags` | item, all question types |
| `params` | record[] | `dynamic_content_data` | item chain |
| `save-to-itembank` | boolean | — (compiler flag) | items chain |

#### Partial Credit

Scored questions default to Learnosity's `exactMatch` scoring: the learner must
get every response right to earn the point. `partial-credit true` switches the
question to `partialMatch`, which awards a fraction of the score for each
correct response. The score itself stays `1`, so partial credit changes how the
point is divided, not what the question is worth.

```
mcq [
  stimulus "Select all the prime numbers."
  options ["2", "4", "7", "9"]
  valid-response [0, 2]
  multiple-responses true
  partial-credit true
]
```

Only types with more than one scorable response accept it: `mcq`,
`choicematrix`, `clozetext`, `clozeassociation`, `clozedropdown`, `orderlist`,
`classification`, and `token-highlight`. Anywhere else — including
`shorttext`, `clozeformula`, `bowtie`, and the unscored `longtext` / `plaintext`
— it is a compile error rather than a silently ignored attribute. On `mcq` it
additionally requires `multiple-responses true`; a single-response mcq is
all-or-nothing by construction.

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
    item [
      questions [
        mcq [
          stimulus "What is 2 + 2?"
          options ["3", "4", "5"]
          valid-response [1]
        ]
      ] {}
    ]
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
  item [
    questions [
      mcq [
        stimulus "What is the capital of France?"
        options ["Paris", "London", "Berlin", "Madrid"]
        valid-response [0]
      ]
    ] {}
  ]
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
item [
  questions [mcq {}] {}
]
```

### questions

Chainable arity-2 attribute that sets the questions for an item. Takes a
list of question objects and a continuation.

```
questions [
  mcq [
    stimulus "What is 2 + 2?"
    options ["3", "4", "5"]
    valid-response [1]
  ]
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
mcq [
  stimulus "Which planet is closest to the Sun?"
  options ["Mercury", "Venus", "Earth", "Mars"]
  valid-response [0]
  instant-feedback true
]
```

### shorttext

A short typed answer — a word or two, or a number. Note `valid-response`'s
`value` is a bare string here, not a list: this type has one response box.

```
shorttext [
  stimulus "What is the chemical symbol for water?"
  case-sensitive false
  validation [
    valid-response [score 1 value "H2O"]
  ]
]
```

### longtext

Creates an essay question with a rich text editor. No auto-scoring.

```
longtext [
  stimulus "Describe the water cycle in your own words."
  max-length 300
  placeholder "Write your essay here..."
  show-word-count true
]
```

### plaintext

Creates an essay question with a plain text editor. No auto-scoring.

```
plaintext [
  stimulus "Explain your reasoning."
  max-length 200
]
```

### clozetext

Fill-in-the-blank: the learner types into response boxes placed in a passage.

`stimulus` is the prompt shown above the response area; `template` is the passage,
with `{{response}}` marking each blank.

```
clozetext [
  stimulus "Fill in the blanks."
  template "The {{response}} is the {{response}}."
  case-sensitive false
  validation [
    scoring-type "partialMatch"
    valid-response [score 1 value ["cat", "mat"]]
  ]
]
```

`valid-response` holds one answer per blank, in order. Its `score` and `value` are
arity-1 members: a list of them merges into the single `valid_response` object.

#### Accepted alternate answers

`valid-response` is one answer set, so a second accepted answer for a blank is not
another entry in it — it is a whole alternate set under `alt-responses`. Each entry
is its own member list, and each must cover every `{{response}}` marker:

```
clozetext [
  template "The capital of France is {{response}}."
  validation [
    valid-response [score 1 value ["Paris"]]
    alt-responses [[score 1 value ["Paree"]]]
  ]
]
```

`score` may be omitted from a member list, in which case Learnosity's default
applies. For case variants prefer `case-sensitive false` over listing spellings.

#### Scoring

`scoring-type` takes `exactMatch` (the default), `partialMatch` (a cumulative score
per correct blank) or `partialMatchV2` (the question score divided between blanks).
Any other value is a compile error: Learnosity silently falls back to `exactMatch`
on an unrecognized one, which would mis-score the question without saying so.

#### Response length

`max-length` caps the characters a learner may type **per blank**. Learnosity's
default is `15`, so an answer longer than fifteen characters cannot be entered
unless this is raised. The maximum is 250.

### clozeassociation

Fill-in-the-blank where the learner drags responses from a pool into blanks.
`stimulus` is the prompt, `template` the passage carrying the `{{response}}`
markers, and `possible-responses` the draggable choices.

```
clozeassociation [
  stimulus "Drag the correct answer into the blank."
  template "{{response}} is the capital of France."
  possible-responses ["Paris", "London", "Berlin"]
  validation [
    valid-response [score 1 value ["Paris"]]
  ]
]
```

### clozedropdown

Fill-in-the-blank with drop-down selects. `stimulus` is the prompt and
`template` the passage. Each drop-down gets its own list of choices, in order of
appearance, so `possible-responses` is a list of lists.

```
clozedropdown [
  stimulus "Select the answer."
  template "The sky is {{response}}."
  possible-responses [["blue", "red", "green"]]
  validation [
    valid-response [score 1 value ["blue"]]
  ]
]
```

### clozeformula

Creates a fill-in-the-blank question for math/formula input. The response is
parsed as a math expression; `method` selects which property of that expression
is compared to `valid-response` — its syntactic form (`equivLiteral`), its
symbolic equivalence (`equivSymbolic`), its numeric value (`equivValue`), or a
structural property such as being simplified (`isSimplified`).

```
clozeformula [
  stimulus "Solve for x: 2x + 4 = 10. x = {{response}}"
  valid-response ["3"]
  method "equivLiteral"
]
```

Supported methods: `equivLiteral`, `equivSymbolic`, `equivValue`,
`isSimplified`, `isFactorised`, `isExpanded`, `stringMatch`, `isUnit`.
The compiler passes the method through verbatim and does not check it against
this list.

#### Accepted answers per blank

`valid-response` is positional: one entry per `{{response}}` blank. An entry is
either a bare value — that blank's only accepted expression — or a list of the
expressions that blank accepts:

```
clozeformula [
  stimulus "Simplify 4/8 to lowest terms: {{response}}"
  valid-response [["1/2", "0.5", "2/4"]]
  method "equivLiteral"
]
```

The first expression of every blank forms Learnosity's `valid_response`; each
remaining combination becomes an entry in `alt_responses`, so
`valid-response [["2x", "x*2"], ["5"]]` emits one `valid_response`
(`2x`, `5`) and one alternative (`x*2`, `5`). The number of combinations —
the product of the per-blank counts — is capped at 25; beyond that the compiler
errors rather than emit an unwieldy `alt_responses`.

Because the method already absorbs notational variation (under `equivLiteral`,
`1/2`, `1 / 2` and `\frac{1}{2}` are one expression), a list is only needed for
genuinely different expressions.

### choicematrix

A grid of prompts and choices. Learnosity's names: `stems` are the row prompts,
`options` the column choices. Set `multiple-responses true` to turn each row's
radio buttons into checkboxes.

```
choicematrix [
  stimulus "Classify each statement as true or false."
  stems ["The sun is a star", "The moon is a planet"]
  options ["True", "False"]
  validation [
    valid-response [score 1 value [[0], [1]]]
  ]
]
```

### orderlist

Drag items into the correct order. Alone among the types, its `scoring-type`
reaches `partialMatchPairwise`, which compares adjacent entries rather than
scoring each position outright.

```
orderlist [
  stimulus "Arrange these events in chronological order."
  list ["World War II", "World War I", "Moon Landing", "Internet"]
  validation [
    scoring-type "partialMatchPairwise"
    valid-response [score 1 value [1, 0, 2, 3]]
  ]
]
```

### classification

Creates a question where students sort items into categories.

```
classification [
  stimulus "Sort the animals into the correct categories."
  categories ["Mammals", "Reptiles"]
  possible-responses ["Dog", "Snake", "Cat", "Lizard"]
  valid-response [[0, 2], [1, 3]]
]
```

### bowtie

Creates a Next-Gen NCLEX bow-tie question: three source pools feed three
drop zones in a 2-1-2 layout (two on the left, one in the center, two on
the right). `column-titles` labels both the source pools and the drop
zones. Correct answers are written as the option text — the compiler
flattens the three pools and resolves each string to the global index
Learnosity expects.

```
bowtie [
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
]
```

The 2-1-2 shape is enforced at compile time: `valid-response` must have
exactly two entries in the first and third lists and one in the middle,
every entry must appear in the matching pool, and no list may contain
duplicates.

### token-highlight

Creates a token-highlight question: the learner clicks tokens in a `passage`
to select them. Clickable tokens are listed explicitly — `valid-response`
holds the correct tokens and `distractors` the clickable-but-incorrect
ones. The compiler wraps each
whole-word occurrence of a listed token in `<span class="lrn_token">` (so only
listed tokens are clickable; everything else is plain text) and emits
`tokenization: "custom"`. Correct tokens are scored by their span index in
document order.

```
token-highlight [
  stimulus "Highlight the verbs."
  passage "The cat runs then jumps high."
  valid-response ["runs", "jumps"]
  distractors ["cat", "high"]
  max-selection 2
]
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
custom [
  lang "0166"
  stimulus "..."
  model { ...interaction-specific fields... }
]
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
custom [
  lang "0166"
  stimulus "Use the spreadsheet to compute the column totals."
  model data use "0166"
]
```

```
custom [
  lang "0166"
  stimulus "Use the spreadsheet to compute the column totals."
  model data {}
]
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
    item [
      questions [
        mcq [
          stimulus "What color means go?"
          options ["Red", "Yellow", "Green"]
          valid-response [2]
          instant-feedback true
        ]
      ] {}
    ]
  ] {}..
```

Multiple questions in one item:

```
set-var "lrn-id" get-val-public "itemId"
learnosity
  items [
    item [
      questions [
        mcq
          stimulus "What is 2 + 2?"
          options ["3", "4", "5"]
          valid-response [1]
          {},
        shorttext [
          stimulus "Spell the word for the number 4."
          valid-response "four"
          case-sensitive false
        ]
      ] {}
    ]
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
    item [
      questions [
        custom [
          lang "0166"
          stimulus "Use the spreadsheet to compute the column totals."
          model data use "0166"
        ]
      ] {}
    ]
  ] {}..
```
