// play/src/scenes/Cutscene.js
// Lightweight story scene: backdrop + tinted portrait + typewriter dialogue
// box, advanced by tap / SPACE / gamepad. A "choice" beat renders two buttons;
// picking one applies its Mission delta, persists, and advances. When the beat
// list is exhausted, starts `next` (and launches HUD when next is "Game").
//
// init({ beats, next, nextData }):
//   beats    - array of beats from STORY (see story.js)
//   next     - scene key to start at the end ("Game" or "Credits")
//   nextData - payload forwarded to `next` (e.g. { level: 2 })

import { SFX, Music } from "../audio.js";
import { saveStory } from "../story.js";

export class CutsceneScene extends Phaser.Scene {
  constructor() { super("Cutscene"); }

  init(data) {
    this.beats = data?.beats ?? [];
    this.nextScene = data?.next ?? "Menu";
    this.nextData = data?.nextData ?? {};
    this.idx = 0;
    this.typing = false;
    this.choiceButtons = [];
    this.typeEvent = null;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300, 26, 15, 46);
    Music.setIntensity(0.3);

    // Backdrop (reuse world art).
    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1).setScale(0.7).setAlpha(0.4);

    // Portrait (left of the dialogue panel) on a soft spotlight backdrop.
    this.add.ellipse(width * 0.26, height * 0.5 + 6, 212, 224, 0x140a26, 0.5)
      .setStrokeStyle(3, 0x5C3BA3, 0.8);
    this.portrait = this.add.image(width * 0.26, height * 0.5, "cloud").setScale(0.7);

    // Dialogue panel (bottom band).
    const panelTop = height - 190;
    const panel = this.add.graphics();
    panel.fillStyle(0x140a26, 0.94);
    panel.lineStyle(3, 0x5C3BA3, 1);
    panel.fillRoundedRect(60, panelTop, width - 120, 150, 16);
    panel.strokeRoundedRect(60, panelTop, width - 120, 150, 16);
    // Gold accent bar beside the speaker/body text.
    panel.fillStyle(0xffd24a, 0.9);
    panel.fillRoundedRect(74, panelTop + 16, 4, 118, 2);

    this.speakerText = this.add.text(86, panelTop + 16, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "16px", fontStyle: "900",
      color: "#ffd24a", letterSpacing: 3,
    });
    this.bodyText = this.add.text(86, panelTop + 48, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "19px", color: "#ffffff",
      wordWrap: { width: width - 200 }, lineSpacing: 6,
    });
    this.hint = this.add.text(width - 96, panelTop + 124, "▶  tap / SPACE", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#dcc7f2",
    }).setOrigin(1, 0.5).setAlpha(0);

    // Advance handlers.
    const advance = () => this.onAdvance();
    this.input.keyboard.on("keydown-SPACE", advance);
    this.input.keyboard.on("keydown-ENTER", advance);
    // Ignore clicks that land on a choice button (they have their own handler).
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (currentlyOver && currentlyOver.length) return;
      this.onAdvance();
    });
    const padAdvance = () => { if (!window.__pauseModalOpen) this.onAdvance(); };
    this.game.events.on("gamepad-cross", padAdvance);
    this.events.once("shutdown", () => this.game.events.off("gamepad-cross", padAdvance));

    this.showBeat();
  }

  portraitTexture(portrait) {
    const skin = this.registry.get("character")?.spriteKey ?? "beanie";
    if (portrait === "player" || portrait === "mirror") {
      return this.textures.exists(`${skin}_idle`) ? `${skin}_idle` : "idle";
    }
    if (portrait === "brand") return "brand_happy";
    return this.textures.exists(portrait) ? portrait : "cloud";
  }

  showBeat() {
    const beat = this.beats[this.idx];
    if (!beat) { this.finish(); return; }

    // A beat without its own portrait (e.g. a choice) keeps the previous
    // speaker's portrait rather than blanking to the cloud placeholder.
    if (beat.portrait) {
      const key = this.portraitTexture(beat.portrait);
      this.portrait.setTexture(key);
      this.portrait.clearTint();
      if (beat.portrait === "mirror") this.portrait.setTint(0x444466);
      this.portrait.setScale(key === "brand_happy" ? 0.9 : 0.7);
    }

    if (beat.type === "choice") { this.showChoice(beat); return; }

    // line beat: typewriter reveal.
    this.clearChoices();
    this.speakerText.setText(beat.speaker ?? "");
    this.bodyText.setText("");
    this.hint.setAlpha(0);
    this.typing = true;
    this.fullText = beat.text ?? "";
    this.charIdx = 0;
    if (this.typeEvent) this.typeEvent.remove();
    this.typeEvent = this.time.addEvent({
      delay: 22, repeat: Math.max(0, this.fullText.length - 1),
      callback: () => {
        this.charIdx++;
        this.bodyText.setText(this.fullText.slice(0, this.charIdx));
        if (this.charIdx % 3 === 0) SFX.collect();
        if (this.charIdx >= this.fullText.length) { this.typing = false; this.hint.setAlpha(1); }
      },
    });
    if (this.fullText.length === 0) { this.typing = false; this.hint.setAlpha(1); }
  }

  showChoice(beat) {
    this.typing = false;
    this.speakerText.setText("");
    this.bodyText.setText(beat.prompt ?? "");
    this.hint.setAlpha(0);
    this.clearChoices();

    const { width, height } = this.scale;
    const btnW = 300, gap = 40, btnY = height - 250;
    const totalW = 2 * btnW + gap;
    const startX = (width - totalW) / 2 + btnW / 2;
    beat.options.forEach((opt, i) => {
      const bx = startX + i * (btnW + gap);
      const bg = this.add.rectangle(bx, btnY, btnW, 64, 0x2a1850, 0.95)
        .setStrokeStyle(3, 0xffd24a).setInteractive({ useHandCursor: true });
      const label = this.add.text(bx, btnY, opt.label, {
        fontFamily: "system-ui, sans-serif", fontSize: "17px", fontStyle: "700",
        color: "#ffffff", align: "center", wordWrap: { width: btnW - 24 },
      }).setOrigin(0.5);
      bg.on("pointerover", () => bg.setFillStyle(0x3a2470, 1));
      bg.on("pointerout",  () => bg.setFillStyle(0x2a1850, 0.95));
      bg.on("pointerdown", () => this.pickChoice(opt));
      this.choiceButtons.push(bg, label);
    });
  }

  pickChoice(opt) {
    SFX.win();
    const mission = (this.registry.get("storyMission") ?? 0) + (opt.mission ?? 0);
    this.registry.set("storyMission", mission);
    const path = this.nextData?.path ?? this.registry.get("storyPath") ?? "idealist";
    const level = this.nextData?.level ?? 1;       // the level this cutscene leads into
    const character = this.registry.get("character")?.id ?? null;
    saveStory({ path, mission, level, character });
    this.clearChoices();
    this.idx++;
    this.showBeat();
  }

  clearChoices() {
    this.choiceButtons.forEach(o => o.destroy());
    this.choiceButtons = [];
  }

  onAdvance() {
    if (window.__pauseModalOpen) return;
    const beat = this.beats[this.idx];
    if (beat?.type === "choice") return;            // choices need a button click
    if (this.typing) {                               // fast-forward typewriter
      if (this.typeEvent) this.typeEvent.remove();
      this.bodyText.setText(this.fullText);
      this.typing = false;
      this.hint.setAlpha(1);
      return;
    }
    this.idx++;
    this.showBeat();
  }

  finish() {
    this.cameras.main.fadeOut(300, 26, 15, 46);
    this.time.delayedCall(320, () => {
      if (this.nextScene === "Game") {
        this.scene.start("Game", this.nextData);
        this.scene.launch("HUD");
      } else {
        this.scene.start(this.nextScene, this.nextData);
      }
    });
  }
}
