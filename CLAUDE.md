# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- **Start dev server**: `npm run dev` (starts API server on port 50176; expects Firestore emulator at 127.0.0.1:8080 and local auth at 127.0.0.1:4100)
- **Build project**: `npm run build` (builds `core` → `api` → `view`, then assembles static bundle into `packages/api/static/`)
- **Start production**: `npm run start` (runs the built API server)

### Linting
- **Lint repo**: `npm run lint` (ESLint over the whole monorepo)
- **Lint a package**: `npm -w packages/<core|api|view> run lint`
- **Fix lint errors**: `npm run lint:fix` (or `:fix` on a workspace script)
- **Format**: `npm run format` (Prettier across the repo)

### Package Management
- **Build and pack**: `npm run pack` (builds, then packs `packages/view`)
- **Publish**: `npm run publish` (publishes `@graffiticode/l0176` and `@graffiticode/l0176-view` with public access)

### Testing
Vitest is installed at the root but no test runner script is wired up yet, and no `*.spec.*` files exist in the packages.

### Deployment
- **GCP Cloud Build**: `npm run gcp:build` (submits `cloudbuild.yaml` to the `graffiticode` project)
- **GCP Direct Deploy**: `npm run gcp:deploy` (deploys to Cloud Run as `l0176`, region `us-central1`, port `50176`)
- **View logs**: `npm run gcp:logs`

## Architecture

L0176 is a Graffiticode dialect (child of `@graffiticode/l0000`) for building **Learnosity
assessment integrations**. It compiles Graffiticode programs into Learnosity API requests
(Items, Questions, Author APIs) and renders them via a React frontend that loads the
Learnosity browser SDK. It is the modern-architecture successor to **L0158** (which was
built on the old `@graffiticode/basis` compiler); the vocabulary and compiled output are a
faithful, byte-compatible port of L0158. It's an npm-workspaces monorepo with three packages.

### Structure

- **`packages/core/`** — `@graffiticode/l0176`: the language itself. Pure TypeScript.
  - `src/lexicon.ts`: merges L0000's base lexicon with L0176's Learnosity vocabulary
    (`init`, `learnosity`, `items`, `item`, `questions`, `author`; the question-type keywords
    `mcq`/`shorttext`/`clozetext`/`choicematrix`/`bowtie`/`hot-text`/… ; attribute keywords
    `stimulus`/`options`/`valid-response`/`save-to-itembank`/`metadata`/… ; and metadata
    member constructors `tags`/`notes`/`difficulty-level`/…)
  - `src/compiler.ts`: `Checker`/`Transformer` extending L0000's; hand-written block handlers
    (`INIT`, `LEARNOSITY`, `ITEMS`, `QUESTIONS`, `AUTHOR`, `SAVE_TO_ITEMBANK`, `ID`, `PROG`)
    plus registry-driven generation of per-question-type / per-attribute / per-metadata
    methods. `resolveCredentials` reads Learnosity creds from `options.config` (api-injected)
    or program `set-var`.
  - `src/question-types.ts`: the per-type Learnosity question builders + attribute/metadata
    registries (`questionTypeBuilders`, `attributeFields`, `metadataMembers`, `validAttributes`)
  - `src/{items,questions,author,dataapi}.ts`: Learnosity signing (`learnosity-sdk-nodejs`)
    and item-bank Data API calls (`POST /itembank/items`, `POST /itembank/questions`)
  - `spec/`: language documentation, examples, schema, RAG training prompts, etc.
  - `tools/build-static.js`: copies spec content into `dist/static/` for the API to serve

### Learnosity credentials

The Learnosity consumer key/secret are secrets and live in the **api process**: `packages/api/
src/compile.ts` reads `LEARNOSITY_KEY`/`LEARNOSITY_SECRET` from env and merges them into
`config.learnosity`, which the core compiler reads as `options.config.learnosity`. The
non-secret `domain` is derived in core from `NODE_ENV`. A program may override the creds with
`set-var "learnosity-key"/"learnosity-secret"` — supplying both is the gate that permits
item-bank writes (`save-to-itembank true`). A sentinel `lrn-id` of `verify-itemid` is a dry
run (validate structure, skip credential gates and item-bank writes).

- **`packages/api/`** — `@graffiticode/api-l0176`: Express language server. TypeScript, run via `tsx` in dev and compiled to `dist/` for prod.
  - Routes (`src/routes/`): `compile`, `auth`, `root` (`/form`), plus `index` and shared `utils`
  - Auth integration with `@graffiticode/auth`
  - Port: 50176 (dev) or `process.env.PORT`

- **`packages/view/`** — `@graffiticode/l0176-view`: React view component. Vite + TypeScript + Tailwind.
  - `src/components/form/Form.tsx`: language-specific form rendering
  - `src/components/form/ThemeToggle.tsx`: dark/light toggle wired up by the `theme` function
  - `embed/`: standalone HTML entry built by `vite.embed.config.ts` for embedding in the API's static bundle
  - Built on top of `@graffiticode/l0000-view`

### Build pipeline

`npm run build` composes the packages in order:
1. `core` compiles TypeScript and copies spec content to `core/dist/static/`
2. `api` compiles TypeScript to `api/dist/`
3. `view` builds both the library (`dist/`) and the embed bundle (`dist-embed/`)
4. `assemble` clears `packages/api/static/` and copies `core/dist/static/` + `view/dist-embed/` into it — this is what the API serves

### Language Functions

L0176 inherits the full L0000 base vocabulary (arithmetic, lists, lambdas, `map`/`filter`/
`reduce`, pattern matching, tags, `set-var`/`get-val-public`/`get-val-private`) and adds the
Learnosity vocabulary. Canonical program shape:

```
set-var "lrn-id" get-val-public "itemId"
learnosity items [item questions [mcq {}] {}] {}..
```

- **Question types (arity 1):** `mcq`, `shorttext`, `longtext`, `plaintext`, `clozetext`,
  `clozeassociation`, `clozedropdown`, `clozeformula`, `choicematrix`, `orderlist`,
  `classification`, `bowtie`, `custom`, `hot-text` (= `token-highlight`).
- **Attributes (arity 2):** `stimulus`, `options`, `valid-response`, `possible-responses`,
  `rows`, `columns`, `list`, `categories`, `column-titles`, `passage`, `distractors`,
  `method`, `metadata`, `id`, `save-to-itembank`, and more.
- **Metadata members (arity 1):** `tags`, `notes`, `distractor-rationale`, `acknowledgements`,
  `description`, `source`, `difficulty-level`.
- **Control-flow attributes** set `options` by side effect rather than emitting a field:
  `id` sets `options["lrn-id"]` (required by ITEMS/QUESTIONS/AUTHOR); `save-to-itembank` sets
  `options["save-to-itembank"]`.

Checker/Transformer methods for question types, attributes, and metadata members are generated
programmatically by looping over the registries in `question-types.ts`; only the block-level
nodes have hand-written methods.

### Data Flow

```
User Input → State Update → POST /compile → Compiler (core, signs via Learnosity SDK)
  → { type, data, request } → Form (view, loads Learnosity SDK by type) → postMessage to parent
```

The embedded form supports iframe embedding; the shared View (from `@graffiticode/l0000-view`)
owns the parent-window postMessage/onload protocol.

### Environment Variables
- `PORT`: API port (default 50176)
- `LEARNOSITY_KEY` / `LEARNOSITY_SECRET`: Learnosity consumer credentials (read by the api)
- `AUTH_URL`: Auth service URL (default `https://auth.graffiticode.org`; dev uses `http://127.0.0.1:4100`)
- `FIRESTORE_EMULATOR_HOST`: Local Firestore emulator (dev: `127.0.0.1:8080`)
- `NODE_ENV`: `development` or `production` (selects the Learnosity signing `domain`)

### Dependencies
- `@graffiticode/l0000` (published) — base language, inherited by `core`
- `@graffiticode/l0000-view` (published) — base view, inherited by `view`
- `@graffiticode/auth` — auth service client used by `api`
- `learnosity-sdk-nodejs` — Learnosity request signing (in `core`)
