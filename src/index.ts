import { createPearl, SpriteSheetAsset } from "pearl";
import Game from "./components/Game";

async function main() {
  const pearl = await createPearl({
    rootComponents: [new Game()],
    width: 12 * 16,
    height: 12 * 12,
    backgroundColor: "black",
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    assets: {
      sheet: new SpriteSheetAsset(require("../assets/dunjo.png"), 12, 12)
    }
  });

  pearl.renderer.scale(2.5); // 480 x 360
}

main();
