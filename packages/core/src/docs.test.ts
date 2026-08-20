import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
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
