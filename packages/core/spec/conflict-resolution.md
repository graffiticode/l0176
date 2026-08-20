<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0176 conflict register — where the Learnosity docs disagree, and what was done about it

L0176 compiles to Learnosity Question JSON, so its correctness is downstream of a
documentation set that contradicts itself in places. This file records every point where the
question-type articles disagree with each other, with their own examples, or with L0176's
observed output — what the resolution was, and, where nothing resolved it, that it is still
open.

Two rules govern this file. **An unresolved conflict stays unresolved in writing.** Picking the
tidier reading and moving on is how a compiler acquires a confident wrong field. And **a
resolution records what settled it**, so a later reader can overturn it with better evidence
instead of re-litigating it from scratch.

Sources are the 51 question-type articles cached at `~/work/learnosity/question-types-docs/`
(retrieved 2026-08-20; that folder's `README.md` says how). Where an entry cites an article it
means that file.

This register is about the *sources*. Where L0176 itself diverges from documentation that is
internally consistent, that belongs in `docs/learnosity-audit.md`, which is worked one question
type at a time.

## How conflicts get resolved, in precedence order

1. **Live measurement beats documentation.** Scoped to what was actually rendered — see the
   caveat at the end, which currently swallows most of this rule.
2. **The attribute table beats the worked example beats the prose.** The tables are
   specifications. The examples are demonstrably copied between articles (C3), and the
   introductory prose drifts.
3. **Two articles that disagree are often both right about different types.** Look for a
   discriminator before declaring a conflict — Learnosity's type family is full of near-twins
   (`clozeformula` vs `clozeformulaV2`, `longtext` vs `longtextV2`) whose docs differ because
   the types differ.
4. **Otherwise, mark it OPEN** and say what L0176 should do in the meantime.

## Register

| # | Conflict | Status |
| :-: | :--- | :--- |
| C1 | The scoring-method enumeration exists on exactly one article | OPEN |
| C2 | `validation.*.options` is documented as two disjoint sets | OPEN — load-bearing |
| C3 | Four articles' examples declare a sibling question type | RESOLVED — table wins |
| C4 | `alt_responses[ ][ ]` documents a shape that does not exist | RESOLVED — artifact |
| C5 | `orderlist`'s example contradicts its own `ui_style` table | RESOLVED — table wins |
| C6 | `custom`'s response `type` is boilerplate from another article | RESOLVED — table loses |
| C7 | `distractor_rationale_response_level` is typed three ways | RESOLVED — refinement |
| C8 | The bow-tie example's indices do not decode | OPEN — needs a render |
| C9 | `classification` omits `possible_responses` from its own table | RESOLVED — omission |

---

### C1 — The scoring-method enumeration exists on exactly one article · OPEN

`Chemistry-formula-chemistry.md` documents `validation.valid_response.value[].method` with a
*Possible values* list of six: `equivSymbolic`, `equivLiteral`, `equivValue`, `stringMatch`,
`equivSyntax`, `isTrue`. It is the **only** article in the corpus that enumerates them —
`equivSyntax` appears in one file of 51.

Eleven articles document a `method` field. Nine of them are the math and chemistry types —
`clozeformula`, `clozeformulaV2`, `imageclozeformula`, `imageclozeformulaV2`, `clozechemistry`,
`imageclozechemistry`, `multistepmath`, and the deprecated `formula` and `formulaV2` — and every
one gives only `Default: "equivLiteral"` with no enumeration at all.

The remaining two document a `method` from an entirely different vocabulary: `simpleshading`
takes `byLocation` or `byCount`, `fillshape` takes `countByValue`. So `method` is already known
to be per-family rather than global, which is exactly the reading that would make chemistry's
list chemistry's own.

**Why it is not resolved.** Precedence rule 3 cuts both ways here. Either the six are the
method set and the other nine articles simply omit the list, or they are *chemistry's* method
set and the math types accept a different one. Nothing in the corpus discriminates, and the
evidence is mixed: the deprecated `formula`/`formulaV2` examples use `isExpanded`, which is in
no enumeration, and `clozeformula`'s own example uses `isTrue`, which is in chemistry's.

**What L0176 does meanwhile.** `question-types.ts` accepts eight —
`equivLiteral`, `equivSymbolic`, `equivValue`, `isSimplified`, `isFactorised`, `isExpanded`,
`stringMatch`, `isUnit` — a set that appears nowhere. Three of them (`isSimplified`,
`isFactorised`, `isUnit`) occur in no enumeration and no example anywhere in the corpus; they
arrived with the L0158 port. Two documented methods, `equivSyntax` and `isTrue`, are absent
from L0176's list. Nothing enforces the list either way, so today any string reaches the
emitted JSON.

**To close it:** render a `clozeformulaV2` scoring on `equivSyntax`, and one on `isUnit`, and
see which are honoured.

### C2 — `validation.*.options` is documented as two disjoint sets · OPEN, and load-bearing

Every math and chemistry type nests an `options` bag inside each validation rule. Across the
corpus it is documented as two sets that do not overlap:

| Set | Articles whose attribute table documents it |
| :-- | :-- |
| `ignoreLeadingAndTrailingSpaces`, `treatMultipleSpacesAsOne` (plus `inverseResult` on the chemistry types) | `chemistry`, `clozechemistry`, `imageclozechemistry`, `clozeformula`, `imageclozeformula`, `formula`, `formulaV2` |
| `decimalPlaces`, `setDecimalSeparator` | `clozeformulaV2`, `imageclozeformulaV2`, `multistepmath` |

Neither table matches its own article's example. `clozeformula`'s example passes
`decimalPlaces` and `ignoreOrder`; `multistepmath`'s passes `setThousandsSeparator`,
`setDecimalSeparator` and `ignoreOrder`. `ignoreOrder` and `setThousandsSeparator` appear in
**no** attribute table in the corpus.

**Why it is not resolved.** Rule 2 says the tables win, but here the tables are demonstrably
incomplete — each one is missing options its own examples use. The split is more plausibly an
artifact of which options each doc author happened to list than a real per-type restriction,
but "more plausibly" is not evidence.

**Load-bearing.** L0176 emits, on every `clozeformulaV2` rule:

```json
"options": { "ignoreOrder": false, "setDecimalSeparator": ".",
             "setThousandsSeparator": [], "inverseResult": false }
```

That mixes both sets, includes two keys no table documents, and omits `decimalPlaces` — which
is the one option `clozeformulaV2`'s own table does document, and which governs how
`equivValue` compares. Without it, `equivValue` always runs at Learnosity's default of 10
significant decimal places, whether or not that is what the author wanted.

**This gates the `clozeformula` redesign.** Deciding what an aligned `clozeformula` emits means
deciding which of these options are real.

**To close it:** render a `clozeformulaV2` with `equivValue` and `decimalPlaces: 2`, and one
with a deliberately bogus option key, and see which are honoured and which are rejected.

### C3 — Four articles' examples declare a sibling question type · RESOLVED (table wins)

Four worked examples set a `"type"` that contradicts their own article's normative statement:

| Article | Table says | Example says |
| :-- | :-- | :-- |
| `Cloze-chemistry-clozechemistry.md` | `clozechemistry` | `clozeformula` |
| `Cloze-chemistry-with-image-imageclozechemistry.md` | `imageclozechemistry` | `imageclozeformula` |
| `Math-essay-with-rich-text-formulaessayV2.md` | `formulaessayV2` | `longtextV2` |
| `Chemistry-essay-Deprecated.md` | `chemistryessay` | `formulaessay` |

**Resolution.** The tables. Each says *Must be set to "X" in this case* or carries it as the
`type` attribute's default; the examples are copy-pasted from the nearest sibling type and were
not updated. In the `clozechemistry` case the entire example — stimulus, template, response
containers, validation — is `clozeformula`'s, differing only by a stray newline inside the
template string.

**Why it matters beyond these four.** This is the evidence for precedence rule 2 ranking
examples below tables. An example in this corpus may not have been written for the article it
appears in, which is also the likeliest explanation for C5 and C6.

### C4 — `alt_responses[ ][ ]` documents a shape that does not exist · RESOLVED (artifact)

27 of the 51 articles document `validation.alt_responses[ ].value` **and**
`validation.alt_responses[ ][ ].value`, with identical descriptions, as though alternates
nested two levels deep.

**Resolution.** A doc-generator artifact. `alt_responses` is an array of `{score, value}`;
there is no second level. The evidence is thin but one-directional: exactly one worked example
in the corpus populates `alt_responses` at all — `shorttext`'s — and it is single-level, and
L0176 emits the single level and matched L0158 across the golden set.

Recorded because the duplicated rows are not obviously spurious on the page: a reader
implementing from the attribute table alone, without an example to hand, would produce a
wrongly-nested array.

### C5 — `orderlist`'s example contradicts its own `ui_style` table · RESOLVED (table wins)

`Order-list-orderlist.md`'s example sets `"ui_style": "button"` — a bare string. Its attribute
table declares `ui_style` an object, and puts the list style at `ui_style.type` with supported
values `button`, `list`, `inline`.

**Resolution.** The table, per rule 2, and consistently with every other article in the corpus,
where `ui_style` is an object without exception. The example is the outlier.

### C6 — `custom`'s response `type` is boilerplate from another article · RESOLVED (table loses)

`Custom-Draft.md`'s *Response attributes* says of `type`: *Informs the scoring engine about
what kind of data to expect… Must be set to `"array"`.* Its own example returns
`"type": "custom_shorttext"`, and its own prose two paragraphs earlier says the response format
*depends on the custom Question type implementation*.

**Resolution.** The `"array"` is boilerplate pasted from the array-returning types. This is the
one entry where rule 2 is overridden: the table is contradicted by both the example and the
prose in the same article, and by the nature of the type — a custom question's response shape
is defined by the custom scorer, which is the entire point of the type.

**Depends on it:** L0176's `buildCustom` emits no response-shape constraint, which is correct.

### C7 — `distractor_rationale_response_level` is typed three ways · RESOLVED (refinement)

`metadata.distractor_rationale_response_level` is declared `array[string]` in 14 articles, bare
`array` in 11, and `string/number` in one — `Text-highlight-Deprecated.md`.

**Resolution.** `array[string]`. `array` and `array[string]` are a refinement rather than a
contradiction — the same field described at two levels of precision — so only the deprecated
article genuinely conflicts, and rule 3 does not rescue it: nothing about `texthighlight` would
make its rationale field scalar when every live type's is a list.

Edit dates do not discriminate, and were checked in case they did: both the `array` and the
`array[string]` groups run to 2026-08-14, so the imprecise form is not simply the older one.

**Depends on it:** how L0176 should expose per-response rationale, which the audit records as
an open item — it currently joins the list into one numbered string in `distractor_rationale`
instead.

### C8 — The bow-tie example's indices do not decode · OPEN

`Bow-tie-bowtie.md`'s example defines three response groups of 5, 2 and 5 options — twelve in
total, indices 0–11 — and gives `validation.valid_response.value` as `[[0, 4], [7], [10, 12]]`.

Under cumulative global indexing the groups occupy 0–4, 5–6 and 7–11. So `[7]`, the middle
drop zone, names an option in the third group, and `12` is out of range entirely. The array is
not decodable under that scheme, and no other scheme is described: the article says only "an
array with three elements representing each drop zone".

**Why it is not resolved.** The example is the only worked bow-tie in the corpus, so rule 2 has
nothing to prefer it to — there is no attribute table statement about how indices are numbered.
Either the indices are per-group rather than global (which `[10, 12]` also fails, the third
group having only five), or the example is simply wrong.

**What L0176 does meanwhile.** Cumulative global offsets, computed in `resolveBowtieResponse`
in `question-types.ts`. That output passed the 117/117 golden-parity gate against L0158, so the
scheme is very likely right and the example wrong — but a parity gate proves agreement with
L0158, not with Learnosity.

**To close it:** render a bow-tie with known correct answers and see which options come back
marked correct. Until then, do not "fix" L0176 toward the example.

### C9 — `classification` omits `possible_responses` from its own table · RESOLVED (omission)

`Classification-classification.md` documents 13 top-level attributes.
`possible_responses` — the draggable items, without which the type does nothing —
is not among them.

It is everywhere else in the same article: the worked example sets it, the
`validation.valid_response.value` description says "the response index is based
on the index value in the `possible_responses` attribute" (three times, once per
scoring section), and `duplicate_responses` is defined as "the items from the
`possible_responses` will be reusable".

**Resolution.** The attribute exists and is required. This is an omission from the
table rather than a contradiction between sources — precedence rule 2 ranks the
table above the example, but rule 2 is about which source to believe when they
*disagree*, and here the table simply says nothing.

Recorded because it is the sharpest case yet against treating the attribute
tables as complete: implementing `classification` from its table alone yields a
question with no items to drag. Compare C2, where the tables are likewise
incomplete about the `options` bag but at least list something.

**Depends on it:** `validAttributes.CLASSIFICATION` includes `possible_responses`
even though it is absent from the article the rest of that list was taken from.

---

## Caveat on evidence

**Nothing in this register is measured.** L0178's equivalent register leans on live calls to a
real item bank; this one does not yet have a single render behind it. Every entry above is
doc-versus-doc, or doc-versus-what-L0176-emits. Precedence rule 1 is written down for when that
changes, and currently decides nothing.

That is why the two entries that most affect the emitted JSON — C1 and C2, both about how math
answers are scored — are the two that stay OPEN. They cannot be closed by reading, and reading
is all that has been done.

Where a resolution says a table or an example "wins", it means the corpus is internally
consistent enough to prefer one reading, not that Learnosity's implementation has been observed
to agree. A RESOLVED entry here is a decision about which source to trust, and should be
overturned the moment a render says otherwise.

Coverage is also uneven: the conflicts found so far come from the types L0176 already emits
(C9 surfaced only when `classification` was actually converted, not when its article was read),
plus the math and chemistry family read for C1 and C2. The 27 documented types L0176 does not
map have been read once and not audited. Expect this register to grow, and prefer growing it to
quietly resolving a conflict in favour of whichever article was read last.
