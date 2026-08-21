// Generates the attribute reference from the registries, so it cannot drift
// from what the compiler actually accepts.
import { writeFileSync, readFileSync } from "node:fs";
import { validAttributes, memberFields } from "../dist/question-types.js";
import { lexicon } from "../dist/index.js";

const KEY_TO_TYPE = {
  MCQ: "mcq", SHORTTEXT: "shorttext", LONGTEXT: "longtext", PLAINTEXT: "plaintext",
  CLOZETEXT: "clozetext", CLOZEASSOCIATION: "clozeassociation",
  CLOZEDROPDOWN: "clozedropdown", CLOZEFORMULA: "clozeformula",
  CHOICEMATRIX: "choicematrix", ORDERLIST: "orderlist",
  CLASSIFICATION: "classification", BOWTIE: "bowtie", TOKEN_HIGHLIGHT: "token-highlight",
  TOKENHIGHLIGHT: "token-highlight",
};
// word -> emitted field, via the lexicon's NAME and the memberFields registry.
const wordOf = new Map();
for (const [word, entry] of Object.entries(lexicon)) {
  const f = memberFields[entry.name]?.field;
  if (f) wordOf.set(f, word);
}
const typesFor = (field) =>
  Object.entries(validAttributes)
    .filter(([, fields]) => fields.includes(field))
    .map(([k]) => KEY_TO_TYPE[k] || k.toLowerCase());

const allFields = [...new Set(Object.values(validAttributes).flat())].sort();
const rows = allFields.map((f) => {
  const types = typesFor(f);
  return `| \`${wordOf.get(f) ?? "—"}\` | \`${f}\` | ${types.length === 13 ? "all types" : types.join(", ")} |`;
});
// Rule options are not question attributes, so they are listed separately.
const optionFields = Object.values(memberFields)
  .map((m) => m.field)
  .filter((f) => /[a-z][A-Z]/.test(f) || f === "syntax")
  .sort();
const optRows = optionFields.map((f) => `| \`${wordOf.get(f) ?? "—"}\` | \`${f}\` |`);
// Everything else in the registry nests inside another member (ui-style,
// response-container, validation, metadata) rather than sitting on the question.
const covered = new Set([...allFields, ...optionFields]);
const nested = Object.values(memberFields).map((m) => m.field)
  .filter((f) => !covered.has(f)).sort();
const nestRows = nested.map((f) => `| \`${wordOf.get(f) ?? "—"}\` | \`${f}\` |`);

const table = `### Attribute reference

Every attribute the compiler accepts, the Learnosity field it emits, and the
question types that take it. Generated from the registries in
\`question-types.ts\` — if a word is missing here it is missing from the
language, not from the documentation.

| keyword | Learnosity field | accepted by |
|---|---|---|
${rows.join("\n")}

**Rule options.** These sit inside a \`validation\` rule's \`options\`, not on the
question, and are the only words in the language that emit camelCase.

| keyword | Learnosity key |
|---|---|
${optRows.join("\n")}

**Nested members.** These belong inside another member — \`validation\`,
\`ui-style\`, \`response-container\`, \`metadata\` — rather than on the question
itself.

| keyword | Learnosity field |
|---|---|
${nestRows.join("\n")}
`;
const START = "<!-- BEGIN attribute-reference -->";
const END = "<!-- END attribute-reference -->";
const spec = readFileSync("spec/spec.md", "utf-8");
const body = `${START}\n${table}${END}`;
const next = spec.includes(START)
  ? spec.slice(0, spec.indexOf(START)) + body + spec.slice(spec.indexOf(END) + END.length)
  : spec.replace("## Function Reference", `${body}\n\n## Function Reference`);
writeFileSync("spec/spec.md", next);
console.log(`${nestRows.length} nested members; spec.md updated`);
console.log(`${rows.length} attributes, ${optRows.length} rule options`);
