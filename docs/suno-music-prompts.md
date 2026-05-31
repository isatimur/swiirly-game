# Suno AI prompts — Swiirl looped game music

Tuned to the game's identity: a satirical corporate-startup platformer with a playful
Mario-overworld bounce, **measured but lively** tempos, and a light shuffle/swing groove.
The keys/moods below mirror the existing synth tracks so Suno results feel coherent and
can drop in as drop-in replacements later.

## How to use these in Suno (loop tips)

- **Instrumental:** leave the lyrics box empty or put `[Instrumental]`; keep "no vocals" in
  the style.
- **Loopable:** ask for "seamless loop, steady groove, no big intro or outro." Suno won't
  emit a perfect loop on its own — generate ~30–60s, then in any editor (Audacity, etc.)
  trim to a clean bar boundary and add a tiny (~30–50 ms) crossfade between the loop ends.
- **Tempo:** the `~BPM` matters — Suno respects it loosely; it sets the feel. These are the
  game's current measured tempos.
- **Consistency:** for backgrounds, avoid "epic build", "drop", "breakdown" — they make
  loops jarring. You want one steady section.
- **Style box vs lyrics:** paste the **Prompt** into Suno's *Style of Music* field.

---

## Background loops (one per scene/level)

### 1. Title / Menu — "Swiirl Lobby"  · ~80 BPM · C major · mellow, welcoming
> Warm mellow 16-bit chiptune lounge groove, relaxed shuffle, gentle pulsing bass and soft
> square-wave melody, friendly optimistic startup vibe, light hi-hats, cozy and inviting,
> C major, ~80 BPM, instrumental, seamless loop, steady groove, no vocals.

### 2. Choose Your Path (StorySelect) — "Crossroads"  · ~84 BPM · hopeful, contemplative
> Reflective yet hopeful chiptune with warm pads and a soft arpeggio, a sense of choosing
> your destiny, gentle swing, light percussion, major with a hint of tension, ~84 BPM,
> instrumental, looping, steady, no vocals.

### 3. Level 1 — Community Park — "Sunny Start"  · ~98 BPM · F major · bright overworld bounce
> Bright bouncy Super Mario-style overworld chiptune, playful square-lead melody with a
> shuffle swing, walking bass, snappy 8-bit drums, sunny and carefree, classic platformer
> energy, F major, ~98 BPM, instrumental, seamless loop, no vocals.

### 4. Level 2 — Corporate Maze — "Cubicle Shuffle"  · ~90 BPM · A minor · cool, wry
> Cool mellow chiptune with a wry corporate jazz-funk twist, smooth electric-piano-style
> synth, laid-back swung groove, muted bass, slightly mysterious but groovy, A minor,
> ~90 BPM, instrumental, looping, steady, no vocals.

### 5. Level 3 — Executive Summit — "Climbing the Ladder"  · ~108 BPM · D dorian · tense, driving
> Tense driving chiptune with pulsing 16th-note arpeggios, urgent but controlled, dorian
> mode, rising pressure, tight percussion, focused platformer momentum, ~108 BPM,
> instrumental, seamless loop, no vocals.

### 6. Level 4 — Brand HQ — "Synergy Overdrive"  · ~116 BPM · E phrygian · edgy, syncopated
> Edgy syncopated chiptune with stuttering rhythms and a dark phrygian melody, glitchy
> stabs, punchy bass, slightly chaotic corporate-machine energy, ~116 BPM, instrumental,
> looping, steady, no vocals.

### 7. Level 5 — Data Lake — "Cold Metrics"  · ~112 BPM · G minor · ominous, grand
> Ominous atmospheric chiptune with broad minor chord stabs, cold and grand, looming
> corporate dread over a steady pulse, boss-approach tension, G minor, ~112 BPM,
> instrumental, seamless loop, no vocals.

### 8. Boss — "The Suits Strike Back"  · ~132 BPM · chromatic · menacing chiptune-rock
> Intense chiptune-rock boss battle, driving distorted square lead, chromatic descending
> menace, heavy four-on-the-floor 8-bit drums and pounding bass, urgent and villainous,
> final-boss adrenaline, ~132 BPM, instrumental, looping, no vocals.

### 9. Level 6 — Up and to the Right — "Hockey Stick"  · ~116 BPM · F lydian · triumphant climb
> Triumphant soaring chiptune with bright ascending arpeggios, lydian shimmer, hopeful and
> victorious final ascent, uplifting lead and shining bells, ~116 BPM, instrumental,
> seamless loop, no vocals.

---

## Short stings (NOT looped — one-shots)

### 10. Level Complete fanfare
> Short triumphant 8-bit victory fanfare, ~4 seconds, bright major resolve, celebratory,
> instrumental, no vocals, clean ending.

### 11. Game Over
> Short bittersweet 8-bit game-over jingle, gentle descending melody, ~3 seconds,
> instrumental, no vocals, clean ending.

### 12. Ending / Credits — "Footnote"  · ~88 BPM · warm, reflective
> Warm reflective chiptune end-credits theme, nostalgic and heartfelt, soft melody over
> gentle pads, mid-tempo, a satisfying resolution, ~88 BPM, instrumental, looping,
> no vocals.

---

## Optional per-storyline finale flavors

If you want the four story paths' finales to feel distinct, branch the **Boss** prompt:
- **Idealist → The Mirror:** "introspective, eerie mirror-boss chiptune, your own theme
  turned cold and minor, ~126 BPM."
- **Hustler → The Burnout:** "frantic overcaffeinated chiptune-rock, manic, burning out,
  ~138 BPM."
- **Rebel → The Sellout You:** "dark anthemic chiptune-rock, defiant, ~132 BPM."
- **Founder → The Founder You Were:** "bittersweet heroic chiptune, grand and personal,
  ~128 BPM."

---

## Wiring them in (when you have the files)

The game currently synthesizes all music in `play/src/audio.js` (no audio files ship). To use
Suno tracks instead: drop the exported loops in `play/assets/audio/`, preload them in
`Boot.js`, and swap the `Music` object's step-sequencer for Phaser sound playback (with a
short crossfade on track change). Say the word and I'll do that swap — it's a clean, contained
change.
