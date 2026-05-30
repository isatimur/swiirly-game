// Node smoke test for the pure logic in play/src/story.js.
// Run: node tools/story.test.mjs   (exit 0 = pass)
import assert from "node:assert/strict";
import { STORYLINES, PATHS, THRESHOLDS, resolveEnding } from "../play/src/story.js";

// --- per-path content shape + ending bands ------------------------------
for (const path of PATHS) {
  const sl = STORYLINES[path];
  assert.ok(sl, `path ${path} exists in STORYLINES`);

  // opening is a non-empty array
  assert.ok(Array.isArray(sl.opening) && sl.opening.length > 0, `${path} opening non-empty`);

  // interludes 1..5: each exactly one 2-option choice with one sell + one true
  for (let lvl = 1; lvl <= 5; lvl++) {
    const beats = sl.interludes[lvl];
    assert.ok(Array.isArray(beats) && beats.length > 0, `${path} interlude ${lvl} exists`);
    const choices = beats.filter(b => b.type === "choice");
    assert.equal(choices.length, 1, `${path} interlude ${lvl} has exactly one choice`);
    assert.equal(choices[0].options.length, 2, `${path} interlude ${lvl} choice has 2 options`);
    const deltas = choices[0].options.map(o => o.mission);
    assert.ok(deltas.some(d => d < 0) && deltas.some(d => d > 0),
      `${path} interlude ${lvl} has a sell (<0) and a true (>0) option`);
  }

  // all three endings have content
  for (const id of ["sellout", "compromised", "true"]) {
    assert.ok(Array.isArray(sl.endings[id]) && sl.endings[id].length > 0, `${path} ending ${id} has beats`);
  }

  // --- resolveEnding bands using this path's thresholds ---
  const t = THRESHOLDS[path];
  const boss = sl.finaleBoss.variant;
  const trueBoss = sl.finaleBossTrue.variant;
  assert.deepEqual(resolveEnding(path, t.compromised - 1),
    { endingId: "sellout", bossVariant: boss }, `${path} below compromised -> sellout`);
  assert.deepEqual(resolveEnding(path, t.compromised),
    { endingId: "compromised", bossVariant: boss }, `${path} at compromised -> compromised`);
  assert.deepEqual(resolveEnding(path, t.trueBoss - 1),
    { endingId: "compromised", bossVariant: boss }, `${path} just below trueBoss -> compromised`);
  assert.deepEqual(resolveEnding(path, t.trueBoss),
    { endingId: "true", bossVariant: trueBoss }, `${path} at trueBoss -> true`);

  // --- reachability: all-min lands sellout, all-max lands true ---
  const choiceOf = lvl => sl.interludes[lvl].find(b => b.type === "choice");
  const allSell = [1,2,3,4,5].reduce((s, l) => s + Math.min(...choiceOf(l).options.map(o => o.mission)), 0);
  const allTrue = [1,2,3,4,5].reduce((s, l) => s + Math.max(...choiceOf(l).options.map(o => o.mission)), 0);
  assert.equal(resolveEnding(path, allSell).endingId, "sellout", `${path} all-sell -> sellout`);
  assert.equal(resolveEnding(path, allTrue).endingId, "true", `${path} all-true -> true`);
}

// --- dual-signature shim: single number behaves like idealist ----------
assert.deepEqual(resolveEnding(11),  { endingId: "true",    bossVariant: "mirror" });
assert.deepEqual(resolveEnding(-11), { endingId: "sellout", bossVariant: "board" });

console.log("story.js smoke tests passed");
