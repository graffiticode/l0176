<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Dialect L0176 Specific Instructions

L0176 is a Graffiticode dialect for building Learnosity assessment integrations.
It compiles programs into Learnosity API requests (Items, Questions, Author APIs)
and renders them via a React frontend.

## L0176 Specific Guidelines

- **CRITICAL**: The first line of every program MUST be exactly `set-var "lrn-id" get-val-public "itemId"`. This captures the caller-supplied item ID. NEVER use `set-var "lrn-id" ""` or any other value — the program will fail if `lrn-id` is empty. Copy this line verbatim from the template; do not simplify or omit `get-val-public "itemId"`.
- Use `items` to create Items API requests for rendering assessments
- Use `item` to define individual items when building a list for `items`
- Use `questions` as a chainable attribute to set questions on an item
- Use `features` as a chainable attribute to set features on an item (placeholder)
- Use `layout` as a chainable attribute to set the HTML template for an item (placeholder)
- Use `author` to create Author API requests for item authoring
- Use `init` to initialize a Learnosity API session by type
- Use `hello` to display simple text output: `hello "Hello, world!"..`
- `items` always takes a list of `item` objects: `items [item questions [...] {}]..`
- When an assessment has multiple questions, place all questions in the same `item` rather than creating separate items: `items [item questions [mcq {}, shorttext {}] {}]..`

### Question Type Functions

Instead of writing raw Learnosity JSON, use the question type functions which
provide a higher-level interface with sensible defaults:

- `mcq` — Multiple choice questions
- `shorttext` — Short typed responses
- `longtext` — Rich text essays (manually scored)
- `plaintext` — Plain text essays (manually scored)
- `clozetext` — Fill-in-the-blank with typed responses
- `clozeassociation` — Fill-in-the-blank with drag and drop (use `possible-responses`, not `options`)
- `clozedropdown` — Fill-in-the-blank with dropdown select (use `possible-responses`, not `options`)
- `clozeformula` — Fill-in-the-blank with math/formula input
- `choicematrix` — Grid of options by stems
- `orderlist` — Drag items into correct order
- `classification` — Sort items into categories
- `bowtie` — NGN/NCLEX bow-tie: 2-1-2 drag-and-drop (actions, condition, monitor)
- `hot-text` — Highlight tokens in a passage (synonym: `token-highlight`). List correct tokens with `valid-response` and clickable wrong ones with `distractors`
- `custom` — Embed a separately deployed Graffiticode-language interaction (e.g. an L0166 spreadsheet). Set the interaction payload with the chained `model` attribute (preferred); see Pipeline Composition

Each function takes a record built from chainable attribute keywords.
All attributes have defaults, so `mcq {}` produces a complete question.

### Question Type Templates

- `mcq` — Multiple choice:
  ```
  mcq
    stimulus "What is 2 + 2?"
    options ["3", "4", "5"]
    valid-response [1]
    {}
  ```

- `shorttext` — Short typed response:
  ```
  shorttext
    stimulus "What is the capital of France?"
    valid-response "Paris"
    {}
  ```

- `longtext` — Rich text essay (manually scored):
  ```
  longtext
    stimulus "Explain the water cycle."
    max-length 500
    placeholder "Start writing here..."
    {}
  ```

- `plaintext` — Plain text essay (manually scored):
  ```
  plaintext
    stimulus "Describe your favorite book."
    max-length 300
    placeholder "Start writing here..."
    {}
  ```

- `clozetext` — Fill-in-the-blank with typed responses:
  ```
  clozetext
    stimulus "The {{response}} is the powerhouse of the cell."
    valid-response ["mitochondria"]
    {}
  ```

- `clozeassociation` — Fill-in-the-blank with drag and drop (use `possible-responses`, not `options`):
  ```
  clozeassociation
    stimulus "Drag the correct {{response}} here."
    possible-responses ["correct", "incorrect", "maybe"]
    valid-response ["correct"]
    {}
  ```

- `clozedropdown` — Fill-in-the-blank with dropdown select (use `possible-responses`, not `options`; each blank gets its own list):
  ```
  clozedropdown
    stimulus "Select the correct {{response}}."
    possible-responses [["correct", "incorrect", "maybe"]]
    valid-response ["correct"]
    {}
  ```

- `clozeformula` — Fill-in-the-blank with math/formula input:
  ```
  clozeformula
    stimulus "Solve: \\(x + 3 = 7\\). \\(x =\\) {{response}}"
    valid-response ["4"]
    method "equivLiteral"
    {}
  ```

- `choicematrix` — Grid of options by stems:
  ```
  choicematrix
    stimulus "Select the correct answer for each row."
    rows ["Statement 1", "Statement 2"]
    columns ["True", "False"]
    valid-response [[0], [1]]
    {}
  ```

- `orderlist` — Drag items into correct order:
  ```
  orderlist
    stimulus "Arrange in order."
    list ["First", "Second", "Third", "Fourth"]
    valid-response [0, 1, 2, 3]
    {}
  ```

- `classification` — Sort items into categories (use `possible-responses` for the draggable items, `categories` for column headings):
  ```
  classification
    stimulus "Sort the animals"
    possible-responses ["Dog", "Snake", "Cat", "Lizard"]
    categories ["Mammals", "Reptiles"]
    valid-response [[0, 2], [1, 3]]
    {}
  ```

- `bowtie` — NGN/NCLEX bow-tie. Three source pools feed three drop zones
  in a 2-1-2 layout. `column-titles` labels both the source pools and the
  drop zones. `possible-responses` is a list of three lists (one per column),
  and `valid-response` is three lists of option *strings* (2-1-2) that the
  compiler resolves against each column's pool. A bow-tie whose
  `valid-response` is not 2-1-2, whose strings don't appear in the matching
  pool, or whose pools are too small is rejected at compile time:
  ```
  bowtie
    stimulus "65-year-old with chest pain and diaphoresis."
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

- `hot-text` — Highlight tokens in a passage (synonym: `token-highlight`).
  List the correct clickable tokens with `valid-response` and the
  clickable-but-wrong ones with `distractors`; only listed tokens are
  clickable. The compiler wraps each whole-word occurrence in
  `<span class="lrn_token">` and scores correct tokens by span index. Matching
  is case-insensitive and whole-word; a repeated correct token is scored at
  every occurrence. Optional `max-selection` caps the learner's selections. A
  token not present in the passage, or one listed in both `valid-response` and
  `distractors`, is rejected at compile time:
  ```
  hot-text
    stimulus "Highlight the verbs."
    passage "The cat runs then jumps high."
    valid-response ["runs", "jumps"]
    distractors ["cat", "high"]
    max-selection 2
    {}
  ```

- `custom` — Embed a separately deployed Graffiticode-language interaction.
  `lang` is required and identifies the deployed interaction (the compiler
  synthesizes URLs and `custom_type` from `https://l<lang>.graffiticode.org/...`).
  Set the interaction payload with the chained `model` attribute — `model`
  is JSON-stringified for Learnosity (records → string, strings → passthrough).
  Scoring is the deployed interaction's own concern — do not add
  `valid-response`. When the item draws content from an upstream pipeline
  node, read it with `data use "<lang>"` (preferred) or `data {default}`
  and pass to `model` (see Pipeline Composition):
  ```
  custom
    lang "0166"
    stimulus "Use the spreadsheet to compute the column totals."
    model data use "0166"
    {}
  ```

### Math Notation

Wrap mathematical notation in the LaTeX inline-math delimiters `\\(` and `\\)`
so Learnosity typesets it with MathJax. Apply this to math wherever it is
displayed — `clozeformula` stems, math MCQ stimuli and options, and any other
text that contains an expression.

Backslashes are escaped inside DSL string literals, so write every backslash
doubled: `\\(` and `\\)` for the delimiters, and `\\times`, `\\frac`, `\\sqrt`,
etc. for LaTeX commands. The compiler unescapes each `\\` to a single `\`, so
the string Learnosity receives is `\(3 \times 4\)`, which MathJax then renders.

Keep response areas outside the delimiters. A cloze `{{response}}` blank is an
answer-entry slot, not notation to typeset, so leave it unwrapped and wrap the
surrounding expression instead. Dynamic-data `{{col}}` placeholders that stand
in for values within an expression belong inside the delimiters with the rest
of the math.

Whenever a question contains LaTeX, chain `is-math true` onto that question so
Learnosity loads MathJax and renders the `\\( … \\)` expressions. The `is-math`
attribute is an arity-2 boolean valid on every built-in question type
(`clozeformula` sets it automatically). Example:

```
mcq
  stimulus "Which product equals \\(3 \\times 4\\)?"
  options ["\\(10\\)", "\\(12\\)", "\\(14\\)"]
  valid-response [1]
  is-math true
  {}
```

```
clozeformula
  stimulus "Solve: \\(x + 3 = 7\\). \\(x =\\) {{response}}"
  valid-response ["4"]
  method "equivLiteral"
  {}
```

### Metadata

L0176 supports a `metadata` block at two levels: on `item` (for fields the
Learnosity Author Site indexes for search) and on each question constructor
(for fields that travel with the interaction). Both are optional and can
appear independently — items without metadata work exactly as before.

`metadata` takes a list whose members are arity-1 constructor calls
(`tags`, `notes`, `acknowledgements`, `distractor-rationale`,
`description`, `source`, `difficulty-level`). Each member tags its
payload with a kind so the compiler can route faceted fields to `tags`
and free-form fields to `metadata` in the Learnosity output.

#### Item-level metadata

Place a `metadata` block alongside `questions` inside an `item` chain. These
list members are recognized:

- `tags` — record mapping tag type to value, where each value is a string
  or an array of strings (a bare string is normalized to a single-element
  array). Faceted conventions like `Difficulty` and `DOK` go here (e.g.
  `tags { Difficulty: "medium", DOK: 2 }`) because Learnosity has no
  dedicated fields for them. Example:
  `tags { NGSS: "MS-LS1-2", "Common Core": ["Math:6.NS.A.1"] }`.
- `notes` — author-facing note attached to the item. Emitted as the
  item's top-level `note` field (what the Author Site item details
  page's Notes field reads from).
- `description` — short item description. Emitted as the item's
  top-level `description` field (Description field on the item details
  page).
- `source` — source/attribution string. Emitted as the item's top-level
  `source` field (Source field on the item details page).
- `difficulty-level` — integer Rasch calibration for adaptive sessions.
  Emitted as `adaptive.difficulty`, backing the Difficulty level spinner
  on the item details page. Distinct from the faceted `Difficulty` tag,
  which is a text label (e.g. `"medium"`) used for filtering.
- `acknowledgements` — attribution string. Emitted as
  `metadata.acknowledgements`.

```
items [
  item
    metadata [
      tags { NGSS: "MS-LS1-2", Difficulty: "medium", DOK: 2, topic: "cellular-respiration" }
      notes "Variant A of the organelle misconception set"
    ]
    questions [
      mcq
        stimulus "What is the primary function of the mitochondria?"
        options [
          "To produce energy (ATP) through cellular respiration"
          "To control what enters and exits the cell"
          "To build proteins using genetic instructions"
          "To store and protect the cell's DNA"
        ]
        valid-response [0]
        {}
    ]
    {}
]..
```

#### Question-level metadata

Place a `metadata` block inside any question constructor's chain, alongside
`stimulus`, `options`, etc. These list members are recognized:

- `distractor-rationale` — a string, or a list of strings (one per option).
  A list is joined into a numbered multi-line string (`"1. ...\n2. ..."`)
  so the Author Site's single Distractor Rationale field displays the
  per-option intent in place.
- `acknowledgements` — attribution string.

```
mcq
  stimulus "What is the primary function of the mitochondria?"
  options [
    "To produce energy (ATP) through cellular respiration"
    "To control what enters and exits the cell"
    "To build proteins using genetic instructions"
    "To store and protect the cell's DNA"
  ]
  valid-response [0]
  metadata [
    distractor-rationale [
      "Correct — ATP production via cellular respiration."
      "That's the role of the cell membrane."
      "That's the role of ribosomes."
      "That's the role of the nucleus."
    ]
    notes "Targets the three most common organelle confusions."
  ]
  {}
```

#### Both levels in one item

```
items [
  item
    metadata [
      tags { NGSS: "MS-LS1-2", Difficulty: "medium", DOK: 2 }
    ]
    questions [
      mcq
        stimulus "..."
        options [...]
        valid-response [0]
        metadata [
          distractor-rationale ["..." "..." "..." "..."]
        ]
        {}
    ]
    {}
]..
```

#### Conventions

- **Tag values** are plain strings. When one tag type has multiple values,
  pass an array (e.g., `tags { NGSS: ["MS-LS1-2", "MS-LS1-6"] }`); for a
  single value, a bare string is accepted for readability.
- **Distractor-rationale list length** should match the number of options.
- **Use item-level `tags` for faceted fields** (standards, Difficulty,
  DOK, subject, etc.) — these drive Author Site search and filtering.
- **Use question-level metadata for per-interaction fields**
  (`distractor-rationale`, `acknowledgements`, question `notes`). These
  travel with the question if it is reused in a different item.

### Attribute Chaining

Attributes are arity-2 functions that chain together, terminated by `{}`:

```
mcq
  stimulus "What is 2 + 2?"
  options ["3", "4", "5"]
  valid-response [1]
  instant-feedback true
  {}
```

Common attributes: `stimulus`, `options`, `valid-response`, `instant-feedback`,
`is-math`, `shuffle-options`, `multiple-responses`, `case-sensitive`,
`max-length`, `max-word-count`, `placeholder`, `possible-responses`, `rows`,
`columns`, `list`, `categories`, `method`.

### Save to Item Bank vs. Preview

By default, `items [...]` produces a **preview**: the item and its questions
render inline through Questions API without being written to the Learnosity
item bank. This is the right default for AI-authored items — the human can
eyeball the preview before deciding to persist.

Chain `save-to-itembank true` onto the items continuation to persist the
item and its questions to the Learnosity item bank. Saved items always land
as `status: "unpublished"` (draft); publishing is done from the Learnosity
Author Site UI, not from the DSL.

Writing to the item bank requires caller-supplied Learnosity credentials.
Set both with `set-var` before `items`:

```
set-var "learnosity-key" get-val-public "learnosity-key"
set-var "learnosity-secret" get-val-private "learnosity-secret"
```

Use these exact credential field names: `learnosity-key` (public) and
`learnosity-secret` (private). They are the stored credential fields, named
`<backend>-<field>`, so always pass them in that kebab-case form — never
camelCase (`learnosityKey`/`learnositySecret`) or other spellings.

The two must be supplied **together** — providing only one is an error. When
present they are used to sign every Learnosity request (preview rendering and
the bank write); when absent, previews fall back to the server's default
credentials. `save-to-itembank true` without these credentials is an error:
the default credentials may sign previews but never mutate the bank.

Prompts that should trigger `save-to-itembank true`:

- "save it to the item bank" / "write to the bank" / "persist it" → include
  `save-to-itembank true` and the credential `set-var` lines above.
- No such phrasing → preview-only; omit the attribute (and the credentials).

Example — save as draft:

```
set-var "lrn-id" get-val-public "itemId"
set-var "learnosity-key" get-val-public "learnosity-key"
set-var "learnosity-secret" get-val-private "learnosity-secret"
learnosity
  items [
    item
      questions [mcq stimulus "Which planet is closest to the Sun?"
        options ["Mercury", "Venus", "Earth", "Mars"]
        valid-response [0] {}]
      {}
  ]
  save-to-itembank true
  {}..
```

### Pipeline Composition

When the prompt asks for an item whose content comes from another
Graffiticode language, emit a `custom` question whose `model` attribute
reads the upstream pipeline node via the base-language `data` primitive.

**REQUIRED — the binding is not optional.** Every `custom` question that
embeds an upstream interaction MUST include a `model data use "<lang>"`
attribute, with `<lang>` equal to that `custom`'s own `lang`. The `model`
line is what wires the upstream content in: a `custom` question that has
`lang` and `stimulus` but omits `model data use` renders an EMPTY
interaction and is invalid output. Emit all three — `lang`, `stimulus`,
and `model data use "<lang>"` — every time. Use the `data use "<lang>"`
form (not the bare `data {default}` fallback) whenever you know the
upstream language, so the console can reactively generate and chain the
upstream task.

**Composable upstreams.** Map the content type to the correct upstream
language id; use that id consistently as both the `lang` on the surrounding
`custom` and the argument to `use`:

| If the prompt asks for… | Upstream lang |
| :--- | :--- |
| Spreadsheet content ("spreadsheet question", "use this sheet", "table-based assessment") | `0166` |
| Concept-web assessment ("concept web", "concept map", "node-and-edge concept assessment") | `0169` |

If the prompt's content type doesn't fit any row above, do not invent
an upstream — emit a question type that L0176 authors directly (mcq,
shorttext, etc.) or, if the request is fundamentally out of L0176's
scope, emit `OUT_OF_SCOPE: <reason>` and let the router suggest the
right dialect.

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

- **`data use "<lang>"`** (preferred). Inherits from the base language.
  The `use` annotation declares the upstream language id; the console
  reads it at write time, fetches `L<lang>/schema.json`, generates the
  upstream task, and chains it. At runtime, `data` returns the upstream's
  compiled output if a producer is wired, or `{}` otherwise.
- **`data {default}`** (untyped fallback). Same runtime semantics but
  without the language hint, so the console will not auto-discover an
  upstream — the chain must be assembled manually in the pipeline editor.
  Use a small skeleton matching the interaction's expected shape so the
  program also renders in preview without an upstream.
- The `lang` on the surrounding `custom` should match the `use` argument.
- The pipeline edge can be assembled reactively from the `use` hint or
  set manually in the console's pipeline editor. Source code never
  references upstream task IDs directly.
- One L0176 program has at most one upstream. Multiple `custom` questions
  in the same program all read the same upstream value. If the prompt
  needs distinct upstreams per question, that's multiple L0176 programs.
- Scoring is the deployed interaction's `scorer.js` — do not add
  `valid-response` for `custom` questions.
- **Before finishing a composed item, verify every `custom` question has a
  `model data use "<lang>"` line whose argument equals its `lang`.** A
  dropped `model` binding is the single most common composition error and
  produces a silently empty interaction — never emit a `custom` without it.
- `save-to-itembank true` freezes the upstream value at compile time into
  the saved item. The bank entry is a snapshot, not a live reference;
  edits to the upstream after save do not propagate. If the prompt asks
  to "save a live spreadsheet question to the bank", clarify or fall back
  to preview-only.

### Dynamic Data

Learnosity items can carry a table of variable values; each session
substitutes one row into the question text via `{{colname}}` placeholders.

- Embedding an L0166 custom question whose compiled output includes
  `templateVariablesRecords` automatically routes those rows into the
  item's `dynamic_content_data`. No extra keyword needed — just reference
  the variables in stems with `{{A1}}`-style placeholders.
- To declare a table directly (no L0166 upstream), chain the
  item-level `params` keyword with a list of row records:

  ```
  set-var "lrn-id" get-val-public "itemId"
  learnosity
    items [
      item
        params [
          { A1: "50", A2: "25" }
          { A1: "100", A2: "75" }
        ]
        questions [
          shorttext stimulus "What is {{A1}} + {{A2}}?" {}
        ]
        {}
    ] {}..
  ```

- If both forms are present on the same item, the inherited L0166 table
  wins. Don't mix them unless the prompt explicitly asks for a fallback.

## Example Patterns

- Simple MCQ assessment:
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
            {}
        ]
        {}
    ] {}..
  ```

- MCQ with all defaults:
  ```
  set-var "lrn-id" get-val-public "itemId"
  learnosity items [item questions [mcq {}] {}] {}..
  ```

- Multiple items:
  ```
  set-var "lrn-id" get-val-public "itemId"
  learnosity
    items [
      item questions [mcq {}] {},
      item questions [shorttext {}] {}
    ] {}..
  ```

- Fill-in-the-blank:
  ```
  set-var "lrn-id" get-val-public "itemId"
  learnosity
    items [
      item
        questions [
          clozetext
            stimulus "The {{response}} is the powerhouse of the cell."
            valid-response ["mitochondria"]
            {}
        ]
        {}
    ] {}..
  ```

- Math question:
  ```
  set-var "lrn-id" get-val-public "itemId"
  learnosity
    items [
      item
        questions [
          clozeformula
            stimulus "Solve: \\(x + 3 = 7\\). \\(x =\\) {{response}}"
            valid-response ["4"]
            method "equivLiteral"
            {}
        ]
        {}
    ] {}..
  ```

- Multiple questions in one item:
  ```
  set-var "lrn-id" get-val-public "itemId"
  learnosity
    items [
      item
        questions [
          mcq
            stimulus "Pick one"
            options ["A", "B", "C"]
            valid-response [0]
            {},
          shorttext
            stimulus "Type the answer"
            valid-response "answer"
            {}
        ]
        {}
    ] {}..
  ```

- Spreadsheet question reading an upstream L0166 task:
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

- Initialize an items session:
  ```
  init { "type": "items" }..
  ```

- Author mode for editing items:
  ```
  author { "mode": "item_edit" }..
  ```
