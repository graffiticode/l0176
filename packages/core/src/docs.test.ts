import { test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parser } from "@graffiticode/parser";
import { compiler, lexicon } from "./index.js";
function blocks(path: string) {
  const out: string[] = []; let cur: string[] | null = null;
  for (const l of readFileSync(path, "utf-8").split("\n")) {
    if (l.trim().startsWith("```")) { if (cur) { out.push(cur.join("\n")); cur = null; } else cur = []; continue; }
    if (cur) cur.push(l);
  }
  return out;
}
test("every program fragment in spec/ parses against the current lexicon", async () => {
  let ok = 0; const bad: string[] = [];
  for (const f of ["spec/spec.md", "spec/instructions.md"]) {
    for (const b of blocks(f)) {
      const src = b.trim();
      if (!src || src.includes("...") || src.startsWith("{") || src.startsWith("|")) continue;
      const prog = src.endsWith("..") ? src : `${src}..`;
      try { await parser.parse(176, prog, lexicon); ok++; }
      catch (e: any) { bad.push(`${f}\n${src.split("\n").slice(0,4).join("\n")}\n  -> ${String(e).slice(0,150)}`); }
    }
  }
  // The vocabulary and the documentation drift apart silently otherwise: a
  // renamed keyword or a changed arity leaves spec/ describing a syntax that no
  // longer parses, and the code generator writes from instructions.md.
  expect(bad, `${bad.length} of ${ok + bad.length} fragments failed to parse:\n${bad.join("\n\n")}`).toEqual([]);
});

test("the starter template parses", async () => {
  // spec/template.gc is what a new task opens with, and build-static copies it
  // verbatim into the served bundle. A syntax change silently invalidates it.
  await expect(
    parser.parse(176, readFileSync("spec/template.gc", "utf-8"), lexicon),
  ).resolves.toBeTruthy();
});

// Keywords that have been retired. They are easy to leave behind in prose, where
// nothing parses them — `partial-credit` survived in four spec files and in
// language-info.json's generator notes after it was removed from the lexicon.
const RETIRED = [
  "partial-credit", "alternative-response", "max-word-count",
  "categories", "distractors", "hot-text",
  "learnosity", "features", "layout",
];

test("no retired keyword is still documented", () => {
  // Only code — fenced blocks and backticked spans. `categories` and
  // `distractors` are ordinary English, and examples.md is natural-language
  // prompts throughout, so scanning prose would be all false positives.
  // Quoted strings go too: a stimulus reading "sort into the correct
  // categories" is English that happens to sit inside a code fence.
  const code = (text: string) =>
    [...text.matchAll(/```[\s\S]*?```/g), ...text.matchAll(/`[^`\n]+`/g)]
      .map((m) => m[0].replace(/"[^"]*"/g, '""'))
      .join("\n");

  const offences: string[] = [];
  for (const f of readdirSync("spec")) {
    if (!/\.(md|json|gc)$/.test(f)) continue;
    const text = readFileSync(`spec/${f}`, "utf-8");
    const haystack = f.endsWith(".gc") ? text.replace(/"[^"]*"/g, '""') : code(text);
    for (const word of RETIRED) {
      // Not preceded or followed by a word char, hyphen or slash: `learnosity`
      // is retired but `learnosity-key` and `docs/learnosity-audit.md` are not.
      const re = new RegExp(`(?<![\\w/-])${word}(?![\\w/-])`, "g");
      const n = (haystack.match(re) || []).length;
      if (n > 0) offences.push(`spec/${f}: ${word} (${n})`);
    }
  }
  expect(offences, `retired keywords still documented:\n${offences.join("\n")}`).toEqual([]);
});

const QUESTION_TYPES = [
  "mcq", "shorttext", "longtext", "plaintext", "clozetext", "clozeassociation",
  "clozedropdown", "clozeformula", "choicematrix", "orderlist", "classification",
  "bowtie", "custom", "token-highlight",
];

// Signing needs credentials but does not care whether they are real, so the
// whole pipeline runs and every builder gets exercised.
const CONFIG = { learnosity: { key: "test_key", secret: "test_secret_0123456789" } };

async function compileFragment(src: string) {
  const code = await parser.parse(176, src, lexicon);
  return await new Promise<void>((res, rej) =>
    compiler.compile(code, {}, CONFIG, (e: any) => {
      const errs = Array.isArray(e) ? e.filter(Boolean) : e ? [e] : [];
      if (errs.length) rej(errs); else res();
    }));
}

test("every program fragment in spec/ compiles, not merely parses", async () => {
  // Parsing is not enough: `valid-response [0]` on an mcq parses perfectly well
  // and fails in the builder. Twenty stale examples survived the conversion
  // behind a parse-only guard, and the code generator wrote from them.
  const bad: string[] = [];
  let ok = 0;
  for (const f of ["spec/spec.md", "spec/instructions.md"]) {
    for (const b of blocks(f)) {
      const src = b.trim();
      if (!src || src.includes("...")) continue;
      const head = src.split(/[\s[]/)[0];
      let prog = src.endsWith("..")
        ? src
        : QUESTION_TYPES.includes(head)
          ? `set-var "lrn-id" "t" questions [${src}] {}..`
          : null;
      if (prog === null) continue;
      // `get-val-public` reads task data the harness has no way to supply, and
      // an `author` fragment may omit the lrn-id its own section establishes.
      // Neither is staleness; substitute so the rest of the program is exercised.
      prog = prog.replace(/get-val-(public|private)\s+"[^"]*"/g, '"test-item-id"');
      if (!/set-var\s+"lrn-id"/.test(prog)) prog = `set-var "lrn-id" "t" ${prog}`;
      // save-to-itembank writes to the Learnosity Data API for real. The guard
      // is about shape, so drop it rather than making a network call from a test.
      prog = prog.replace(/save-to-itembank\s+true/g, "save-to-itembank false");
      try { await compileFragment(prog); ok++; }
      catch (e: any) {
        bad.push(`\n--- ${f}\n${src}\n  -> ${(e?.[0]?.message ?? JSON.stringify(e)).slice(0, 120)}`);
      }
    }
  }
  expect(bad, `${bad.length} of ${ok + bad.length} fragments failed to compile:\n${bad.join("\n")}`)
    .toEqual([]);
});
