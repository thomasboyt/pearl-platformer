import {
  Component,
  KinematicBody,
  Keys,
  SpriteRenderer,
  AnimationManager,
  CollisionInformation,
  Physical,
  BoxCollider,
  Vector2,
  GameObject,
} from 'pearl';
import TileMapCollider, { TileCollisionType } from './TileMapCollider';
import TiledTileMap from './TiledTileMap';
import SpawningDyingRenderer from './SpawningDyingRenderer';
import CameraMover from './CameraMover';

const gravityAccel = 0.002;
const jumpSpeed = 1.5;

type PlayerState = 'spawning' | 'alive' | 'dead';

export default class Player extends Component<void> {
  playerSpeed = 0.03;
  yVec = 0;
  grounded = false;
  onLadder = false;
  state: PlayerState = 'spawning';
  spawnPosition!: Vector2;

  roomBoundaryX = 0;

  init() {
    this.spawnPosition = this.getComponent(Physical).center;
    this.respawn();
  }

  // TODO: Obviously refactor this and clear up flow once I am awake enough to
  // reason about it
  update(dt: number) {
    if (this.state !== 'alive') {
      return;
    }

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
            // this.yVec = 0;
          }
        }
      }
    }

    if (phys.center.x < this.roomBoundaryX) {
      phys.center = { x: this.roomBoundaryX, y: phys.center.y };
    }

    if (this.yVec !== 0) {
      this.grounded = false;
    }

    if (this.onLadder) {
      if (xVec || this.yVec) {
        this.getComponent(AnimationManager).set('walking');
      } else {
        this.getComponent(AnimationManager).set('idle');
      }
    } else {
      if (this.yVec) {
        this.getComponent(AnimationManager).set('jumping');
      } else if (xVec) {
        this.getComponent(AnimationManager).set('walking');
      } else {
        this.getComponent(AnimationManager).set('idle');
      }
    }

    if (xVec) {
      if (this.getComponent(SpriteRenderer)) {
        this.getComponent(SpriteRenderer).scaleX = xVec;
      }
    }

    const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);

    const tiles = tileMap.tilesAtLocalPos(phys.localCenter);

    if (this.pearl.inputter.isKeyDown(Keys.upArrow)) {
      if (tiles.indexOf('chain') !== -1 || tiles.indexOf('ladder') !== -1) {
        this.onLadder = true;
      }
    }

    if (tiles.indexOf('spikes') !== -1) {
      this.die();
    }

    this.checkFellOOB();
  }

  private updateLadder(dt: number) {
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

  private checkFellOOB() {
    const topEdge =
      this.getComponent(Physical).center.y -
      this.getComponent(BoxCollider).height / 2;

    if (topEdge > this.pearl.renderer.getViewSize().y) {
      this.respawn();
    }
  }

  private respawn() {
    this.yVec = 0; // quick fix for deaths from tunnelin thru floor
    this.getComponent(Physical).center = this.spawnPosition;
    this.getComponent(SpriteRenderer).scaleX = 1;
    this.state = 'spawning';
    this.getComponent(SpawningDyingRenderer).spawn(() => {
      this.state = 'alive';
    });
  }

  private die() {
    this.state = 'dead';
    this.runCoroutine(function*(this: Player) {
      for (let i = 0; i < 3; i += 1) {
        this.getComponent(SpriteRenderer).isVisible = true;
        yield this.pearl.async.waitMs(200);
        this.getComponent(SpriteRenderer).isVisible = false;
        yield this.pearl.async.waitMs(200);
      }
      this.respawn();
    });
  }

  private jump() {
    if (this.grounded) {
      this.yVec = -jumpSpeed;
    }
  }

  private nextRoom(trigger: GameObject) {
    const viewCenter = this.pearl.renderer.getViewCenter();
    const viewSize = this.pearl.renderer.getViewSize();

    this.getComponent(CameraMover).moveCamera(2000, {
      x: viewCenter.x + viewSize.x,
      y: viewCenter.y,
    });

    const spawns = this.pearl.entities.all('spawn');
    let closestSpawnPosition: Vector2 | undefined = undefined;

    for (let spawn of spawns) {
      const pos = spawn.getComponent(Physical).center;
      if (!closestSpawnPosition || Math.abs(pos.x - closestSpawnPosition.x)) {
        closestSpawnPosition = pos;
      }
    }

    if (!closestSpawnPosition) {
      throw new Error('could not find a spawn');
    }

    this.roomBoundaryX = trigger.getComponent(Physical).center.x;

    this.spawnPosition = closestSpawnPosition;
  }

  onCollision(collision: CollisionInformation) {
    if (collision.gameObject.hasTag('roomTrigger')) {
      this.nextRoom(collision.gameObject);

      this.pearl.entities.destroy(collision.gameObject);
    }
  }
}
