// Load the INEC 2027 Gombe candidates directory into Supabase.
//
//   node scripts/inec-2027/import.mjs                 dry run: reports what it would do
//   node scripts/inec-2027/import.mjs --apply         writes
//   node scripts/inec-2027/import.mjs --apply --status=published
//
// Safe to re-run: areas, elections, candidates and candidacies are found
// before they are created, so a second run adds nothing. Existing records are
// never modified. Uses SUPABASE_SERVICE_ROLE_KEY from .env.local.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const STATUS = (process.argv.find((a) => a.startsWith("--status=")) ?? "--status=draft").split("=")[1];
if (!["draft", "published"].includes(STATUS)) throw new Error("--status must be draft or published");

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const directory = JSON.parse(fs.readFileSync(new URL("./directory.json", import.meta.url), "utf8"));

/** Elections to file each contest under: found by exact name, created if missing. */
const ELECTIONS = {
  governorship: { name: "2027 Gombe Governorship Election", election_type: "governorship" },
  senate: { name: "2027 Gombe Senatorial Election", election_type: "senate" },
  house: { name: "2027 House of Representatives Election (Gombe)", election_type: "house_of_representatives" },
  assembly: { name: "2027 Gombe State House of Assembly Election", election_type: "state_assembly" },
};

const plan = { areas: [], elections: [], candidates: [], candidacies: [], reused: [] };
const say = (...args) => console.log(...args);

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Existing names sometimes carry an alias, e.g. "Gwamna Jamil Isyaku (Dr. Jamilu Isyaku Gwamna)". */
const baseName = (name) => name.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim().toLowerCase();

// ---------------------------------------------------------------- reference data
const state = await must(
  db.from("electoral_areas").select("id").eq("area_type", "state").ilike("name", "Gombe").single(),
  "Gombe State"
);

const parties = new Map(
  (await must(db.from("political_parties").select("id, acronym"), "parties")).map((p) => [p.acronym, p.id])
);
const neededParties = new Set([
  ...directory.tickets.map((t) => t.party),
  ...[...directory.senate, ...directory.house, ...directory.assembly].flatMap((g) => g.candidates.map((c) => c.party)),
]);
const missingParties = [...neededParties].filter((a) => !parties.has(a));
if (missingParties.length) throw new Error(`Parties missing from the database: ${missingParties.join(", ")}`);

const areas = await must(
  db.from("electoral_areas").select("id, name, area_type, parent_id").in("area_type", ["senatorial_district", "federal_constituency", "state_constituency"]),
  "areas"
);
const findArea = (type, name) =>
  areas.find((a) => a.area_type === type && a.name.toLowerCase() === name.toLowerCase());

async function areaId(type, name) {
  const existing = findArea(type, name);
  if (existing) {
    if (existing.parent_id !== state.id) throw new Error(`${name} (${type}) is not filed under Gombe State`);
    return existing.id;
  }
  plan.areas.push(`${type}: ${name}`);
  if (!APPLY) return `new:${type}:${name}`;
  const created = await must(
    db.from("electoral_areas").insert({ name, area_type: type, parent_id: state.id, publication_status: STATUS }).select("id, name, area_type, parent_id").single(),
    `create area ${name}`
  );
  areas.push(created);
  return created.id;
}

const elections = await must(db.from("elections").select("id, name, election_type"), "elections");
async function electionId(key) {
  const spec = ELECTIONS[key];
  const existing = elections.filter((e) => e.name === spec.name && e.election_type === spec.election_type);
  if (existing.length > 1) throw new Error(`More than one election named "${spec.name}"; remove the duplicate first`);
  if (existing[0]) {
    plan.reused.push(`election: ${spec.name}`);
    return existing[0].id;
  }
  plan.elections.push(`${spec.election_type}: ${spec.name}`);
  if (!APPLY) return `new:election:${key}`;
  const created = await must(
    db.from("elections").insert({ ...spec, jurisdiction: "Gombe State, Nigeria", election_date: null, publication_status: STATUS }).select("id, name, election_type").single(),
    `create election ${spec.name}`
  );
  elections.push(created);
  return created.id;
}

const candidates = await must(db.from("candidates").select("id, full_name"), "candidates");
const candidacies = await must(
  db.from("candidacies").select("election_id, candidate_id, party_id, electoral_area_id, office_title, candidate:candidates(full_name)"),
  "candidacies"
);

/**
 * A listing already imported: same election, area, party, office and name.
 * This is what makes re-runs safe for namesakes, who are never merged into
 * one candidate record and so can't be found by name alone.
 */
const alreadyListed = (election, area, party, office, name) =>
  candidacies.some(
    (c) =>
      c.election_id === election &&
      c.electoral_area_id === area &&
      c.party_id === parties.get(party) &&
      c.office_title === office &&
      c.candidate &&
      baseName(c.candidate.full_name) === baseName(name)
  );

/**
 * A listing in a contest becomes one candidate. An existing candidate is reused
 * only when the name matches exactly (ignoring an alias in brackets) and the
 * name occurs once in the whole directory, so namesakes are never merged.
 */
const directoryNameCounts = new Map();
for (const name of [
  ...directory.tickets.flatMap((t) => [t.governor.name, t.deputy.name]),
  ...[...directory.senate, ...directory.house, ...directory.assembly].flatMap((g) => g.candidates.map((c) => c.name)),
]) {
  directoryNameCounts.set(baseName(name), (directoryNameCounts.get(baseName(name)) ?? 0) + 1);
}

async function candidateId(name, biography) {
  const unique = directoryNameCounts.get(baseName(name)) === 1;
  const matches = unique ? candidates.filter((c) => baseName(c.full_name) === baseName(name)) : [];
  if (matches.length === 1) {
    plan.reused.push(`candidate: ${matches[0].full_name}`);
    return matches[0].id;
  }
  plan.candidates.push(name);
  if (!APPLY) return `new:candidate:${plan.candidates.length}`;
  const created = await must(
    db.from("candidates").insert({ full_name: name, biography, publication_status: STATUS }).select("id, full_name").single(),
    `create candidate ${name}`
  );
  return created.id;
}

async function candidacy({ election, candidate, party, area, office }) {
  if (candidacies.some((c) => c.election_id === election && c.candidate_id === candidate)) {
    plan.reused.push(`candidacy: ${office}`);
    return;
  }
  plan.candidacies.push(`${office} · ${party}`);
  if (!APPLY) return;
  await must(
    db.from("candidacies").insert({
      election_id: election,
      candidate_id: candidate,
      party_id: parties.get(party),
      electoral_area_id: area,
      office_title: office,
      publication_status: STATUS,
    }),
    `create candidacy ${office} ${party}`
  );
  candidacies.push({ election_id: election, candidate_id: candidate });
}

const profile = (p, role, party) =>
  `Listed by INEC as the ${party} ${role} candidate for Gombe State in 2027. Age ${p.age}, ${p.gender.toLowerCase()}` +
  (p.qualification ? `; qualification: ${p.qualification}.` : ".");

// ---------------------------------------------------------------- import
// Areas and elections first: if the database rejects one (e.g. an area type
// it doesn't allow), the run stops before any candidate is written.
const contests = [
  ["senate", directory.senate, "senatorial_district", "Senator", (n) => n],
  ["house", directory.house, "federal_constituency", "Member, House of Representatives", (n) => n.replace(/\s+Federal Constituency$/, "")],
  ["assembly", directory.assembly, "state_constituency", "Member, State House of Assembly", (n) => n],
];
const electionIds = { governorship: await electionId("governorship") };
const areaIds = new Map();
for (const [key, groups, areaType, , areaName] of contests) {
  electionIds[key] = await electionId(key);
  for (const group of groups) areaIds.set(`${key}:${group.area}`, await areaId(areaType, areaName(group.area)));
}

const governorship = electionIds.governorship;
for (const ticket of directory.tickets) {
  for (const [person, office, role] of [
    [ticket.governor, "Governor", "governorship"],
    [ticket.deputy, "Deputy Governor", "deputy governorship"],
  ]) {
    if (alreadyListed(governorship, state.id, ticket.party, office, person.name)) {
      plan.reused.push(`candidacy: ${office}`);
      continue;
    }
    const id = await candidateId(person.name, profile(person, role, ticket.party));
    await candidacy({ election: governorship, candidate: id, party: ticket.party, area: state.id, office });
  }
}

for (const [key, groups, , office] of contests) {
  const election = electionIds[key];
  for (const group of groups) {
    const area = areaIds.get(`${key}:${group.area}`);
    for (const entry of group.candidates) {
      if (alreadyListed(election, area, entry.party, office, entry.name)) {
        plan.reused.push(`candidacy: ${office}`);
        continue;
      }
      const id = await candidateId(entry.name, null);
      await candidacy({ election, candidate: id, party: entry.party, area, office });
    }
  }
}

say(`${APPLY ? "APPLIED" : "DRY RUN"} (status: ${STATUS})`);
say(`areas to create:       ${plan.areas.length}${plan.areas.length ? "  e.g. " + plan.areas.slice(0, 3).join("; ") : ""}`);
say(`elections to create:   ${plan.elections.length}  ${plan.elections.join("; ")}`);
say(`candidates to create:  ${plan.candidates.length}`);
say(`candidacies to create: ${plan.candidacies.length}`);
say(`reused existing:       ${[...new Set(plan.reused.filter((r) => !r.startsWith("candidacy")))].join("; ")}`);
