// Title screen. Shows Swiirl bobbing in front of a Mario-ish title bar.
// Press Space / click to enter the level.

import { VIEW } from "../config.js";
import { SFX, Music } from "../audio.js";
import { hasStorySave, loadStory, clearStory, getEndingsSeen } from "../story.js";
import { getCharacter } from "../characters.js";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    const { width, height } = this.scale;

    // Mellow menu chiptune. Music.play is a no-op if the same track is
    // already playing (e.g. coming back from CharacterSelect).
    Music.play("menu");
    Music.setIntensity(1.0);

    // Sky background.
    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1)
      .setScale(0.7, 0.7)
      .setAlpha(0.55);

    // Drifting clouds.
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(Phaser.Math.Between(120, width - 120), Phaser.Math.Between(80, 220), "cloud")
        .setAlpha(0.7).setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      this.tweens.add({
        targets: c,
        x: c.x + Phaser.Math.Between(40, 120),
        duration: Phaser.Math.Between(8000, 16000),
        yoyo: true,
        repeat: -1,
      });
    }

    // Title — slides down from above on enter.
    const title = this.add.text(width / 2, 160, "SWIIRL", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "108px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 10, color: "#1a0f2e", blur: 20, fill: true },
    }).setOrigin(0.5).setAlpha(0).setY(100);

    const subtitle = this.add.text(width / 2, 248, "5  LEVELS  ·  DELIVER  INSIGHTS", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "22px",
      fontStyle: "700",
      color: "#FFD24A",
      stroke: "#5C3BA3",
      strokeThickness: 4,
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.add.text(width / 2, 292,
      "Fight incompetence. Bring insights to brands.", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "18px",
      color: "#dcc7f2",
    }).setOrigin(0.5).setAlpha(0.85);

    // Entrance animations — staggered slide-in (150–300ms each, ease-out).
    this.tweens.add({ targets: title,    alpha: 1, y: 160, duration: 350, ease: "Back.easeOut" });
    this.tweens.add({ targets: subtitle, alpha: 1,         duration: 260, ease: "Quad.easeOut", delay: 120 });

    // Idle bob after entrance.
    this.time.delayedCall(400, () => {
      this.tweens.add({ targets: title, y: 166, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });

    // Hero in the center.
    const hero = this.add.image(width / 2, height / 2 + 70, "idle").setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: hero, alpha: 1, duration: 280, ease: "Quad.easeOut", delay: 200 });
    this.tweens.add({ targets: hero, y: hero.y - 14, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: 280 });

    // Sparkles around hero.
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sx = width / 2 + Math.cos(angle) * 70;
      const sy = height / 2 + 70 + Math.sin(angle) * 50;
      const sp = this.add.image(sx, sy, "sparkle").setScale(0.5).setAlpha(0);
      this.tweens.add({
        targets: sp, alpha: 0.8, scale: 0.9,
        duration: 800 + i * 200,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        delay: i * 180,
      });
    }

    // Arcade prompt — secondary to the STORY MODE button below the hero.
    const press = this.add.text(width / 2, height - 132,
      "or press   SPACE   /   click   for   Arcade", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "16px",
      color: "#ffffff",
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0.7);
    this.tweens.add({ targets: press, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // Controls — updated to include slide.
    this.add.text(width / 2, height - 30,
      "← → move    SHIFT run    SPACE jump (×2 double)    SHIFT+↓ slide    R restart    M mute", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      color: "#b892e0",
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Best run badge.
    const best = +(localStorage.getItem("swiirl.bestInsights") || 0);
    if (best > 0) {
      const badge = this.add.text(width / 2, 312,
        `★  BEST  ${best}  insights  ★`, {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "14px",
        color: "#FFD24A",
        stroke: "#5C3BA3",
        strokeThickness: 3,
        letterSpacing: 4,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: badge, alpha: 1, duration: 300, ease: "Quad.easeOut", delay: 350 });
    }

    // Per-level rank recap row — 5 small chips colored by best rank earned.
    // Shows even when no ranks are stored (— placeholders) once the player
    // has at least one best-insights run, so they see what's tracked.
    const RANK_COLORS = { S: "#ffd24a", A: "#7bd389", B: "#7dc4ff", C: "#b892e0" };
    const ranks = [1, 2, 3, 4, 5].map(n => localStorage.getItem(`swiirl.bestRank.${n}`));
    if (ranks.some(r => r != null)) {
      const rowY = 356;
      this.add.text(width / 2, rowY - 20, "YOUR  RANKS", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        color: "#b892e0",
        letterSpacing: 5,
      }).setOrigin(0.5);
      const chipW = 44, gap = 8;
      const totalW = ranks.length * chipW + (ranks.length - 1) * gap;
      const startX = (width - totalW) / 2 + chipW / 2;
      ranks.forEach((r, i) => {
        const cx = startX + i * (chipW + gap);
        const color = r ? RANK_COLORS[r] : "#3a2860";
        const chip = this.add.rectangle(cx, rowY, chipW, 30, 0x1a0f2e, 0.55)
          .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
        this.add.text(cx, rowY, r ?? "—", {
          fontFamily: "system-ui, sans-serif",
          fontSize: r ? "16px" : "14px",
          fontStyle: r ? "900" : "400",
          color: r ? color : "#5C3BA3",
        }).setOrigin(0.5);
      });
    }

    // --- Arcade start (existing behavior) ---
    let starting = false;
    const startArcade = () => {
      if (window.__pauseModalOpen || starting) return;
      starting = true;
      this.registry.set("storyMode", false);
      SFX.collect();
      this.cameras.main.fadeOut(420, 26, 15, 46);
      this.time.delayedCall(440, () => this.scene.start("CharacterSelect"));
    };

    // --- Story start / continue ---
    const startStory = () => {
      if (window.__pauseModalOpen || starting) return;
      starting = true;
      this.registry.set("storyMode", true);
      SFX.collect();
      if (hasStorySave()) {
        const s = loadStory();
        this.registry.set("storyMission", s.mission);
        this.registry.set("character", getCharacter(s.character));
        this.cameras.main.fadeOut(420, 26, 15, 46);
        this.time.delayedCall(440, () => {
          this.scene.start("Game", { level: s.level });
          this.scene.launch("HUD");
        });
      } else {
        clearStory();
        this.registry.set("storyMission", 0);
        this.cameras.main.fadeOut(420, 26, 15, 46);
        this.time.delayedCall(440, () => this.scene.start("CharacterSelect"));
      }
    };

    // SPACE / ENTER / gamepad-× = arcade. A pointer click counts as arcade
    // ONLY when it doesn't land on an interactive button (e.g. the Story
    // button or feedback prompt have their own handlers).
    this.input.keyboard.once("keydown-SPACE", startArcade);
    this.input.keyboard.once("keydown-ENTER", startArcade);
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (currentlyOver && currentlyOver.length) return;
      startArcade();
    });
    this.game.events.once("gamepad-cross", startArcade);
    this.events.once("shutdown", () => this.game.events.off("gamepad-cross", startArcade));

    // --- Story Mode button ---
    const storyLabel = hasStorySave() ? "▶  CONTINUE  STORY" : "▶  STORY  MODE";
    const sBtnY = height - 175;
    const sBtn = this.add.rectangle(width / 2, sBtnY, 320, 52, 0x2a1850, 0.95)
      .setStrokeStyle(3, 0xffd24a).setInteractive({ useHandCursor: true });
    const sTxt = this.add.text(width / 2, sBtnY, storyLabel, {
      fontFamily: "system-ui, sans-serif", fontSize: "18px", fontStyle: "900",
      color: "#ffd24a", letterSpacing: 3,
    }).setOrigin(0.5);
    sBtn.on("pointerover", () => sBtn.setFillStyle(0x3a2470, 1));
    sBtn.on("pointerout",  () => sBtn.setFillStyle(0x2a1850, 0.95));
    sBtn.on("pointerdown", startStory);

    // --- Endings gallery (3 badges, locked until earned) ---
    const seen = getEndingsSeen();
    const endingDefs = [
      { id: "sellout",     label: "SELLOUT",       color: "#e0556b" },
      { id: "compromised", label: "COMPROMISED",   color: "#e8c98a" },
      { id: "true",        label: "TRUE BELIEVER", color: "#7bd389" },
    ];
    const galleryY = height - 92;
    this.add.text(width / 2, galleryY - 18, "ENDINGS", {
      fontFamily: "system-ui, sans-serif", fontSize: "10px",
      color: "#b892e0", letterSpacing: 5,
    }).setOrigin(0.5);
    const badgeW = 130, bgap = 10;
    const gTotalW = endingDefs.length * badgeW + (endingDefs.length - 1) * bgap;
    const gStartX = (width - gTotalW) / 2 + badgeW / 2;
    endingDefs.forEach((e, i) => {
      const cx = gStartX + i * (badgeW + bgap);
      const unlocked = seen.includes(e.id);
      const color = unlocked ? e.color : "#3a2860";
      this.add.rectangle(cx, galleryY + 6, badgeW, 26, 0x1a0f2e, 0.55)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
      this.add.text(cx, galleryY + 6, unlocked ? e.label : "🔒", {
        fontFamily: "system-ui, sans-serif",
        fontSize: unlocked ? "11px" : "13px",
        fontStyle: "700",
        color: unlocked ? color : "#5C3BA3",
        letterSpacing: 2,
      }).setOrigin(0.5);
    });

    // One-time feedback prompt — surfaces after the player has completed
    // 3 full runs (i.e. beaten Level 5 three times). Shown as a Phaser
    // card so it lives in the same render layer as the rest of the menu.
    const runsCompleted = +(localStorage.getItem("swiirl.runsCompleted") || 0);
    const feedbackGiven = localStorage.getItem("swiirl.feedbackGiven") === "1";
    if (runsCompleted >= 3 && !feedbackGiven) {
      this.time.delayedCall(900, () => this._showFeedbackPrompt());
    }
  }

  _showFeedbackPrompt() {
    const { width, height } = this.scale;
    const cardX = width / 2;
    const cardY = height - 230;
    const cardW = 380, cardH = 180;

    const card = this.add.container(cardX, cardY).setAlpha(0).setDepth(900);
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0f2e, 0.94);
    bg.lineStyle(2, 0xb892e0, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
    const title = this.add.text(0, -cardH / 2 + 30, "Enjoying  Swiirl?", {
      fontFamily: "system-ui, sans-serif", fontSize: "20px",
      fontStyle: "900", color: "#ffffff", letterSpacing: 3,
    }).setOrigin(0.5);
    const sub = this.add.text(0, -cardH / 2 + 58,
      "Tap a face — one-time prompt, stays local.", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px",
      color: "#b892e0", letterSpacing: 2,
    }).setOrigin(0.5);
    const up   = this._mkFeedbackBtn(-90, 30, "👍", () => this._submitFeedback("up", card));
    const down = this._mkFeedbackBtn(  0, 30, "👎", () => this._submitFeedback("down", card));
    const later = this.add.text(95, 35, "MAYBE\nLATER", {
      fontFamily: "system-ui, sans-serif", fontSize: "11px",
      fontStyle: "700", color: "#dcc7f2",
      align: "center", letterSpacing: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    later.on("pointerdown", () => this._dismissFeedback(card));

    card.add([bg, title, sub, up, down, later]);
    this.tweens.add({ targets: card, alpha: 1, y: cardY - 8, duration: 320, ease: "Back.easeOut" });
  }

  _mkFeedbackBtn(x, y, emoji, onPress) {
    const ring = this.add.circle(x, y, 28, 0xb892e0, 0.22).setStrokeStyle(2, 0xb892e0);
    const t = this.add.text(x, y, emoji, { fontSize: "26px" }).setOrigin(0.5);
    ring.setInteractive({ useHandCursor: true });
    ring.on("pointerover", () => ring.setFillStyle(0xb892e0, 0.45));
    ring.on("pointerout",  () => ring.setFillStyle(0xb892e0, 0.22));
    ring.on("pointerdown", onPress);
    return this.add.container(0, 0, [ring, t]);
  }

  _submitFeedback(kind, card) {
    try {
      localStorage.setItem("swiirl.feedback", kind);
      localStorage.setItem("swiirl.feedbackGiven", "1");
    } catch {}
    this.game.events.emit("feedback-given", { kind });
    SFX.win();
    const thanks = this.add.text(this.scale.width / 2, this.scale.height - 230,
      "thanks!  ★", {
      fontFamily: "system-ui, sans-serif", fontSize: "18px",
      fontStyle: "900", color: "#ffd24a", letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(901);
    this._dismissFeedback(card, () => {
      this.tweens.add({ targets: thanks, alpha: 1, duration: 200 });
      this.time.delayedCall(1400, () => {
        this.tweens.add({ targets: thanks, alpha: 0, duration: 300, onComplete: () => thanks.destroy() });
      });
    });
  }

  _dismissFeedback(card, onDone) {
    this.tweens.add({
      targets: card, alpha: 0, y: card.y + 8,
      duration: 220, ease: "Quad.easeIn",
      onComplete: () => {
        card.destroy();
        if (onDone) onDone();
      },
    });
  }
}
