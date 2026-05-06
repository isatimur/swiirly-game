import { VIEW } from "./config.js";
import { initTouchControls } from "./touchControls.js";
import { BootScene } from "./scenes/Boot.js";
import { MenuScene } from "./scenes/Menu.js";
import { GameScene } from "./scenes/Game.js";
import { HUDScene } from "./scenes/HUD.js";
import { LevelCompleteScene } from "./scenes/LevelComplete.js";
import { GameOverScene } from "./scenes/GameOver.js";

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
  scene: [BootScene, MenuScene, GameScene, HUDScene, LevelCompleteScene, GameOverScene],
};

initTouchControls();
const game = new Phaser.Game(config);

// Hide the HTML loader the moment Phaser starts booting.
game.events.once("ready", () => {
  const el = document.getElementById("loading");
  if (el) el.classList.add("hidden");
});
