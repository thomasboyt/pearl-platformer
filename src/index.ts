import { createPearl } from "pearl";
import Game from "./components/Game";

async function main() {
  const pearl = await createPearl({
    rootComponents: [new Game()],
    width: 320,
    height: 240,
    backgroundColor: "black",
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    assets: {}
  });
}

main();
