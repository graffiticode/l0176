import { test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parser } from "@graffiticode/parser";
import { lexicon } from "./index.js";
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
      const n = (haystack.match(new RegExp(`\\b${word}\\b`, "g")) || []).length;
      if (n > 0) offences.push(`spec/${f}: ${word} (${n})`);
    }
  }
  expect(offences, `retired keywords still documented:\n${offences.join("\n")}`).toEqual([]);
});
