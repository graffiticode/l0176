# L0176 vs. the Learnosity question-type documentation

A working checklist. L0176's builders and registries in
`packages/core/src/question-types.ts` were ported byte-for-byte from L0158 and had
never been read against Learnosity's own reference documentation. This records
what that comparison turned up, organised so we can settle it **one question type
at a time**.

Work a section, decide what (if anything) to change, then flip its **Status**.

**Status legend:** `unreviewed` · `reviewed` (looked at, nothing to do) · `fixed` ·
`wontfix` (understood and deliberately left).

## Constraint on any fix

L0176's compiled output passed a 117/117 golden-output parity gate against L0158.
Changing what an *existing* program emits breaks that gate. Prefer additive
changes — new optional attributes, newly-accepted values — and call it out
explicitly when a change alters existing output.

## Sources

The docs are cached at `~/work/learnosity/question-types-docs/` (51 articles,
retrieved 2026-08-20, regenerate with `node fetch.mjs`). Where the articles contradict *each
other* rather than contradicting L0176, the conflict is recorded in
`packages/core/spec/conflict-resolution.md` and referenced from here by number. Per-type sections below
name the file. Learnosity's public pages 403 non-browser clients; the cache came
from the Zendesk Help Center JSON API — see that folder's `README.md`.

Two articles carry more than their titles suggest:

- **`Chemistry-formula-chemistry.md`** is the only page with the complete
  `validation.*.value[].method` enumeration and its `options` sub-attributes. The
  math types reference these without listing them.
- **`Math-formula-Deprecated.md`** shows the predicate methods in use, emitted
  with **no `value` key**.

---

## Status

| Section | Status | Findings |
| --- | --- | --- |
| [Registries are declared but never enforced](#a-registries-are-declared-but-never-enforced) | **fixed** | 1 — enforced for all 13 types |
| [Author API widget list](#b-author-api-widget-list) | unreviewed | 1 |
| [Question metadata](#c-question-metadata) | **fixed** | 1 |
| [`spec/` accuracy](#d-spec-accuracy) | unreviewed | 2 |
| [`mcq`](#mcq--mcq) | **fixed** | — |
| [`shorttext`](#shorttext--shorttext) | **fixed** | — |
| [`longtext`](#longtext--longtextv2) | **fixed** | — |
| [`plaintext`](#plaintext--plaintext) | **fixed** | — |
| [`clozetext`](#clozetext--clozetext) | **fixed** | 1 (shared) — resolved for this type |
| [`clozeassociation`](#clozeassociation--clozeassociation) | **fixed** | 1 (shared) |
| [`clozedropdown`](#clozedropdown--clozedropdown) | **fixed** | 1 (shared) |
| [`clozeformula`](#clozeformula--clozeformulav2) | **fixed** | 4 — 1, 2 and 4 resolved; 3 is now the author's |
| [`choicematrix`](#choicematrix--choicematrix) | **fixed** | 1 |
| [`orderlist`](#orderlist--orderlist) | **fixed** | — |
| [`classification`](#classification--classification) | **fixed** | — |
| [`bowtie`](#bowtie--bowtie) | **fixed** | 2 |
| [`token-highlight`](#token-highlight--tokenhighlight) | **fixed** | — |
| [`custom`](#custom--custom) | unreviewed | — |

---

# Cross-cutting

## A. Registries are declared but never enforced

**Status:** unreviewed

Three declarations in `question-types.ts` describe validation that does not
happen. Nothing imports or reads any of them:

| Declaration | Line | Consumers |
| --- | --- | --- |
| `validAttributes` | `question-types.ts` | **the 8 converted types** — enforced in each builder; `mcq`, `classification`, `bowtie`, `token-highlight`, `clozeformula` and `custom` are still unchecked |
| `attributeFields[*].allowed` | `question-types.ts:901` | none |
| `attributeFields[*].valueType` | `question-types.ts:877-906` | none |

`compiler.ts` generates one Checker/Transformer method per entry of
`questionTypeBuilders` and `attributeFields` (`compiler.ts:217`, `:228`, `:503`,
`:524`) and reads only `meta.field` (`:544`). So:

- **Any attribute keyword can be attached to any question type.** The builder
  destructures the ones it knows and forwards everything else through `...rest`
  straight into the emitted question JSON. `stimulus … passage "x" (mcq {})` emits
  a `passage` field on an `mcq`.
- **`method` accepts any string.** `method "nonsense"` compiles and reaches
  `validation.valid_response.value[].method`.

The one attribute with real per-type gating is `partial-credit`, and it is
enforced imperatively in the builders via `PARTIAL_CREDIT_TYPES`
(`question-types.ts:99-120`) — not via `validAttributes`.

`CLAUDE.md:53` lists `validAttributes` as one of the registries the compiler is
driven by, which is not the case.

This matters for the rest of this document: several per-type findings below are
about entries in `validAttributes`. Those are wrong-as-documentation today, and
would become wrong-as-behaviour the moment the table is wired up.

**Options:** wire the tables into the Checker (this *adds* compile errors to
programs that currently compile — parity-safe for the golden set only if none of
them relied on the slack); or delete the dead fields and stop implying validation
that isn't there; or leave and annotate.

## B. Author API widget list

**Status:** unreviewed

`author.ts:18-41` hardcodes the `widgetTypes` offered by the Author Site. Seven of
the 23 entries do not name a current Learnosity type:

| Entry | Status per the docs |
| --- | --- |
| `fillintheblanks` | not a Learnosity type — no article, no slug |
| `clozeinlinetext` | not a Learnosity type — no article, no slug |
| `highlighttext` | not a Learnosity type (the deprecated one is `texthighlight`) |
| `longtext` | deprecated — current is `longtextV2` |
| `formula` | deprecated — current is `clozeformulaV2` |
| `imageclozeassociation` | deprecated — current is `imageclozeassociationV2` |
| `sortlist` | deprecated — cannot be newly authored from v2026.1.LTS |

The list also omits `bowtie`, which L0176 itself supports.

## C. Question metadata

**Status:** **fixed** — the join is gone and the documented fields are exposed

Learnosity documents `metadata.distractor_rationale_response_level` as
`array[string]` — one rationale per response — which is exactly L0176's
per-distractor use case. `translateQuestionMetadata`
(`question-types.ts:136-139`) instead joins the list into a single numbered string
in `metadata.distractor_rationale`.

**Resolved.** `distractor-rationale` now emits a single string unchanged, and
`distractor-rationale-response-level` is its own member taking the list — which is
what Learnosity documents for per-option intent, and was previously unreachable.
`sample-answer`, `rubric-reference` and `response-shuffle-seed` are exposed too.

Worth reflecting in `spec/`: Learnosity states the Questions API provides **no
built-in UI** for distractor rationale — the data is in the question JSON and the
host environment must render it.

## D. `spec/` accuracy

**Status:** unreviewed

1. `spec/instructions.md:250-311` ("Scoring math responses") documents four
   methods — `equivLiteral`, `equivSymbolic`, `equivValue`, `isSimplified`. The
   `METHOD` registry entry names eight, and Learnosity documents two more on top
   of that (see [`clozeformula`](#clozeformula--clozeformulav2)). Undocumented
   methods are unreachable in practice: the generator writes from `instructions.md`.
2. `spec/usage-guide.md:53` and `:94` say per-distractor rationale is shown "in
   the Author Site review pane". See [C](#c-question-metadata) — true of the
   Author Site, but the docs' caveat about the Questions API is worth carrying.

---

# Per question type

## `mcq` → `mcq`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Multiple-choice-mcq.md` · **Builder:** `question-types.ts:155` ·
**Attributes:** `question-types.ts:924`

No defect. Option shape `{label, value: "<index>"}` matches the documented default
("the option array index as a string"), and `validation.valid_response.value` is
`array[string]` as documented.

Documented and unexposed, for later: `min_selection` / `max_selection` (gated on
`multiple_responses`), `feedback_attempts`, `ui_style.type`
(`horizontal` / `block` / `horizontal-input-bottom`), `ui_style.choice_label`,
`ui_style.columns`, `ui_style.orientation`, `options[].assistive_label`.

## `shorttext` → `shorttext`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Short-text-shorttext.md` · **Builder:** `question-types.ts:206` ·
**Attributes:** `question-types.ts:925`

No defect.

Documented and unexposed: `character_map`, `spellcheck`,
`ignore_leading_and_trailing_spaces` (default `true`),
`validation.accent_sensitivity`, `validation.enable_fullwidth_scoring`, and
`validation.valid_response.matching_rule` — whose `"contains"` value matches a
correct word appearing as a distinct whole word anywhere in the response.

Note Learnosity's `max_length` default is 50 and its cap is 250; L0176 sets no
default for `shorttext` and passes the author's value straight through, so an
out-of-range value is Learnosity's to reject.

## `longtext` → `longtextV2`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Essay-with-rich-text-longtextV2.md` · **Builder:** `question-types.ts:251` ·
**Attributes:** `question-types.ts:926`

No defect. The keyword→slug remap is correct: bare `longtext` is the deprecated
type (see [B](#b-author-api-widget-list)).

Documented and unexposed: `formatting_options` (the toolbar), `show_word_limit`,
`show_word_count`, `submit_over_limit`, `character_map`, `disable_auto_link`, and
the Feedback Aide AI-scoring pair `validation.score_with_feedbackaide` /
`validation.feedbackaide_passages` (premium; needs `validation.rubric`).

## `plaintext` → `plaintext`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Essay-with-plain-text-plaintext.md` · **Builder:** `question-types.ts:276` ·
**Attributes:** `question-types.ts:927`

No defect.

Documented and unexposed: `show_copy` / `show_cut` / `show_paste`,
`show_word_limit`, `submit_over_limit`, `character_map`, `spellcheck`.

## `clozetext` → `clozetext`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Cloze-text-clozetext.md` · **Builder:** `question-types.ts:301` ·
**Attributes:** `question-types.ts:928`

### Finding: `stimulus` is written to `template`, and no `stimulus` is emitted

Shared with `clozeassociation`, `clozedropdown`, and `clozeformula`.

Learnosity documents these as two separate fields: `stimulus` is the prompt shown
above the response area, `template` is the passage carrying the `{{response}}`
blanks. Its own example sets both — `"stimulus": "fill in the blanks"` plus a
`template` table.

L0176 assigned the DSL's `stimulus` to `template` and never emitted a `stimulus`,
so a cloze question could not carry a prompt distinct from its passage.

**Resolved for `clozetext`, `clozeassociation` and `clozedropdown`.** Each now has
both attributes, emitting their own fields. Still open for `clozeformula`, which
is unconverted.

### What the conversion changed

- `stimulus` and `template` are separate attributes emitting their own fields.
- Scoring moved into a `validation` block mirroring Learnosity's object.
  `valid-response` takes one member list (`[score 1 value ["cat"]]`) because
  `valid_response` is one object; `alt-responses` takes a list of member lists
  because `alt_responses` is an array. `score` and `value` are arity-1 members,
  merged per L0169's `ASSESS` pattern.
- `partial-credit` and `alternative-response` are gone from this type.
  `scoring-type` is written directly, which also reaches `partialMatchV2` — a
  third mode the boolean could not express — and an unsupported value is now a
  compile error rather than a silent fallback to `exactMatch`.
- The whole documented attribute surface is exposed (19 attributes, up from 8),
  which cost nothing: an aligned attribute needs no builder code.
- `validAttributes.CLOZETEXT` is now **enforced**, so an attribute belonging to
  another type is rejected instead of riding `...rest` onto the question.

**Still open for this type.** `max_length` defaults to 15 characters per blank and
L0176 emits no default, so a generated question silently caps typed input — and
`spec/examples.md:59` asks for the answer "seat of government", 18 characters.
Documented now in `spec/`, but whether L0176 should emit a default is undecided:
doing so would inject a value the author did not write.

`metadata.distractor_rationale_response_level` remains unexposed — see
[C](#c-question-metadata).

## `clozeassociation` → `clozeassociation`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Cloze-with-drag-drop-clozeassociation.md` · **Builder:** `question-types.ts:338` ·
**Attributes:** `question-types.ts:929`

No defect beyond the shared `stimulus`/`template` finding under
[`clozetext`](#clozetext--clozetext). `possible_responses` is a flat
`array[string]` as documented (contrast `clozedropdown` below).

Documented and unexposed: `duplicate_responses`, `shuffle_options`,
`group_possible_responses`, `ui_style.possibility_list_position`,
`ui_style.show_drag_handle`, `max_response_per_zone`.

## `clozedropdown` → `clozedropdown`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Cloze-with-drop-down-clozedropdown.md` · **Builder:** `question-types.ts:373` ·
**Attributes:** `question-types.ts:930`

No defect beyond the shared `stimulus`/`template` finding under
[`clozetext`](#clozetext--clozetext). `possible_responses` is correctly
`array[array[string]]` — one array per drop-down, in order of appearance — and the
default at `question-types.ts:38` is correctly nested.

Documented and unexposed: `shuffle_options`, `case_sensitive`,
`match_all_possible_responses`, per-menu `response_containers` sizing/placeholder.
Note the response format returns `null` for an unanswered menu.

## `clozeformula` → `clozeformulaV2`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Math-clozeformulaV2.md` (the emitted type), `Cloze-math-clozeformula.md`
(the same-named older type), `Chemistry-formula-chemistry.md` (the method list) ·
**Builder:** `question-types.ts:428` · **Attributes:** `question-types.ts:931`

The densest section. Note first that the L0176 keyword and the Learnosity slug
disagree: `clozeformula` emits `type: "clozeformulaV2"` (`question-types.ts:442`),
which Learnosity calls **"Math"**. Learnosity's own `clozeformula` ("Cloze math")
is a different, older type L0176 does not emit.

### Finding 1: `METHOD.allowed` omits two documented methods

`question-types.ts:901` lists
`equivLiteral, equivSymbolic, equivValue, isSimplified, isFactorised, isExpanded, stringMatch, isUnit`.

Learnosity's enumeration (`Chemistry-formula-chemistry.md`) is
`equivSymbolic, equivLiteral, equivValue, stringMatch, equivSyntax, isTrue`.

`equivSyntax` and `isTrue` are documented and absent from L0176's list — and
`isTrue` appears in Learnosity's own `clozeformula` example. Conversely
`isSimplified`, `isFactorised`, `isExpanded` and `isUnit` are in L0176's list but
appear only on the deprecated `formula` / `formulaV2` pages and the Author Guide;
they are legacy math methods carried over from L0158, not currently enumerated.

Nothing enforces the list either way — see [A](#a-registries-are-declared-but-never-enforced).

Whether chemistry's six are *the* method set or *chemistry's* method set is unsettled and
tracked as **C1** in `packages/core/spec/conflict-resolution.md`. Do not widen or narrow
`METHOD.allowed` until that closes.

### Finding 2: value-less predicate methods cannot be expressed

`isTrue`, `isExpanded`, `isFactorised` and `isSimplified` are predicates on the
learner's response, not comparisons against an answer. Learnosity's examples emit
them with **no `value` key**:

```json
{ "method": "isTrue",     "options": { "decimalPlaces": 10 } }
{ "method": "isExpanded" }
```

`buildClozeformula` always emits `value: v` (`question-types.ts:453-462`), and the
rule is only constructed at all when `valid-response` is present
(`question-types.ts:452`). There is no way to author a predicate-only blank, and
`method "isSimplified"` — which `spec/instructions.md:311` actively recommends —
therefore emits a shape Learnosity does not document.

The most substantive finding in this document, and a design change rather than a
one-line fix: it needs a DSL spelling for "this blank is scored by a predicate".

### Finding 3: emitted scoring `options` are off-spec

L0176 emits, for every rule:

```json
"options": { "ignoreOrder": false, "setDecimalSeparator": ".",
             "setThousandsSeparator": [], "inverseResult": false }
```

`Math-clozeformulaV2.md` documents only `decimalPlaces` and `setDecimalSeparator`
for this type. `ignoreOrder` and `setThousandsSeparator` appear only in the
`multistepmath` example; `inverseResult` only on the `chemistry` page. All three
are real, just not documented for `clozeformulaV2`.

Tracked as **C2** in `packages/core/spec/conflict-resolution.md`, where the full split is laid
out: the `options` bag is documented as two disjoint sets and neither table matches its own
article's examples. C2 gates the `clozeformula` redesign.

Consequence worth noting: L0176 never sets `decimalPlaces`, so `equivValue` always
runs at Learnosity's default of 10 significant decimal places.

### Finding 4: shared `stimulus`/`template` collapse

See [`clozetext`](#clozetext--clozetext).

Documented and unexposed: `ui_style.type` (keypad style — L0176 hardcodes
`block-on-focus-keyboard`), `ui_style.response_font_scale`,
`ui_style.min_width`, `ui_style.keyboard_below_response_area`, `text_blocks`,
`horizontal_layout`, `math_image_capture`, and `hints` (v2025.1.LTS) — note
L0176 already emits `show_hints_button: true` (`question-types.ts:446`) without
ever emitting the `hints` object it controls.

## `choicematrix` → `choicematrix`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Choice-matrix-choicematrix.md` · **Builder:** `question-types.ts:515` ·
**Attributes:** `question-types.ts:932`

Mapping is correct: DSL `columns` → `options`, `rows` → `stems`, and
`validation.valid_response.value` is `array[array[number]]` of column indices per
row, as documented.

### Finding: `multiple-responses` is absent from the attribute table

Learnosity documents `multiple_responses` for `choicematrix` — it converts each
row's radios to checkboxes so a learner can select more than one option per row.
`validAttributes.CHOICEMATRIX` (`question-types.ts:932`) omits it, while
`MCQ` (`:924`) has it.

Because nothing enforces `validAttributes` ([A](#a-registries-are-declared-but-never-enforced)),
`multiple-responses true` on a `choicematrix` already works today — the builder
forwards it through `...rest`. So this is a documentation defect in a dead table,
not a functional restriction. It becomes a real one if the table is ever wired up.

Also unexposed: `ui_style.type` (`table` vs `inline`), `ui_style.stem_title`,
`ui_style.option_row_title`, `ui_style.stem_width` / `option_width`,
`ui_style.horizontal_lines`.

Related: Learnosity has a `nclex` sibling of this type (`nclexScoringByColumn` —
per-column tallies with a floor of zero) which L0176 does not expose, despite
supporting the NGN/NCLEX `bowtie`.

## `orderlist` → `orderlist`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Order-list-orderlist.md` · **Builder:** `question-types.ts:556` ·
**Attributes:** `question-types.ts:933`

No defect.

Documented and unexposed: `shuffle_options`, `ui_style.type`
(`button` / `list` / `inline`), `ui_style.show_drag_handle`. Learnosity also
documents a fourth scoring type for this widget, `partialMatchPairwise`, which
L0176's binary `partial-credit` cannot select.

*(Doc bug, not ours: the article's own example sets `"ui_style": "button"` as a
bare string while its attribute table declares `ui_style` an object.)*

## `classification` → `classification`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Classification-classification.md` · **Builder:** `question-types.ts:591` ·
**Attributes:** `question-types.ts:934`

No defect. `ui_style.column_count` / `column_titles` and the
`array[array[number]]` valid response indexed into `possible_responses` all match.

Documented and unexposed: `row_count` / `row_titles` / `row_header` (the 2-D grid
form — L0176 only ever emits a single row of columns), `max_response_per_cell`,
`duplicate_responses`, `shuffle_options`, `group_possible_responses`,
`ui_style.possibility_list_position`, `ui_style.show_drag_handle`.

Note this type has four partial-scoring modes (`partialMatch`,
`partialMatchV2`, `partialMatchElement`, `partialMatchElementV2`); L0176's
`partial-credit` always picks `partialMatch` (per cell).

## `bowtie` → `bowtie`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Bow-tie-bowtie.md` · **Builder:** `question-types.ts:682` ·
**Attributes:** `question-types.ts:935`

`possible_response_groups` (`title` + `responses`), `group_possible_responses`,
and `ui_style.column_titles` all match the documented shape.

### Finding 1: `max_response_per_cell` is emitted but undocumented for this type

`question-types.ts:710` emits `max_response_per_cell: 1`. The bowtie attribute
table does not list it — it belongs to `classification`. Inert or ignored, most
likely; carried over from L0158.

### Finding 2: the doc's own worked example does not decode

`Bow-tie-bowtie.md` shows groups of 5 / 2 / 5 responses (12 total, indices 0–11)
with `valid_response.value` of `[[0, 4], [7], [10, 12]]`. Under cumulative global
indexing the middle group occupies 5–6, so `[7]` is in the wrong group, and `12`
is out of range entirely.

L0176 computes cumulative offsets across the groups
(`question-types.ts:646`, `:677-679`), which is the coherent reading, and that
output already passed golden parity against L0158. **Recording only — do not
"fix" toward the example.**

Tracked as **C8** in `packages/core/spec/conflict-resolution.md`, which stays OPEN until a
bow-tie is rendered: a parity gate proves agreement with L0158, not with Learnosity.

Also note: the 2-1-2 answer shape L0176 enforces (`BOWTIE_AREA_COUNTS`,
`question-types.ts:635`) is not stated anywhere in the article — the docs say only
"an array with three elements representing each drop zone".

## `token-highlight` → `tokenhighlight`

**Status:** **fixed** — converted to the aligned vocabulary, 2026-08-20
**Docs:** `Token-highlight-tokenhighlight.md` · **Builder:** `question-types.ts:819` ·
**Attributes:** `question-types.ts:936`

No defect, and the closest match in the set. `tokenization: "custom"` plus
`<span class="lrn_token">…</span>` wrapping in `template`, with
`valid_response.value` as span indices in document order, is exactly what the
article specifies. `max_selection` matches. The `hot-text` → `token-highlight`
rename (`lexicon.ts:85`) aligns the keyword with the Learnosity widget name.

Learnosity's other `tokenization` values (`sentence`, `word`, `paragraph`) are
unreachable by design — L0176 always lists tokens explicitly.

## `custom` → `custom`

**Status:** unreviewed
**Docs:** `Custom-Draft.md` · **Builder:** `question-types.ts:737` ·
**Attributes:** *(no `validAttributes` entry)*

No defect. `custom_type`, `js.question`, `js.scorer` and `css` match the
documented shape. The extra `data` field L0176 emits is not a Learnosity attribute
but is consumed by the custom question's own JS, which is the point of the type.

Two notes: Learnosity labels this type **Draft**; and `CUSTOM` has no entry in
`validAttributes` at all — inconsequential today, see
[A](#a-registries-are-declared-but-never-enforced).

---

# Appendix — coverage

All 51 documented types. L0176 maps 14 of the 41 current types; 27 are unmapped.

Two mappings are not identity: `longtext` emits `longtextV2`, and `clozeformula`
emits `clozeformulaV2` — so Learnosity's own `clozeformula` ("Cloze math") is
*unmapped* despite the name collision.

| Learnosity type | slug | L0176 keyword |
| --- | --- | --- |
| Audio recorder | `audio` | — |
| Bow-tie | `bowtie` | `bowtie` |
| Chart | `simplechart` | — |
| Chemistry essay with rich text | `chemistryessayV2` | — |
| Chemistry formula | `chemistry` | — |
| Choice matrix | `choicematrix` | `choicematrix` |
| Choice matrix with NCLEX Scoring | `nclex` | — |
| Classification | `classification` | `classification` |
| Cloze chemistry | `clozechemistry` | — |
| Cloze chemistry with image | `imageclozechemistry` | — |
| Cloze math | `clozeformula` | — |
| Cloze math with image | `imageclozeformula` | — |
| Cloze text | `clozetext` | `clozetext` |
| Cloze with drag & drop | `clozeassociation` | `clozeassociation` |
| Cloze with drop down | `clozedropdown` | `clozedropdown` |
| Custom *(draft)* | `custom` | `custom` |
| Drawing | `drawing` | — |
| Essay with plain text | `plaintext` | `plaintext` |
| Essay with rich text | `longtextV2` | `longtext` |
| File upload | `fileupload` | — |
| Graph plotting | `graphplotting` | — |
| Gridded | `gridded` | — |
| Hotspot | `hotspot` | — |
| Image annotation upload | `imageupload` | — |
| Label image with drag & drop | `imageclozeassociationV2` | — |
| Label image with drop down | `imageclozedropdown` | — |
| Label image with math | `imageclozeformulaV2` | — |
| Label image with text | `imageclozetext` | — |
| Match list | `association` | — |
| Math | `clozeformulaV2` | `clozeformula` |
| Math essay with rich text | `formulaessayV2` | — |
| Multiple choice | `mcq` | `mcq` |
| Multi-Step Math | `multistepmath` | — |
| Number line | `numberline` | — |
| Number line plot | `numberlineplot` | — |
| Order list | `orderlist` | `orderlist` |
| Rating | `rating` | — |
| Shading | `simpleshading` | — |
| Short text | `shorttext` | `shorttext` |
| Token highlight | `tokenhighlight` | `token-highlight` |
| Video recorder | `video` | — |
| Chemistry essay *(deprecated)* | `chemistryessay` | — |
| Fill shape *(deprecated)* | `fillshape` | — |
| Formula essay *(deprecated)* | `formulaessay` | — |
| Image association *(deprecated)* | `imageclozeassociation` | — |
| Image highlight *(deprecated)* | `highlight` | — |
| Long text essay *(deprecated)* | `longtext` | — |
| Math formula *(deprecated)* | `formula` | — |
| Math formula v2 *(deprecated)* | `formulaV2` | — |
| Sort list *(deprecated)* | `sortlist` | — |
| Text highlight *(deprecated)* | `texthighlight` | — |
