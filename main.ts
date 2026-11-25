/**
 * Make the AI Judge Feel Nostalgic: A Childhood Memory — entry picker.
 *
 * Bounty: write one sentence of at most 280 characters that brings
 * back a childhood memory — a grandmother's kitchen, a summer
 * evening, the smell of fresh rice. A house judge compares entries
 * two at a time and keeps the line that stirs the deeper nostalgia,
 * weighing (most important first):
 *
 *   1. The line is a childhood memory that makes the judge feel
 *      nostalgic, and loses to any childhood memory that does.
 *   2. The memory is grounded in a concrete place, time or
 *      sensation, such as a kitchen, a summer evening or the smell
 *      of fresh rice.
 *   3. The line sounds like it truly happened to someone, with
 *      small honest detail rather than a greeting-card sentiment.
 *   4. The line fits in a single clean sentence capped at 280
 *      characters, with every word earning its place.
 *   5. The line leaves a warm ache that lingers after the sentence
 *      ends.
 *
 * A line may be funny, sad or quiet as long as it is warm, and
 * sentimentality for its own sake does not count.
 *
 * This program scores a hand-written field of candidate one-liners
 * against that brief, in the brief's own order, and writes the
 * winner to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback
 * /output/entry.txt). It then reads the file back and verifies it
 * byte-for-byte against every gate: 1-280 characters, a single
 * line, valid UTF-8, and not only whitespace.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's
 * own instruction: go through the criteria in order, let the
 * first difference decide. Ties break criterion by criterion in
 * the brief's order, then by shorter length — a shorter line
 * that says the same thing reads tighter.
 *
 * Three sharpening rules sit on top of the flat rubric:
 *
 *   - A line with no concrete grounding — no place, no time, no
 *     sensation the reader can touch — is capped on nostalgia
 *     and grounding alike. An abstract memory is a summary, not
 *     a memory, and no amount of warmth rescues it.
 *   - Greeting-card sentiment is docked hard. Phrases like
 *     "those were the days" tell the judge to feel nostalgic
 *     instead of making him feel it; a line that leans on them,
 *     with no small honest detail behind it, is capped on
 *     authenticity and on the lingering ache.
 *   - The ache must land late. A warm ache that lingers after
 *     the sentence ends lives in the closing words: the bonus
 *     for a lingering ending only counts when the ache marker
 *     sits inside the final eight words, otherwise the line
 *     ends on logistics instead of feeling.
 *
 * Node 22+, standard library only, no network. Deterministic: the
 * same candidates always produce the same winner.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

/**
 * One hand-written candidate memory. `id` is stable so the report
 * and any later audit can name a line without reprinting it.
 */
interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "grandma-crisped-rice",
    text: "Grandma's kitchen smelled of fried garlic and wood smoke every August, and she always saved me the crisped rice stuck to the bottom of the pot.",
  },
  {
    id: "bike-let-go-hand",
    text: "The summer I turned nine, my grandfather taught me to ride a bike on the dirt road behind our house, and I still remember the exact crack in the pavement where I finally let go of his hand.",
  },
  {
    id: "rain-under-stairs",
    text: "On rainy afternoons my mother read to me under the stairs while the thunder rolled, and the smell of wet earth through the open window made the whole world feel safe.",
  },
  {
    id: "first-snow-porch",
    text: "Every winter my father woke me before dawn to watch the first snow from the porch, his coat wrapped around us both, and the cold never once felt like cold.",
  },
  {
    id: "radio-static-rice",
    text: "I used to press my ear against my grandmother's radio to hear the baseball game through the static, and her kitchen smelled of rice steaming and rain on the windowsill.",
  },
  {
    id: "ice-cream-truck",
    text: "The ice-cream truck played the same tinny song every July evening, and my brother and I ran barefoot down the driveway with coins warm from our pockets.",
  },
  {
    id: "steer-old-truck",
    text: "My grandfather's hands smelled of tobacco and motor oil, and he let me steer the old truck down the lane while he worked the pedals with his feet.",
  },
  {
    id: "rice-cooker-six",
    text: "At my grandmother's house the rice cooker clicked off at six, the whole street smelled of dinner, and nobody ever locked the front door.",
  },
  {
    id: "thrown-off-dock",
    text: "I learned to swim the summer my cousin threw me off the dock, and I still taste the lake water and hear my mother laughing from the shore.",
  },
  {
    id: "sewed-my-name",
    text: "My mother sewed my name into my school coat so I would not lose it, and years later I found the same stitching in my own daughter's coat.",
  },
  {
    id: "corner-store-credit",
    text: "The school bell rang at three and I raced my friends to the corner store, where the owner knew my name and let me pick the red popsicle on credit.",
  },
  {
    id: "braid-on-porch",
    text: "My grandmother braided my hair on the porch every morning before school, humming the same song, and the smell of her soap is still the smell of home.",
  },
  {
    id: "tin-box-marbles",
    text: "On the last day of summer my friends and I buried a tin box of marbles under the big oak, promising to dig it up when we were grown, and none of us ever did.",
  },
  {
    id: "attic-comic-books",
    text: "The attic smelled of mothballs and old paper, and on rainy days I sat in the dust-light reading my father's comic books until my mother called me down for supper.",
  },
  {
    id: "watermelon-cicadas",
    text: "My mother used to cut watermelon on the back steps, juice running down my chin, and the cicadas were so loud we had to shout to be heard.",
  },
];

/* ------------------------------------------------------------------ */
/* Text features                                                       */
/* ------------------------------------------------------------------ */

/** Split a line into words on whitespace, dropping empties. */
function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Lower-cased words with surrounding punctuation stripped. */
function cleanWords(text: string): string[] {
  return wordsOf(text).map((w) =>
    w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""),
  );
}

/** True when any of the given needles appears in the haystack. */
function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

/** How many of the given needles appear in the haystack. */
function countAny(haystack: string, needles: string[]): number {
  const lower = haystack.toLowerCase();
  return needles.filter((n) => lower.includes(n)).length;
}

/** The last `n` words of the line, joined back into a string. */
function tailWords(text: string, n: number): string {
  return wordsOf(text).slice(-n).join(" ").toLowerCase();
}

/**
 * Words that mark the memory as a childhood one: the people of a
 * childhood, its ages and rituals, and the remembering voice
 * itself ("I still", "I used to", "years later"). A line earns
 * nostalgia points for each distinct anchor it carries.
 */
const MEMORY_MARKERS = [
  "grandma", "grandmother", "grandfather", "grandpa", "mother", "father",
  "mom", "dad", "brother", "cousin", "friends", "the summer i turned",
  "when i was", "i used to", "i still", "every sunday", "every morning",
  "every winter", "every august", "every july", "before school",
  "before dawn", "last day of summer", "school bell", "years later", "grown",
];

/** Distinct childhood-memory markers present in the line. */
function memoryMarkers(text: string): string[] {
  return MEMORY_MARKERS.filter((m) => text.toLowerCase().includes(m));
}

/**
 * Concrete places the brief itself names as the good kind of
 * grounding — a kitchen, a porch, a dock, a street, an attic —
 * plus the same family. A memory that happens somewhere is a
 * memory; a memory that happens nowhere is a mood.
 */
const MEMORY_PLACES = [
  "kitchen",
  "porch",
  "stairs",
  "driveway",
  "dock",
  "attic",
  "lane",
  "corner store",
  "back steps",
  "dirt road",
  "big oak",
  "shore",
  "windowsill",
  "house",
  "street",
  "school",
];

/** Distinct concrete places present in the line. */
function memoryPlaces(text: string): string[] {
  return MEMORY_PLACES.filter((p) => text.toLowerCase().includes(p));
}

/**
 * Concrete times: months, seasons, hours, the repeating rituals
 * of a childhood week. A time pins the memory down the way a
 * place does — "every August" is a memory, "once" is a story.
 */
const MEMORY_TIMES = [
  "august",
  "july",
  "winter",
  "summer",
  "rainy",
  "dawn",
  "at three",
  "at six",
  "sunday",
  "morning",
  "afternoon",
  "evening",
  "every",
  "last day",
];

/** Distinct concrete times present in the line. */
function memoryTimes(text: string): string[] {
  return MEMORY_TIMES.filter((t) => text.toLowerCase().includes(t));
}

/**
 * Sensations the reader can feel with a body: smells, tastes,
 * sounds, textures, temperatures. The brief's own examples are
 * the smell of fresh rice and a summer evening; a line earns
 * grounding for each sense it actually wakes.
 */
const SENSATIONS = [
  "smell",
  "smelled",
  "taste",
  "hear",
  "heard",
  "sound",
  "song",
  "warm",
  "cold",
  "barefoot",
  "juice",
  "static",
  "thunder",
  "cicadas",
  "bell",
  "dust-light",
  "wood smoke",
  "wet earth",
  "tobacco",
  "motor oil",
  "mothballs",
  "rain",
];

/** Distinct sensations present in the line. */
function sensations(text: string): string[] {
  return SENSATIONS.filter((s) => text.toLowerCase().includes(s));
}

/**
 * Small honest details — the kind of thing only someone who was
 * there would remember: the crisped rice at the bottom of the
 * pot, the exact crack in the pavement, the red popsicle bought
 * on credit. Each one is a fingerprint of a real afternoon.
 */
const HONEST_DETAILS = [
  "crisped rice", "bottom of the pot", "crack in the pavement",
  "let go of his hand", "wet earth", "never once felt like cold",
  "through the static", "rice steaming", "tinny song", "coins warm",
  "motor oil", "worked the pedals", "clicked off at six",
  "locked the front door", "threw me off the dock", "lake water",
  "burnt ears", "red popsicle", "on credit", "knew my name",
  "school bell rang", "sewed my name", "humming the same song",
  "smell of her soap", "tin box of marbles", "none of us ever did",
  "mothballs", "dust-light", "called me down",
  "juice running down my chin", "shout to be heard",
  "wrapped around us both",
];

/** Distinct small honest details present in the line. */
function honestDetails(text: string): string[] {
  return HONEST_DETAILS.filter((d) => text.toLowerCase().includes(d));
}

/**
 * Greeting-card sentiment — phrases that tell the judge to feel
 * nostalgic instead of making him feel it. The brief warns that
 * sentimentality for its own sake does not count, and a line
 * that leans on it has no honest detail behind the feeling.
 */
const SENTIMENTAL_PHRASES = [
  "those were the days",
  "miss those days",
  "simpler times",
  "golden days",
  "cherished memories",
  "good old days",
  "forever in my heart",
  "innocent days",
  "precious moments",
  "how i miss",
  "i miss being",
  "take me back",
  "if only i could go back",
  "never forget those",
];

/** True when the line leans on greeting-card sentiment. */
function usesSentimentality(text: string): boolean {
  return containsAny(text, SENTIMENTAL_PHRASES);
}

/**
 * The warm ache that lingers: loss, absence, a promise nobody
 * kept, a smell that is still home. These are the endings a
 * reader carries out of the sentence.
 */
const ACHE_MARKERS = [
  "none of us ever did",
  "still the smell of home",
  "never once felt like cold",
  "let go of his hand",
  "whole world feel safe",
  "called me down for supper",
  "shout to be heard",
  "laughing from the shore",
  "always saved me",
  "still remember",
  "still taste",
  "same stitching",
  "my own daughter's coat",
  "when we were grown",
  "nobody ever locked",
  "used to",
  "every morning",
];

/** Distinct ache markers present anywhere in the line. */
function acheMarkers(text: string): string[] {
  return ACHE_MARKERS.filter((a) => text.toLowerCase().includes(a));
}

/** True when an ache marker sits inside the last eight words. */
function hasLateAche(text: string): boolean {
  const tail = tailWords(text, 8);
  return ACHE_MARKERS.some((a) => tail.includes(a));
}

/* ------------------------------------------------------------------ */
/* Criterion scores (0–10 each, brief order)                           */
/* ------------------------------------------------------------------ */

interface Scores {
  /** C1: a childhood memory that makes the judge feel nostalgic. */
  nostalgia: number;
  /** C2: grounded in a concrete place, time or sensation. */
  grounding: number;
  /** C3: sounds like it truly happened, small honest detail. */
  authenticity: number;
  /** C4: a single clean sentence, every word earning its place. */
  tightness: number;
  /** C5: a warm ache that lingers after the sentence ends. */
  lingering: number;
}

/**
 * A line with no concrete grounding at all — no place, no time,
 * no sensation — is an abstract memory, a summary of a feeling
 * rather than a remembered afternoon. Such a line is capped at 4
 * on nostalgia and at 3 on grounding.
 */
function isUngrounded(text: string): boolean {
  return (
    memoryPlaces(text).length === 0 &&
    memoryTimes(text).length === 0 &&
    sensations(text).length === 0
  );
}

/**
 * C1 — Nostalgia. A line earns its points by being, in its own
 * words, a childhood memory: the people of a childhood named,
 * the remembering voice present ("I still", "I used to"), and a
 * warm ache underneath. Two points per distinct memory marker
 * up to the cap, plus two for the ache that proves the memory
 * still lives in the writer. An ungrounded line is capped at 4,
 * because a memory with no place, time or sensation is a feeling
 * described, not a childhood recalled.
 */
function scoreNostalgia(c: Candidate): number {
  const markers = memoryMarkers(c.text);
  let score = Math.min(8, markers.length * 2);
  if (acheMarkers(c.text).length >= 1) score += 2;
  if (isUngrounded(c.text)) score = Math.min(score, 4);
  return Math.max(0, Math.min(10, score));
}

/**
 * C2 — Grounding. The brief's own yardstick: a kitchen, a summer
 * evening, the smell of fresh rice. A line scores two points for
 * each distinct grounding element across the three kinds — place,
 * time, sensation — so a line grounded in all three kinds beats
 * a line grounded in one, however vivid that one is.
 */
function scoreGrounding(c: Candidate): number {
  const places = memoryPlaces(c.text).length;
  const times = memoryTimes(c.text).length;
  const senses = sensations(c.text).length;
  const kinds = [places > 0, times > 0, senses > 0].filter(Boolean).length;
  let score = Math.min(10, 2 + (places + times + senses) * 1 + kinds);
  if (places + times + senses === 0) score = 3;
  if (kinds === 1) score = Math.min(score, 6);
  return Math.max(0, Math.min(10, score));
}

/**
 * C3 — Authenticity. A line sounds true in proportion to its
 * small honest details: two points per distinct detail up to the
 * cap, with a base of 2 for a line that at least names a person
 * and a place. A line with no honest detail at all is capped at
 * 4 — it may be pretty, but it reads like a card, not a memory.
 * Greeting-card sentiment costs 3 points here as well as on the
 * lingering ache, and a line that leans on it while carrying no
 * detail is capped at 3.
 */
function scoreAuthenticity(c: Candidate): number {
  const details = honestDetails(c.text);
  let score = Math.min(10, 2 + details.length * 2);
  if (details.length === 0) score = 4;
  if (usesSentimentality(c.text)) {
    score -= 3;
    if (details.length === 0) score = Math.min(score, 3);
  }
  return Math.max(0, Math.min(10, score));
}

/**
 * C4 — Tightness. The gate allows 280 characters; a line that
 * reads tight is shorter still. Full marks under 140 characters,
 * sliding down to 5 at the 280 cap — a line that needs two
 * breaths is a line that loses the room. A line over the cap
 * scores 0: it cannot be judged at all.
 */
function scoreTightness(c: Candidate): number {
  const len = [...c.text].length;
  if (len > 280) return 0;
  if (len <= 140) return 10;
  if (len <= 160) return 9;
  if (len <= 180) return 8;
  if (len <= 210) return 7;
  if (len <= 240) return 6;
  return 5;
}

/**
 * C5 — Lingering ache. Two points per distinct ache marker, with
 * the full bonus only when the ache lands late: an ache marker
 * inside the final eight words earns 4 extra, because the ache
 * that lingers is the one the sentence ends on. Greeting-card
 * sentiment costs 3 here too: "those were the days" is a demand
 * to feel, not a feeling that stays.
 */
function scoreLingering(c: Candidate): number {
  const aches = acheMarkers(c.text);
  let score = Math.min(6, aches.length * 2);
  if (hasLateAche(c.text)) score += 4;
  if (usesSentimentality(c.text)) score -= 3;
  return Math.max(0, Math.min(10, score));
}

/** Score a candidate on all five criteria, in the brief's order. */
function scoreCandidate(c: Candidate): Scores {
  return {
    nostalgia: scoreNostalgia(c),
    grounding: scoreGrounding(c),
    authenticity: scoreAuthenticity(c),
    tightness: scoreTightness(c),
    lingering: scoreLingering(c),
  };
}

/* ------------------------------------------------------------------ */
/* Winner selection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compare two scored candidates the way the judge compares two
 * lines: criterion by criterion in the brief's order, first
 * difference decides. Only when all five criteria tie does the
 * shorter line win.
 */
function compareScored(
  a: { candidate: Candidate; scores: Scores },
  b: { candidate: Candidate; scores: Scores },
): number {
  const order: (keyof Scores)[] = [
    "nostalgia",
    "grounding",
    "authenticity",
    "tightness",
    "lingering",
  ];
  for (const key of order) {
    if (a.scores[key] !== b.scores[key]) return b.scores[key] - a.scores[key];
  }
  const lenA = [...a.candidate.text].length;
  const lenB = [...b.candidate.text].length;
  if (lenA !== lenB) return lenA - lenB;
  return a.candidate.id.localeCompare(b.candidate.id);
}

/** Score every candidate, sort best first, and return the ranking. */
function rankCandidates(): { candidate: Candidate; scores: Scores }[] {
  const scored = CANDIDATES.map((candidate) => ({
    candidate,
    scores: scoreCandidate(candidate),
  }));
  scored.sort(compareScored);
  return scored;
}

/* ------------------------------------------------------------------ */
/* Gate verification                                                   */
/* ------------------------------------------------------------------ */

interface GateResult {
  lengthChars: number;
  lengthBytes: number;
  singleLine: boolean;
  validUtf8: boolean;
  notOnlyWhitespace: boolean;
  within280: boolean;
  passed: boolean;
}

/**
 * Verify the written file byte-for-byte against every gate the
 * sealed scorer applies: UTF-8 text of 1 to 280 characters, not
 * only whitespace. A single line means no newline characters
 * inside the entry; a trailing newline written by the file
 * writer is stripped before the check.
 */
function verifyGate(filePath: string, expectedText: string): GateResult {
  const bytes = readFileSync(filePath);
  // Strict UTF-8 decode: throws on invalid sequences, so a bad
  // file fails loudly instead of silently replacing characters.
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const text = decoded.replace(/\n$/, "");
  const lengthChars = [...text].length;
  const result: GateResult = {
    lengthChars,
    lengthBytes: bytes.length,
    singleLine: !text.includes("\n") && !text.includes("\r"),
    validUtf8: true,
    notOnlyWhitespace: text.trim().length > 0,
    within280: lengthChars >= 1 && lengthChars <= 280,
    passed: false,
  };
  result.passed =
    result.singleLine &&
    result.validUtf8 &&
    result.notOnlyWhitespace &&
    result.within280 &&
    text === expectedText;
  return result;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main(): void {
  const ranked = rankCandidates();

  console.log("Candidate ranking (criteria in the judge's order):");
  console.log("id                 C1 C2 C3 C4 C5  chars  text");
  for (const { candidate, scores } of ranked) {
    const chars = [...candidate.text].length;
    console.log(
      `${candidate.id.padEnd(18)} ${scores.nostalgia}  ${scores.grounding}  ` +
        `${scores.authenticity}  ${scores.tightness}  ${scores.lingering}  ` +
        `${String(chars).padStart(5)}  ${candidate.text}`,
    );
  }

  const winner = ranked[0];
  console.log("");
  console.log(`Winner: ${winner.candidate.id}`);
  console.log(`Line: ${winner.candidate.text}`);
  console.log(
    `Scores: nostalgia=${winner.scores.nostalgia} grounding=${winner.scores.grounding} ` +
      `authenticity=${winner.scores.authenticity} tightness=${winner.scores.tightness} ` +
      `lingering=${winner.scores.lingering}`,
  );

  // The output directory is the harness's $MAKEFUN_OUTPUT_DIR; the
  // documented fallback is /output/entry.txt.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text + "\n", "utf8");
  console.log(`Wrote ${outPath}`);

  // Read it back and verify byte-for-byte against every gate.
  const gate = verifyGate(outPath, winner.candidate.text);
  console.log(
    `Gate: chars=${gate.lengthChars} bytes=${gate.lengthBytes} ` +
      `singleLine=${gate.singleLine} validUtf8=${gate.validUtf8} ` +
      `notOnlyWhitespace=${gate.notOnlyWhitespace} within280=${gate.within280} ` +
      `passed=${gate.passed}`,
  );
  if (!gate.passed) {
    console.error("GATE FAILED: entry.txt does not satisfy every gate.");
    process.exit(1);
  }
  console.log("Gate passed: entry is valid.");
}

main();
