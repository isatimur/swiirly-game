// Node smoke test for the pure logic in play/src/story.js.
// Run: node tools/story.test.mjs   (exit 0 = pass)
import assert from "node:assert/strict";
import { STORY, THRESHOLDS, resolveEnding } from "../play/src/story.js";

// --- resolveEnding bands (contiguous, boundaries inclusive at the low edge) ---
assert.deepEqual(resolveEnding(-11), { endingId: "sellout", bossVariant: "board" });
assert.deepEqual(resolveEnding(-3),  { endingId: "sellout", bossVariant: "board" });
assert.deepEqual(resolveEnding(THRESHOLDS.compromised),     { endingId: "compromised", bossVariant: "board" }); // -2 inclusive
assert.deepEqual(resolveEnding(0),   { endingId: "compromised", bossVariant: "board" });
assert.deepEqual(resolveEnding(THRESHOLDS.trueBoss - 1),    { endingId: "compromised", bossVariant: "board" }); // 4
assert.deepEqual(resolveEnding(THRESHOLDS.trueBoss),        { endingId: "true", bossVariant: "mirror" });        // 5 inclusive
assert.deepEqual(resolveEnding(11), { endingId: "true", bossVariant: "mirror" });

// --- content shape: 5 interludes, each exactly one 2-option choice ---
for (let lvl = 1; lvl <= 5; lvl++) {
  const beats = STORY.interludes[lvl];
  assert.ok(Array.isArray(beats) && beats.length > 0, `interlude ${lvl} exists`);
  const choices = beats.filter(b => b.type === "choice");
  assert.equal(choices.length, 1, `interlude ${lvl} has exactly one choice`);
  assert.equal(choices[0].options.length, 2, `interlude ${lvl} choice has 2 options`);
  const deltas = choices[0].options.map(o => o.mission);
  assert.ok(deltas.some(d => d < 0) && deltas.some(d => d > 0),
    `interlude ${lvl} has a sell (<0) and a true (>0) option`);
}

// --- all three endings have content ---
for (const id of ["sellout", "compromised", "true"]) {
  assert.ok(Array.isArray(STORY.endings[id]) && STORY.endings[id].length > 0, `ending ${id} has beats`);
}

// --- reachability: all-sell lands sellout, all-true lands true ---
const choiceOf = lvl => STORY.interludes[lvl].find(b => b.type === "choice");
const allSell = [1,2,3,4,5].reduce((s, l) => s + Math.min(...choiceOf(l).options.map(o => o.mission)), 0);
const allTrue = [1,2,3,4,5].reduce((s, l) => s + Math.max(...choiceOf(l).options.map(o => o.mission)), 0);
assert.equal(resolveEnding(allSell).endingId, "sellout");
assert.equal(resolveEnding(allTrue).endingId, "true");

console.log("story.js smoke tests passed");
