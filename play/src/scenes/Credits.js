// Credits scene — plays after the bonus level (level 6) wraps. Scrolling
// list of contributors and inspirations. Editable: add or reorder entries
// in the CREDITS array below.

import { Music } from "../audio.js";

const CREDITS = [
  { kind: "title",   text: "SWIIRL" },
  { kind: "blank" },
  { kind: "header",  text: "DESIGN  ·  CODE  ·  ART" },
  { kind: "name",    text: "Timur Isachenko" },
  { kind: "blank" },
  { kind: "header",  text: "INSPIRED  BY  COLLEAGUES" },
  { kind: "name",    text: "Daniel Mohanrao  ·  CEO" },
  { kind: "name",    text: "Anna Istomina  ·  Head of Product Design" },
  { kind: "name",    text: "Charles Eklund  ·  COO" },
  { kind: "blank" },
  { kind: "header",  text: "STANDING  ON  SHOULDERS" },
  { kind: "name",    text: "Shigeru Miyamoto — Super Mario Bros." },
  { kind: "name",    text: "Maddy Thorson — Celeste" },
  { kind: "name",    text: "Team Cherry — Hollow Knight" },
  { kind: "name",    text: "Pascal Campion — surprise moments" },
  { kind: "blank" },
  { kind: "header",  text: "TECH" },
  { kind: "name",    text: "Phaser 3 — game engine" },
  { kind: "name",    text: "Web Audio API — every SFX and chiptune note" },
  { kind: "name",    text: "Sharp — SVG-to-PNG asset pipeline" },
  { kind: "blank" },
  { kind: "header",  text: "SPECIAL  THANKS" },
  { kind: "name",    text: "Every Swiirl who tested a build" },
  { kind: "name",    text: "Anyone who hit S-rank on the Daily" },
  { kind: "blank" },
  { kind: "blank" },
  { kind: "title",   text: "thank  you  for  playing" },
  { kind: "blank" },
  { kind: "note",    text: "press  SPACE  to  start  a  new  run" },
];

export class CreditsScene extends Phaser.Scene {
  constructor() { super("Credits"); }

  create() {
    const { width, height } = this.scale;

    // Soft purple gradient backdrop, same family as Menu/LevelComplete.
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f2e);
    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height).setAlpha(0.45);

    // Slow drifting clouds for atmosphere.
    for (let i = 0; i < 3; i++) {
      const c = this.add.image(
        Phaser.Math.Between(120, width - 120),
        Phaser.Math.Between(40, 200),
        "cloud"
      ).setAlpha(0.4).setScale(Phaser.Math.FloatBetween(0.7, 1.2));
      this.tweens.add({
        targets: c, x: c.x + 80,
        duration: 14000 + Math.random() * 4000,
        yoyo: true, repeat: -1,
      });
    }

    // Build the scrolling column. Each entry is a separate text object so
    // we get free vertical spacing per kind.
    const container = this.add.container(width / 2, height + 40);
    let yCursor = 0;
    const styles = {
      title:  { fontSize: "44px", fontStyle: "900", color: "#FFD24A", letterSpacing: 4, gap: 80 },
      header: { fontSize: "16px", fontStyle: "900", color: "#dcc7f2", letterSpacing: 8, gap: 50 },
      name:   { fontSize: "22px", fontStyle: "700", color: "#ffffff", letterSpacing: 1, gap: 38 },
      note:   { fontSize: "13px", fontStyle: "400", color: "#b892e0", letterSpacing: 2, gap: 30 },
      blank:  { gap: 22 },
    };
    for (const entry of CREDITS) {
      const s = styles[entry.kind] ?? styles.name;
      if (entry.kind !== "blank") {
        const t = this.add.text(0, yCursor, entry.text, {
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: s.fontSize,
          fontStyle: s.fontStyle,
          color: s.color,
          stroke: entry.kind === "title" ? "#5C3BA3" : null,
          strokeThickness: entry.kind === "title" ? 6 : 0,
          letterSpacing: s.letterSpacing,
        }).setOrigin(0.5, 0);
        container.add(t);
      }
      yCursor += s.gap;
    }
    const totalHeight = yCursor;

    // Scroll the whole column from below the screen to above it.
    const scrollDuration = Math.max(20000, totalHeight * 22);  // ~22ms per px
    this.tweens.add({
      targets: container,
      y: -totalHeight - 40,
      duration: scrollDuration,
      ease: "Linear",
    });

    // Mellow chiptune backdrop. Reuse the menu track since it's the right
    // tempo and tone for a wind-down moment.
    Music.play("menu");
    Music.setIntensity(0.6);

    // After the credits, the only path is to start a fresh run from
    // Level 1 — bypass the Menu so settings + ranks aren't a detour.
    // CharacterSelect → Game (level 1, the default).
    const playAgain = () => {
      if (window.__pauseModalOpen) return;
      // Credits are reached after a story ending or an arcade finish; the
      // "play again" path is a fresh ARCADE run, so clear the story flag
      // (a story run finished here already cleared its save) — otherwise the
      // stale storyMode would re-enter the story branch in CharacterSelect.
      this.registry.set("storyMode", false);
      this.cameras.main.fadeOut(420, 26, 15, 46);
      this.time.delayedCall(440, () => this.scene.start("CharacterSelect"));
    };
    this.input.keyboard.once("keydown-SPACE", playAgain);
    this.input.keyboard.once("keydown-ENTER", playAgain);
    this.input.once("pointerdown", playAgain);
    this.game.events.once("gamepad-cross", playAgain);
    this.events.once("shutdown", () => this.game.events.off("gamepad-cross", playAgain));

    // Auto-advance after the scroll finishes (with a small post-tail beat).
    this.time.delayedCall(scrollDuration + 1200, () => playAgain());

    this.cameras.main.fadeIn(500, 26, 15, 46);
  }
}
