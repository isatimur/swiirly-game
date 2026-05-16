import { VIEW } from "./config.js";
import { initTouchControls, wireGamepadPause } from "./touchControls.js";
import { initGamepad, rumble } from "./gamepad.js";
import { BootScene } from "./scenes/Boot.js";
import { MenuScene } from "./scenes/Menu.js";
import { CharacterSelectScene } from "./scenes/CharacterSelect.js";
import { GameScene } from "./scenes/Game.js";
import { HUDScene } from "./scenes/HUD.js";
import { LevelCompleteScene } from "./scenes/LevelComplete.js";
import { GameOverScene } from "./scenes/GameOver.js";
import { CreditsScene } from "./scenes/Credits.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: "#1a0f2e",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: false,
  // Round camera/sprite positions to whole pixels — eliminates the sub-pixel
  // shimmy you can see on a scaled rendered character during scrolls.
  roundPixels: true,
  fps: { target: 60, forceSetTimeOut: false },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 2200 },
      debug: false,
      // Higher fixed step rate = more stable physics for fast falls.
      fps: 120,
    },
  },
  scene: [BootScene, MenuScene, CharacterSelectScene, GameScene, HUDScene, LevelCompleteScene, GameOverScene, CreditsScene],
};

initTouchControls();
const game = new Phaser.Game(config);
if (typeof window !== "undefined") window.game = game;
initGamepad(game);
// Gamepad Options button toggles the universal pause menu (any scene).
wireGamepadPause(game);

// Haptic feedback on key gameplay moments. Tuned so it punctuates rather
// than buzzes constantly — short on damage, longer on boss kill / frenzy.
// Mobile uses navigator.vibrate (a single duration, or a pattern). Gamepad
// rumble is dual-channel (weak/strong). We fire both — only one is active on
// any given device, so there's no double-buzz.
const vib = (ms) => {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
};
game.events.on("player-hurt",    () => { rumble(0.35, 0.55, 200); vib(40);            });
game.events.on("player-died",    () => { rumble(0.8,  0.9,  520); vib([80, 60, 180]); });
game.events.on("boss-defeated",  () => { rumble(0.9,  1.0,  600); vib([90, 40, 220]); });
game.events.on("frenzy-start",   () => { rumble(0.55, 0.75, 360); vib(70);            });

// Hide the HTML loader the moment Phaser starts booting.
game.events.once("ready", () => {
  const el = document.getElementById("loading");
  if (el) el.classList.add("hidden");
});
