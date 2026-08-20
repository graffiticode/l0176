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
| `classification` | 1 | `classification` | Drag items into a grid of cells |
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
| `columns` | string[] | `options` | choicematrix |
| `list` | string[] | `list` | orderlist |
| `column-titles` | string[] | `ui_style.column_titles` + `possible_response_groups[].title` | bowtie |
| `passage` | string | `template` (with `lrn_token` spans injected) | token-highlight |
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
| `distractor-rationale` | string | question | Emitted as `metadata.distractor_rationale`, unchanged. |
| `distractor-rationale-response-level` | string[] | question | Emitted as `metadata.distractor_rationale_response_level` — one rationale per response, which is the field Learnosity documents for per-option intent. |
| `rubric-reference` | string | question | Identifier of the rubric to use. |
| `sample-answer` | string | question | Shown in Reports API. |
| `response-shuffle-seed` | string | question | mcq only; fixes the shuffled option order across learners. |
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

Select one or more answers from a list. Each option is a `{label, value}` object:
the label is shown, the value is what a response records, so it is yours to
choose. `valid-response` lists the values of the correct options.

```
mcq [
  stimulus "Which planet is closest to the Sun?"
  options [
    [label "Mercury" value "mercury"]
    [label "Venus" value "venus"]
    [label "Earth" value "earth"]
  ]
  instant-feedback true
  validation [
    valid-response [score 1 value ["mercury"]]
  ]
]
```

Set `multiple-responses true` to turn the radio buttons into checkboxes, then
`min-selection` / `max-selection` to bound how many may be picked.

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

Math input into one or more response boxes. The keyword is `clozeformula` but the
emitted type is `clozeformulaV2` — Learnosity calls it "Math"; its own
`clozeformula` ("Cloze math") is an older, different type.

This is the deepest nesting in the language. `validation.valid_response.value` is
an array per blank of arrays of **rule objects**, each with a `method`, usually a
`value`, and optionally `options`:

```
clozeformula [
  stimulus "It takes 25 minutes to walk and 45 to drive."
  template "{{response}} minutes = {{response}} hour and {{response}} minutes"
  is-math true
  ui-style [type "block-on-focus-keyboard"]
  validation [
    scoring-type "exactMatch"
    valid-response [
      score 1
      value [ [[method "equivLiteral" value "70"]]
              [[method "equivValue" value "1" options [decimal-places 2]]]
              [[method "equivLiteral" value "10"]] ]
    ]
  ]
]
```

A rule may carry a `method` and no `value` at all — `isExpanded`, `isSimplified`
and `isTrue` are predicates on the response rather than comparisons against an
answer.

Accepting several different expressions for one blank is what `alt-responses` is
for: each entry is a complete answer set covering every blank.

```
clozeformula [
  template "Simplify 4/8: {{response}}"
  validation [
    valid-response [value [[[method "equivLiteral" value "1/2"]]]]
    alt-responses [[value [[[method "equivLiteral" value "0.5"]]]]
                   [value [[[method "equivLiteral" value "2/4"]]]]]
  ]
]
```

Notation never needs enumerating — `1/2`, `1 / 2` and `\frac{1}{2}` are one
expression under every method. Only genuinely different expressions do.

#### Methods and options are not checked

Nothing constrains `method` or the keys of `options`, deliberately. The
documentation does not settle either question: the full method list appears on
exactly one of Learnosity's 51 articles, and the `options` bag is documented as
two disjoint sets with neither matching its own examples. See C1 and C2 in
`conflict-resolution.md`. Rather than encode a guess, the compiler passes both
through and the author writes what Learnosity accepts.

Note the `options` keys are camelCase — `decimal-places` emits `decimalPlaces` —
alone among Learnosity's fields.

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

Drag items into a grid of cells. The layout lives in `ui-style`, where Learnosity
puts it: `column-count` and `column-titles`, plus `row-count` and `row-titles` for
a two-dimensional grid. `valid-response`'s value is one array of
`possible-responses` indices per cell, in reading order.

```
classification [
  stimulus "Sort the animals into the correct categories."
  possible-responses ["Dog", "Snake", "Cat", "Lizard"]
  ui-style [
    column-count 2
    column-titles ["Mammals", "Reptiles"]
  ]
  validation [
    valid-response [score 1 value [[0, 2], [1, 3]]]
  ]
]
```

`possible-responses` is absent from Learnosity's own attribute table for this
type even though the type cannot work without it — see C9 in
`conflict-resolution.md`.

### bowtie

A Next-Gen NCLEX bow-tie: source pools feed the drop zones of a bow-tie diagram.
`possible-response-groups` gives each pool a `title` and its `responses`, and
`ui-style` carries the `column-titles` shown above the drop zones.

`valid-response`'s value is one array of indices per drop zone, indexing into the
groups flattened in order — so with pools of 4, 3 and 4, the second pool occupies
indices 4 to 6.

```
bowtie [
  stimulus "65-year-old male presents with chest pain and diaphoresis."
  group-possible-responses true
  possible-response-groups [
    [title "Actions to Take"
     responses ["give aspirin", "give nitro", "call cardiology", "obtain 12-lead ECG"]]
    [title "Condition Most Likely"
     responses ["myocardial infarction", "pulmonary embolism", "pericarditis"]]
    [title "Parameters to Monitor"
     responses ["ST segment changes", "blood pressure", "troponin", "respiratory rate"]]
  ]
  ui-style [
    column-titles ["Actions to Take", "Condition Most Likely", "Parameters to Monitor"]
  ]
  validation [
    valid-response [score 1 value [[0, 3], [4], [7, 9]]]
  ]
]
```

Nothing checks those indices. Learnosity documents no numbering scheme beyond
"an array with three elements representing each drop zone", and the indices in
its own worked example do not decode under any scheme — see C8 in
`conflict-resolution.md`. Until a bow-tie has been rendered and inspected, a
wrong index produces a wrong question silently.

### token-highlight

The learner clicks words, sentences or paragraphs in a passage. `template` is the
passage with each clickable token wrapped in `<span class="lrn_token">`, and
`valid-response`'s value is the indices of the correct spans in document order,
counting from zero.

```
token-highlight [
  stimulus "Highlight the verbs."
  template "The <span class=\"lrn_token\">cat</span> <span class=\"lrn_token\">runs</span> then <span class=\"lrn_token\">jumps</span>."
  tokenization "custom"
  validation [
    scoring-type "partialMatch"
    valid-response [score 1 value [1, 2]]
  ]
]
```

`tokenization` selects how the passage is split: `"custom"` honours the spans you
wrote, while `"word"`, `"sentence"` and `"paragraph"` let Learnosity split the
passage for you, in which case the template needs no spans at all.

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
