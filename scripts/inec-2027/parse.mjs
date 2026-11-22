// Parse the INEC 2027 Gombe candidates directory (text from `pdftotext -layout`)
// into structured JSON, and check every section against the counts the
// directory itself states. Usage:
//   pdftotext -layout "docs/Gombe_2027_INEC_Candidates_Directory (1).pdf" directory.txt
//   node scripts/inec-2027/parse.mjs directory.txt > scripts/inec-2027/directory.json
import fs from "node:fs";

// pdftotext starts each new page with a form feed; drop it with the CRs.
const text = fs.readFileSync(process.argv[2], "utf8").replace(/[\r\f]/g, "");
const lines = text.split("\n").map((line) => line.replace(/\s+Page \d+ of \d+\s*$/, ""));

const problems = [];
const tidy = (name) => name.replace(/\s+/g, " ").trim();

// ---- A. Governorship tickets: "PARTY  Candidate (age, G, qual)  Deputy (age, G, qual)"
const tickets = [];
const person = /([^()]+?)\s*\(([^)]*)\)/g;
const sectionA = lines.slice(
  lines.findIndex((l) => l.startsWith("A. Governorship")),
  lines.findIndex((l) => l.startsWith("B. Senatorial"))
);
for (const line of sectionA) {
  const match = line.match(/^([A-Z]{1,5})\s{2,}(.+)$/);
  if (!match || match[1] === "Party") continue;
  const people = [...match[2].matchAll(person)].map((m) => {
    const [age, gender, ...qual] = m[2].split(",").map((s) => s.trim());
    return {
      name: tidy(m[1]),
      age: Number(age),
      gender: gender === "M" ? "Male" : gender === "F" ? "Female" : gender,
      qualification: qual.join(", ") || null,
    };
  });
  if (people.length !== 2) problems.push(`Governorship line not parsed: ${line}`);
  tickets.push({ party: match[1], governor: people[0], deputy: people[1] });
}
const ticketTotal = Number(sectionA[0].match(/\((\d+) Tickets/)[1]);
if (tickets.length !== ticketTotal) problems.push(`Governorship: ${tickets.length} parsed, ${ticketTotal} stated`);

// ---- B–D. "Heading (N Candidates)" followed by "Name (PARTY), Name (PARTY)." over several lines
function groups(fromHeading, toHeading) {
  const start = lines.findIndex((l) => l.startsWith(fromHeading));
  const end = toHeading ? lines.findIndex((l) => l.startsWith(toHeading)) : lines.length;
  const out = [];
  let current = null;
  for (const line of lines.slice(start + 1, end)) {
    const heading = line.match(/^(?:\d+\.\s*)?(.+?)\s*\((\d+) Candidates?\)\s*$/);
    if (heading) {
      current = { name: tidy(heading[1]), stated: Number(heading[2]), raw: "" };
      out.push(current);
    } else if (current && line.trim()) {
      current.raw += " " + line.trim();
    }
  }
  return out.map((g) => {
    // Split on "), " so names that contain parentheses, e.g. "Mohammed (Makko) Aminu (PDP)", survive.
    const entries = [...g.raw.matchAll(/\s*(.+?)\s*\(([A-Z]{1,5})\)\s*[,.]?/g)].map((m) => ({
      name: tidy(m[1].replace(/^[,.\s]+/, "")),
      party: m[2],
    }));
    if (entries.length !== g.stated) problems.push(`${g.name}: ${entries.length} parsed, ${g.stated} stated`);
    return { area: g.name, candidates: entries };
  });
}

const senate = groups("B. Senatorial", "C. Federal House");
const house = groups("C. Federal House", "D. State House");
const assembly = groups("D. State House", null);

const assemblyStated = Number(lines.find((l) => l.startsWith("D. State House")).match(/\((\d+) Candidates/)[1]);
const assemblyParsed = assembly.reduce((n, g) => n + g.candidates.length, 0);
if (assemblyParsed !== assemblyStated) problems.push(`Assembly total: ${assemblyParsed} parsed, ${assemblyStated} stated`);

const directory = { source: "INEC Final List of Candidates, 2027, Gombe State", tickets, senate, house, assembly };
process.stdout.write(JSON.stringify(directory, null, 2) + "\n");

const parties = new Set([
  ...tickets.map((t) => t.party),
  ...[...senate, ...house, ...assembly].flatMap((g) => g.candidates.map((c) => c.party)),
]);
console.error(
  `governorship tickets ${tickets.length}, senate ${senate.reduce((n, g) => n + g.candidates.length, 0)} in ${senate.length}, ` +
    `house ${house.reduce((n, g) => n + g.candidates.length, 0)} in ${house.length}, assembly ${assemblyParsed} in ${assembly.length}, ` +
    `parties ${parties.size}: ${[...parties].sort().join(" ")}`
);
if (problems.length) {
  console.error("PROBLEMS:\n- " + problems.join("\n- "));
  process.exitCode = 1;
}
