// "Brand reveal" screen — Swiirl delivers insights, Brand reacts, score
// shows up as a stamp + stat-card row.
//
// Layout (1280 x 720, top to bottom):
//   y  56-140  Header (label + level name)
//   y 180-410  Celebration row (Swiirl + Brand + speech bubble)
//   y 430-520  Rank stamp (slams in with rotation + shake)
//   y 540-650  Stat cards (insights, time, lives) — sequential reveal
//   y 670-700  Continue hint
//
// The rank stamp is positioned in its own clear band so it can never collide
// with the celebration sprites, regardless of frame size.

import { VIEW } from "../config.js";

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super("LevelComplete"); }

  init(data) {
    this.payload = data || { insights: 0, lives: 3, levelName: "Community Park", levelNum: 1 };
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(500, 26, 15, 46);

    // Persist best run.
    const prevBest = +(localStorage.getItem("swiirl.bestInsights") || 0);
    const isNewBest = this.payload.insights > prevBest;
    if (isNewBest) localStorage.setItem("swiirl.bestInsights", String(this.payload.insights));

    // ----- BACKGROUND -----
    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1).setScale(0.7).setAlpha(0.5);

    // ----- CONFETTI -----
    for (let i = 0; i < 50; i++) {
      const col = [0xffd24a, 0xff8fbe, 0xb892e0, 0x7bd389, 0x7dc4ff][i % 5];
      const r = this.add.rectangle(Phaser.Math.Between(0, width), -20,
        Phaser.Math.Between(6, 10), Phaser.Math.Between(10, 18), col)
        .setRotation(Math.random() * Math.PI);
      this.tweens.add({
        targets: r, y: height + 30,
        rotation: r.rotation + Math.PI * 4,
        x: r.x + Phaser.Math.Between(-100, 100),
        duration: Phaser.Math.Between(2400, 4200),
        ease: "Quad.easeIn",
        delay: Math.random() * 1500,
        repeat: -1,
      });
    }

    // ----- HEADER -----
    this.add.text(width / 2, 70, "INSIGHTS  DELIVERED", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "17px",
      color: "#FFD24A",
      letterSpacing: 8,
    }).setOrigin(0.5);

    // Title is intentionally sized so the longest level name ("Boardroom
    // Battle" / "Executive Summit", 16 chars) leaves a clear horizontal gap
    // to the speech bubble at brand.x + 260. At fontSize 36 + 900 weight the
    // longest name renders ~340 px wide; the bubble's left edge sits at 880,
    // giving ~50 px of breathing room beside the title.
    this.add.text(width / 2, 120, this.payload.levelName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "36px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 5,
    }).setOrigin(0.5);

    // ----- CELEBRATION ROW -----
    // Centered horizontally as a pair — Swiirl on the left, Brand on the right.
    const rowY = 280;
    const swiirl = this.add.image(width / 2 - 150, rowY, "celebrate").setScale(0.68);
    const brand  = this.add.image(width / 2 + 130, rowY + 60, "brand_happy")
      .setScale(0.85).setOrigin(0.5, 1);
    this.tweens.add({
      targets: swiirl, y: swiirl.y - 10,
      duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    // Speech bubble — pushed further right (+260) so it can never overlap
    // the title even on long level names.
    const bubbleX = brand.x + 260;
    const bubbleY = brand.y - 230;
    const bubble = this.add.container(bubbleX, bubbleY).setAlpha(0);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.lineStyle(3, 0x5C3BA3, 1);
    const bubbleHalfW = 150;
    bg.fillRoundedRect(-bubbleHalfW, -46, bubbleHalfW * 2, 84, 14);
    bg.strokeRoundedRect(-bubbleHalfW, -46, bubbleHalfW * 2, 84, 14);
    // Tail: apex at brand's head; base CLAMPED to the bubble's bottom edge
    // so it stays visually attached even when the brand is far off-center.
    // (Previously the base could end up outside the bubble's left edge,
    //  making the tail look like a floating arrow.)
    const brandHeadY = brand.y - brand.displayHeight * 0.92;
    const apexDx = brand.x - bubbleX;
    const apexDy = brandHeadY - bubbleY;
    const baseDx = Phaser.Math.Clamp(apexDx, -bubbleHalfW + 24, bubbleHalfW - 24);
    const baseDy = 36; // just inside bubble's bottom edge
    bg.fillTriangle(baseDx - 18, baseDy, apexDx, apexDy, baseDx + 18, baseDy);
    bg.strokeTriangle(baseDx - 18, baseDy, apexDx, apexDy, baseDx + 18, baseDy);
    // Cover the bubble's bottom border where the tail attaches so the
    // stroked outline reads as one continuous shape.
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRect(baseDx - 17, baseDy - 2, 34, 5);
    const bubbleText = this.add.text(0, -4,
      "Oh!  THAT'S\nwhat the community wants.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#5C3BA3",
      align: "center",
      lineSpacing: 4,
    }).setOrigin(0.5);
    bubble.add([bg, bubbleText]);
    this.tweens.add({
      targets: bubble, alpha: 1, y: bubbleY - 8,
      duration: 500, delay: 500, ease: "Back.easeOut",
    });

    // ----- RANK COMPUTATION -----
    const collected = this.payload.insightsCollected ?? this.payload.insights ?? 0;
    const total = this.payload.totalInsights ?? collected;
    const lives = this.payload.lives ?? 0;
    const time = this.payload.time ?? null;
    const ratio = total > 0 ? collected / total : 0;

    let rank, rankColor, rankFill, rankRibbon;
    if (ratio >= 0.95 && lives >= 3) { rank = "S"; rankColor = "#1A0F2E"; rankFill = 0xffd24a; rankRibbon = "PERFECT  RUN"; }
    else if (ratio >= 0.80)          { rank = "A"; rankColor = "#FFFFFF"; rankFill = 0x7bd389; rankRibbon = "GREAT  WORK"; }
    else if (ratio >= 0.60)          { rank = "B"; rankColor = "#FFFFFF"; rankFill = 0x7dc4ff; rankRibbon = "WELL  PLAYED"; }
    else                             { rank = "C"; rankColor = "#FFFFFF"; rankFill = 0xb892e0; rankRibbon = "DELIVERED"; }

    // ----- RANK STAMP -----
    // A "stamp" is a tilted rounded square with the rank letter inside,
    // animated in with rotation + scale + screen shake to feel impactful.
    const stampX = width / 2;
    const stampY = 470;
    const stampSize = 96;
    const stampContainer = this.add.container(stampX, stampY).setAlpha(0).setScale(2.6);
    stampContainer.setAngle(-30);

    const stampBg = this.add.graphics();
    stampBg.fillStyle(rankFill, 1);
    stampBg.lineStyle(5, 0x1a0f2e, 1);
    stampBg.fillRoundedRect(-stampSize / 2, -stampSize / 2, stampSize, stampSize, 14);
    stampBg.strokeRoundedRect(-stampSize / 2, -stampSize / 2, stampSize, stampSize, 14);
    // Inner border to read more as a "stamp"
    stampBg.lineStyle(2, 0x1a0f2e, 0.55);
    stampBg.strokeRoundedRect(-stampSize / 2 + 6, -stampSize / 2 + 6, stampSize - 12, stampSize - 12, 10);

    const stampLetter = this.add.text(0, 2, rank, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "70px",
      fontStyle: "900",
      color: rankColor,
    }).setOrigin(0.5);

    const rankLabel = this.add.text(0, stampSize / 2 + 22, rankRibbon, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      fontStyle: "700",
      color: "#dcc7f2",
      letterSpacing: 6,
    }).setOrigin(0.5);

    stampContainer.add([stampBg, stampLetter, rankLabel]);

    // Stamp slam: rotation settles to a small tilt, scale snaps to 1.
    this.tweens.add({
      targets: stampContainer,
      alpha: 1, scale: 1, angle: 8,
      duration: 380,
      delay: 800,
      ease: "Back.easeOut",
      onComplete: () => {
        this.cameras.main.shake(180, 0.008);
        // Settle wobble.
        this.tweens.add({
          targets: stampContainer,
          angle: 6,
          duration: 220,
          ease: "Sine.easeInOut",
        });
      },
    });

    // S-rank confetti bonus on landing.
    if (rank === "S") {
      this.time.delayedCall(1200, () => {
        for (let i = 0; i < 28; i++) {
          const angle = (i / 28) * Math.PI * 2;
          const dist = Phaser.Math.Between(60, 180);
          const c = this.add.circle(stampX, stampY, 4, 0xffd24a, 1).setDepth(80);
          this.tweens.add({
            targets: c,
            x: stampX + Math.cos(angle) * dist,
            y: stampY + Math.sin(angle) * dist,
            scale: 0.2, alpha: 0,
            duration: 800, ease: "Cubic.easeOut",
            onComplete: () => c.destroy(),
          });
        }
      });
    }

    // ----- STAT CARDS -----
    // Three rounded panels in a horizontal row. Each fades + slides in
    // sequentially after the stamp settles for a satisfying readout.
    const cardY = 600;
    const cardW = 200;
    const cardH = 86;
    const gap = 36;
    const totalW = cardW * 3 + gap * 2;
    const cardsStartX = (width - totalW) / 2 + cardW / 2;

    const timeStr = time != null
      ? `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`
      : "--:--";

    const stats = [
      { label: "INSIGHTS", value: `${collected}/${total}`, color: 0xffd24a },
      { label: "TIME",     value: timeStr,                 color: 0x7dc4ff },
      { label: "LIVES",    value: `${lives} ♥`,            color: 0xff8fbe },
    ];

    stats.forEach((s, i) => {
      const cx = cardsStartX + i * (cardW + gap);
      const card = this.add.container(cx, cardY).setAlpha(0);
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1a0f2e, 0.72);
      cardBg.lineStyle(2, s.color, 0.9);
      cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      // Accent strip at the top of each card.
      cardBg.fillStyle(s.color, 1);
      cardBg.fillRoundedRect(-cardW / 2 + 8, -cardH / 2 + 6, cardW - 16, 3, 1);

      const value = this.add.text(0, -10, s.value, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#1a0f2e",
        strokeThickness: 3,
      }).setOrigin(0.5);

      const label = this.add.text(0, 22, s.label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        fontStyle: "700",
        color: hex(s.color),
        letterSpacing: 4,
      }).setOrigin(0.5);

      card.add([cardBg, value, label]);
      this.tweens.add({
        targets: card,
        alpha: 1, y: cardY - 6,
        duration: 380,
        delay: 1300 + i * 140,
        ease: "Back.easeOut",
      });
    });

    // ----- NEW-BEST RIBBON -----
    if (isNewBest) {
      const ribbon = this.add.container(width / 2, 178).setAlpha(0).setScale(0.6);
      const rg = this.add.graphics();
      rg.fillStyle(0xffd24a, 0.96);
      rg.lineStyle(3, 0x5C3BA3, 1);
      rg.fillRoundedRect(-130, -16, 260, 32, 16);
      rg.strokeRoundedRect(-130, -16, 260, 32, 16);
      const rt = this.add.text(0, 0, "★  NEW PERSONAL BEST  ★", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "900",
        color: "#5C3BA3",
        letterSpacing: 4,
      }).setOrigin(0.5);
      ribbon.add([rg, rt]);
      this.tweens.add({
        targets: ribbon, alpha: 1, scale: 1,
        duration: 320, delay: 1700, ease: "Back.easeOut",
      });
    }

    // ----- CONTINUE HINT -----
    const isLastLevel = !this.payload.levelNum || this.payload.levelNum >= 5;
    const press = this.add.text(width / 2, height - 32,
      isLastLevel ? "press   SPACE   to play again" : "press   SPACE   for next level", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      color: "#dcc7f2",
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: press, alpha: 1, duration: 360, delay: 1900 });
    this.tweens.add({
      targets: press, alpha: 0.35,
      yoyo: true, repeat: -1, duration: 700, delay: 2300,
    });

    // ----- INPUT -----
    const restart = () => {
      this.cameras.main.fadeOut(400, 26, 15, 46);
      this.time.delayedCall(420, () => {
        const nextLevel = isLastLevel ? 1 : this.payload.levelNum + 1;
        this.scene.start("Game", { level: nextLevel });
        this.scene.launch("HUD");
      });
    };
    this.input.keyboard.once("keydown-SPACE", restart);
    this.input.keyboard.once("keydown-ENTER", restart);
    this.input.once("pointerdown", restart);
  }
}

// Convert 0xRRGGBB to "#RRGGBB" — Phaser text color wants the string form.
function hex(n) {
  return "#" + n.toString(16).padStart(6, "0");
}
