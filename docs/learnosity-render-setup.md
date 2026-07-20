# Learnosity rendering & item-bank credentials

What makes L0176 forms render and `save-to-itembank` writes succeed. Both depend
on a compile-time signing step **and** three credentials on the Cloud Run
service. (Diagnosed after forms rendered blank and `save-to-itembank true` hung
the console on "Loading…".)

## Signing is folded into the compile

Unlike L0158 — whose own view did a second `init data {}` compile pass to sign —
L0176 renders through the shared `@graffiticode/l0000-view`, which issues **one**
`POST /compile` and hands the result to the Form verbatim. So the compile output
must already carry a signed `request`.

`signForRender()` in `packages/core/src/compiler.ts` (`PROG`) signs the
`{ type, data }` activity (`initQuestions` / `initItems` / `initAuthor`) and
attaches `request`. Without it, `state.data.request` is `undefined` and the Form
renders blank.

Each signing stamps a fresh `user_id` / `signature` / `timestamp`, so `request`
changes on every (re)compile even when the assessment is unchanged. That churn
is why the Form keys its one-time `LearnosityApp.init` on stable question content
rather than object identity — see
`packages/view/src/components/form/contentKey.ts`. Re-initializing on
already-mounted DOM throws Learnosity's `triggerBufferedEvents` error.

## Three service credentials

All three must be set on the Cloud Run service `l0176` (project `graffiticode`)
and are declared in `cloudbuild.yaml` so `--set-env-vars` / `--set-secrets`
(which replace the full env/secret sets on every deploy) don't drop them:

| Name | Source | Purpose |
|---|---|---|
| `LEARNOSITY_KEY` | plain env var (`UsF4dy1YxZd4JIyq`) | consumer key; non-secret — it ships in every browser-delivered signed request |
| `LEARNOSITY_SECRET` | Secret Manager `learnosity-secret` | default render signing secret |
| `GRAFFITICODE_SECRET_KEY` | Secret Manager `GRAFFITICODE_SECRET_KEY` | key `get-val-private` uses to decrypt console-supplied secrets |

The signing `domain` is `l0176.graffiticode.org`, baked via `NODE_ENV=production`
in the `Dockerfile`. It must be whitelisted for the consumer key in Learnosity.

## The `save-to-itembank` gotcha

`save-to-itembank true` requires **program-supplied** credentials
(`resolveCredentials` → `fromOptions=true`), which the console injects as:

```
set-var "learnosity-secret" get-val-private "learnosity-secret"
```

`get-val-private` decrypts with `GRAFFITICODE_SECRET_KEY`. If that key is
**missing**, `@graffiticode/l0000`'s `decrypt()` returns the raw ciphertext
unchanged, so the Data API write is signed with garbage and Learnosity rejects it
with `41003 signatures do not match`. Plain render is unaffected because it falls
back to the `LEARNOSITY_SECRET` env var.

Propagate the key with the console script — never set it by hand (it must match
the console's key in project `graffiticode-app` and must never change, or
previously-encrypted values become undecryptable):

```
console/scripts/set-compiler-secret.sh 0176
```

It copies the value from project `graffiticode-app`, refuses to overwrite an
existing-but-different value, grants the runtime service account
`secretAccessor`, and mounts it on the service.

## Robustness

`ITEMS` / `QUESTIONS` wrap `createItems` / `createQuestions` in try/catch and
`resume` with a compile error on failure. A throwing item-bank write would
otherwise escape the CPS callback as an unhandled rejection — `resume` never
gets called, the compile never resolves, and the embedding view hangs on
"Loading…" forever.

## Deploy

```
npm run gcp:build
```
