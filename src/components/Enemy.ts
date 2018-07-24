import {
  Component,
  KinematicBody,
  AnimationManager,
  Physical,
  VectorMaths as V,
  SpriteRenderer,
} from 'pearl';
import TiledTileMap from './TiledTileMap';

export default class Enemy extends Component<void> {
  xDirection = 1;

  init() {
    this.getComponent(AnimationManager).set('walking');
  }

  update(dt: number) {
    const vec = { x: 0.02 * dt * this.xDirection, y: 0 };
    const phys = this.getComponent(Physical);
    const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);

    const projection = V.add(phys.localCenter, {
      x: vec.x,
      // next tile down
      y: tileMap.tileHeight,
    });

    const tilesBelow = tileMap.tilesAtLocalPos(projection);
    if (
      tilesBelow.indexOf('wall') === -1 &&
      tilesBelow.indexOf('platform') === -1
    ) {
      // change direction
      this.xDirection *= -1;
      this.getComponent(SpriteRenderer).scaleX *= -1;
      vec.x *= -1;
    }

    const collisions = this.getComponent(KinematicBody).moveAndSlide(vec);
    for (let collision of collisions) {
      if (collision.response.overlapVector.x) {
        // turn around
        this.xDirection *= -1;
        this.getComponent(SpriteRenderer).scaleX *= -1;
      }
    }
  }
}
