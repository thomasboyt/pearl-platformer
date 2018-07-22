import {
  Component,
  KinematicBody,
  Keys,
  SpriteRenderer,
  AnimationManager,
  CollisionInformation,
  Physical,
} from 'pearl';
import TileMapCollider, { TileCollisionType } from './TileMapCollider';
import TiledTileMap from './TiledTileMap';

const gravityAccel = 0.002;
const jumpSpeed = 1.5;

export default class Player extends Component<void> {
  playerSpeed = 0.03;
  yVec = 0;
  grounded = false;
  onLadder = false;

  update(dt: number) {
    const phys = this.getComponent(Physical);

    let xVec = 0;
    if (this.pearl.inputter.isKeyDown(Keys.rightArrow)) {
      xVec = 1;
    } else if (this.pearl.inputter.isKeyDown(Keys.leftArrow)) {
      xVec = -1;
    }

    if (this.onLadder) {
      this.updateLadder(dt);
    }

    if (!this.onLadder) {
      this.yVec += gravityAccel * dt;

      if (this.pearl.inputter.isKeyPressed(Keys.space) && this.grounded) {
        this.jump();
      }
    }

    const collisions = this.getComponent(KinematicBody).moveAndSlide({
      x: xVec * dt * this.playerSpeed,
      y: this.yVec,
    });

    if (collisions.length) {
      const collision = collisions[0];

      if (collision.gameObject.name === 'level') {
        const { x, y } = collision.response.overlapVector;

        const tileMapCollider = this.gameObject.parent!.getComponent(
          TileMapCollider
        );

        // XXX: This is kind of a shitty place for this logic.
        if (
          tileMapCollider.lastCollision!.type === TileCollisionType.OneWay &&
          this.yVec < 0
        ) {
          // XXX: there's some glitchiness here that I can't figure out
          phys.translate({
            x: x,
            y: y + this.yVec,
          });
        } else {
          if (this.yVec > 0 && y > 0) {
            this.yVec = 0;
            this.grounded = true;
          } else if (this.yVec < 0 && y < 0) {
            this.yVec = 0;
          }
        }
      }
    }

    if (this.yVec !== 0) {
      this.grounded = false;
    }

    if (this.yVec) {
      this.getComponent(AnimationManager).set('jumping');
    } else if (xVec) {
      this.getComponent(AnimationManager).set('walking');
    } else {
      this.getComponent(AnimationManager).set('idle');
    }

    if (xVec) {
      if (this.getComponent(SpriteRenderer)) {
        this.getComponent(SpriteRenderer).scaleX = xVec;
      }
    }

    const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);

    if (this.pearl.inputter.isKeyDown(Keys.upArrow)) {
      const tiles = tileMap.tilesAtLocalPos(phys.localCenter);
      if (tiles.indexOf('chain') !== -1 || tiles.indexOf('ladder') !== -1) {
        this.onLadder = true;
      }
    }
  }

  updateLadder(dt: number) {
    const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);
    const phys = this.getComponent(Physical);
    const tiles = tileMap.tilesAtLocalPos(phys.localCenter);

    if (tiles.indexOf('chain') === -1 && tiles.indexOf('ladder') === -1) {
      this.onLadder = false;
      return;
    }

    if (this.pearl.inputter.isKeyDown(Keys.upArrow)) {
      this.yVec = -this.playerSpeed * dt;
    } else if (this.pearl.inputter.isKeyDown(Keys.downArrow)) {
      this.yVec = this.playerSpeed * dt;
    } else {
      this.yVec = 0;
    }
  }

  jump() {
    if (this.grounded) {
      this.yVec = -jumpSpeed;
    }
  }
}
