<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0176 Usage Guide

Agent-facing guide for authoring Learnosity-compatible assessment items through L0176. Read this before composing a `create_item` prompt or an `update_item` modification.

## Overview

L0176 is an authoring language for Learnosity-compatible assessment items. Input is a natural-language description of a single item (or a small group sharing a stimulus); output is a Learnosity item JSON with a stem, one or more interactions, validation rules, scoring, and optional metadata tags. L0176 is the right tool when the job is "produce one assessment item"; it is not an activity-builder, a delivery engine, or a host-app integration surface.

When composing a request, name the item type explicitly ("multiple choice", "cloze with dropdowns", "short-text", "math fill-in", "order the list", "classification", "hot text / token highlight") if it is known — the language has a fixed catalog of interactions and guessing costs a round-trip. Include the stem, the correct answer, any distractors, and the scoring model (exact match, partial credit, manual rubric). Describe shared context — a reading passage, an image, a diagram — only once; the backend will attach it to grouped items.

In scope: item authoring, item-level metadata, item-level accessibility hints (alt text, reading level), variant generation. Out of scope: activity-level assembly, delivery configuration, learner-side analytics, and host-app embedding — those belong downstream of this language and are handled by the Learnosity Items/Activities APIs or by the host app that renders the compiled JSON.

Item-level metadata (tags, difficulty, DOK) and question-level metadata (per-distractor rationale, acknowledgements) are supported via a `metadata` block at the relevant level — describe tags, difficulty, and per-option rationale in plain English and L0176 attaches them to the right level automatically.

## Item Types

L0176 emits one of the following interactions per question. Use the English cue when you know what you want — it removes ambiguity for the backend.

| Type key          | Natural-language cues                                               | When to use                                                                 |
|-------------------|----------------------------------------------------------------------|------------------------------------------------------------------------------|
| `mcq`             | "multiple choice", "MCQ", "pick one", "select the best answer"      | Single correct answer (or multi-select with `multiple-responses`) from a list. |
| `shorttext`       | "short text", "short response", "fill in one word"                  | One-line typed answer with exact-match validation.                          |
| `longtext`        | "essay", "long response with rich text"                             | Rubric-scored long-form response with formatting.                           |
| `plaintext`       | "plain-text essay", "open-ended response"                           | Rubric-scored long-form response without formatting.                        |
| `clozetext`       | "fill in the blank", "cloze with typed answers"                     | Inline blanks filled by typing; one or more blanks per stem.                |
| `clozeassociation`| "drag and drop into blanks", "drag the correct term into the gap"   | Inline blanks filled by dragging from a bank of choices.                    |
| `clozedropdown`   | "dropdowns in the sentence", "cloze with dropdown selectors"        | Inline blanks filled by selecting from a per-blank dropdown.                |
| `clozeformula`    | "math fill-in", "cloze with a formula answer"                       | Inline blank that accepts a math expression, scored by equivalence.         |
| `choicematrix`    | "grid", "rate each statement", "true/false matrix"                  | 2D grid: rows are stems, columns are options; one selection per row.        |
| `orderlist`       | "order these", "put in order", "sequence"                           | Drag items into the correct sequence.                                       |
| `classification`  | "sort into categories", "bucket these items"                        | Drag items into named category buckets.                                     |
| `bowtie`          | "bow-tie", "NGN", "NCLEX bow-tie", "actions, condition, monitor"    | NGN/NCLEX bow-tie: pick 2 actions, 1 condition, 2 parameters to monitor.    |
| `hot-text`        | "hot text", "token highlight", "highlight the words", "click the verbs", "select the words in the text" | Highlight tokens in a passage. List the correct tokens and the clickable distractors; only listed tokens are clickable. Synonym: `token-highlight`. |
| `custom`          | "spreadsheet question", "use this spreadsheet", "embed an L0166 widget", "embed a Graffiticode interaction" | Embed a separately deployed Graffiticode-language interaction as the question — most commonly an L0166 spreadsheet. The interaction's content can be authored inline or read from an upstream pipeline task (see Pipeline Composition). |

No `hotspot` or `image-label` interaction today; describe those as MCQ over labeled positions if you must.

## Vocabulary Cues

Say this to get that:

- **Stem** — the prompt text the learner reads ("write the stem as…").
- **Distractors** — incorrect options in an MCQ; request "distractors that match common misconceptions" rather than just "wrong answers".
- **Valid response** — the correct answer(s). For MCQ, pass either the option text or the option index.
- **Rubric** — triggers manual-scoring mode on `longtext` / `plaintext`. Describe point values per criterion.
- **Exact match / partial credit** — picks the scoring model; default is exact match.
- **Shared stimulus** — a passage, image, or diagram attached once to a group of items. Describe it once at the top of the request.
- **Tags / standards** — NGSS, CCSS, Bloom's level — mention them by their conventional names (e.g., "NGSS MS-LS1-2", "CCSS 6.NS.A.1") and L0176 attaches them at the item level so the Learnosity Author Site can filter on them.
- **Difficulty / DOK** — describe difficulty in plain English ("medium", "hard") or numerically (1–5); for Depth of Knowledge use the integer 1–4. Both attach at the item level.
- **Distractor rationale** — for MCQ, ask for "a one-line rationale per distractor" or "explain why each wrong answer is wrong". L0176 attaches these at the question level so the Author Site review pane shows the teaching intent alongside the item.
- **Instant feedback** — turns on immediate per-response feedback in the interaction.
- **Shuffle options** — randomizes option order at render time.
- **Save to the item bank** — by default an item renders as a preview and is *not* written to the Learnosity item bank. Say "save to the item bank" (or equivalent) to persist it; it lands as `status: unpublished` (draft). Publishing is done from the Learnosity Author Site UI, not from the DSL.
- **Bow-tie (NGN/NCLEX)** — three source pools and three drop zones in a 2-1-2 layout. Standard NCLEX phrasing is "actions to take", "condition most likely", "parameters to monitor". Prompt with the clinical scenario as the stimulus and three lists of options plus the 2-1-2 correct picks; the compiler will reject inputs that don't satisfy the 2-1-2 shape.
- **Hot text (token highlight)** — the learner clicks words/phrases in a passage. Provide the passage, the correct tokens, and the *distractors* (clickable words that are wrong). Only the tokens you list are clickable. Matching is case-insensitive and whole-word, and a repeated correct word counts at every occurrence; say "they may pick at most N" to cap selections. Works for tasks like "click every verb" or "highlight the supporting evidence".
- **Embedded interaction (custom question)** — when the item should render an interaction authored in another Graffiticode language (e.g. an L0166 spreadsheet), say "embed the L0166 spreadsheet" or "use this spreadsheet as the question". Name the language by its number (`L0166`, `L0167`, …). Provide the stem and any framing prose; the deployed interaction handles its own rendering and scoring.

## Pipeline Composition

L0176 items can read content from an upstream task in the console pipeline. The most common case is a `custom` question backed by an L0166 spreadsheet: the L0166 task produces the sheet's authored state, and the L0176 item embeds that state inside its `data:` slot via the base-language `data` primitive. Two equivalent forms exist: `data use "<lang>"` (preferred) declares the upstream language explicitly so the console can reactively generate and chain the upstream task; `data {default}` is the untyped fallback for manually wired chains. The pipeline editor wires the upstream task ID; L0176 source does not reference task IDs directly.

What you describe in the prompt:

- Which language to embed (e.g. "L0166 spreadsheet").
- The stem and framing — "use the spreadsheet below to compute the column totals", etc.
- Whether the item is preview-only or persisted to the bank.

What happens automatically:

- L0176 emits a `custom` question with `lang` set to the embedded language and `data: data use "<lang>"` reading the upstream value. The `use` annotation lets the console discover the upstream language and chain it; without an upstream bound, `data` falls back to `{}` so the item still renders for preview.
- Scoring is delegated to the deployed interaction's own scorer; do not request `valid-response` for embedded interactions.
- `save-to-itembank` produces a snapshot. Persisted items capture the upstream content at compile time and do not update when the upstream is later edited. If the user wants live updates from the upstream, keep the item in preview mode rather than persisting.

A single L0176 program has at most one upstream. Distinct upstreams per question require distinct L0176 programs.

## Dynamic Data

Learnosity supports a per-item table of variable values. Each session draws one row and substitutes the columns into question text via `{{colname}}` placeholders. L0176 reaches this two ways:

- **Inherited** — an embedded L0166 custom question whose compiled output includes `templateVariablesRecords` (L0166's range expansion of `params { … }`) automatically flows through to the item's dynamic content. Authors do nothing extra; reference variables in stems with `{{A1}}`-style placeholders.
- **Hardwired** — declare the table directly with the item-level `params` keyword: `item params [{ A1: "50", A2: "25" } { A1: "100", A2: "75" }] questions [...] {}`. Use this when there is no upstream L0166 widget but the question still needs row-by-row variation.

When both are present, the inherited table wins — embedded L0166 widgets are authoritative about their own variables.

## Metadata

L0176 attaches metadata at two levels.

**Item-level metadata** is what the Learnosity Author Site indexes for search and filtering. Standards tags (NGSS, CCSS, custom taxonomies), difficulty, and DOK go here. Mention them in the prompt and L0176 attaches them to the item record.

**Question-level metadata** travels with the individual interaction if it is reused. The headline field is per-distractor rationale on MCQ — when you ask for "a one-line rationale per distractor", L0176 emits these as question-level metadata that the Author Site shows in the review pane.

You usually do not need to think about which level is which — describe what you want in plain English and L0176 places the metadata at the level that makes it useful. Example: *"Create a 4-option MCQ on the function of mitochondria. Distractors should match common misconceptions, and add a one-line rationale per distractor explaining the misconception. Tag with NGSS MS-LS1-2, difficulty medium, DOK 2."* — produces an item with NGSS/difficulty/DOK at the item level and per-option rationale at the question level.

## Example Prompts

- *"Create a 4-option MCQ on the function of mitochondria. One correct answer. Distractors should match common misconceptions. Tag with NGSS MS-LS1-2. Difficulty: medium."* → `mcq`
- *"Write a cloze item with three dropdowns about the stages of mitosis in order: prophase, metaphase, anaphase. Show the stem above a sentence with blanks."* → `clozedropdown`
- *"Short-text item asking students to define 'allele' in one sentence. Exact match on 'a variant of a gene'."* → `shorttext`
- *"Given this passage about photosynthesis, write three related MCQs sharing the passage as a stimulus. Each should target a different depth-of-knowledge level."* → three `mcq` items grouped under one stimulus
- *"Create an MCQ on the function of mitochondria with four options. Distractors should match common misconceptions, and add a one-line rationale per distractor. Tag with NGSS MS-LS1-2, difficulty medium, DOK 2."* → `mcq` with item-level NGSS/difficulty/DOK tags and question-level per-option rationale
- *"Update item-id <X>: change the stem to be shorter and clearer, but keep all the existing tags and rationale."* → preserves both metadata blocks; only the stem changes
- *"Create a spreadsheet question. Embed the L0166 spreadsheet as the interaction. Stem: 'Use the spreadsheet below to compute the column totals for the first quarter.' "* → `custom` with `lang "0166"` reading the upstream sheet via `data use "0166"`; preview by default, no `valid-response` (the L0166 scorer handles scoring).

## Out of Scope

- **Activity-level assembly** — stringing items into a timed test, sections, or branching. Belongs in Learnosity Activities API.
- **Delivery configuration** — proctoring, time limits, attempt caps, accommodations at delivery time.
- **Learner-side analytics** — response data, mastery, reporting. Served by Learnosity Data / Reports APIs after items have been delivered.
- **Host-app embedding** — mounting the rendered item inside a React app, Canvas LTI, etc. Handled by the host runtime, not by this language surface. See the L0176 docs site for integration guidance.
- **Raw Learnosity JSON** — L0176 authors items in natural language and emits Learnosity JSON; requests for hand-written JSON patches should go to a lower-level tool, not here.
