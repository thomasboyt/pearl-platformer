import {
  Component,
  Entity,
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
const jumpSpeed = 1;

type PlayerState = 'spawning' | 'alive' | 'dead';

function getClosestEntityHorizontal(to: Entity, entities: Entity[]) {
  const targetCenter = to.getComponent(Physical).center;

  return entities.reduce(
    (last, entity) => {
      if (!last) {
        return entity;
      }

      const closer =
        Math.abs(entity.getComponent(Physical).center.x - targetCenter.x) <
        Math.abs(last.getComponent(Physical).center.x - targetCenter.x);

      if (closer) {
        return entity;
      } else {
        return last;
      }
    },
    null as Entity | null
  );
}

export default class Player extends Component<void> {
  playerSpeed = 0.04;
  yVec = 0;
  grounded = false;
  onLadder = false;
  state: PlayerState = 'spawning';
  spawnPosition!: Vector2;

  roomBoundaryX = 0;

  init() {
    const phys = this.getComponent(Physical);
    const editorStartPosition = phys.center;

    const triggers = [...this.gameObject.parent!.children].filter((entity) =>
      entity.hasTag('roomTrigger')
    );

    const lastTrigger = getClosestEntityHorizontal(
      this.gameObject,
      triggers.filter(
        (entity) => entity.getComponent(Physical).center.x <= phys.center.x
      )
    );
    if (!lastTrigger) {
      throw new Error('cannot find room trigger to left of player start');
    }

    this.nextRoom(lastTrigger, true);
    // Debugging helper
    this.spawnPosition = editorStartPosition;
    this.respawn();
  }

  // TODO: Obviously refactor this and clear up flow once I am awake enough to
  // reason about it
  update(dt: number) {
    if (this.state !== 'alive') {
      return;
    }

    const phys = this.getComponent(Physical);

    // TODO: would be nice if this instead had a "last-pressed key wins" system
    // e.g. was pressing left, then pressed right, go right
    //      was pressing right, then pressed right, go right
    //      was pressing left, then  pressed left, go left
    //      was pressing right, then pressed left, go right
    let xVec = 0;
    if (this.pearl.inputter.isKeyDown(Keys.rightArrow)) {
      xVec += 1;
    }
    if (this.pearl.inputter.isKeyDown(Keys.leftArrow)) {
      xVec += -1;
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

    this.moveAndCollide(dt, xVec);

    this.updateAnimation({ x: xVec, y: this.yVec });

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

  private moveAndCollide(dt: number, xVec: number) {
    const phys = this.getComponent(Physical);

    const collisions = this.getComponent(KinematicBody).moveAndSlide({
      x: xVec * dt * this.playerSpeed,
      y: this.yVec,
    });

    if (collisions.length) {
      for (let collision of collisions) {
        const { x, y } = collision.response.overlapVector;

        if (collision.gameObject.name === 'level') {
          const tileMapCollider = this.gameObject.parent!.getComponent(
            TileMapCollider
          );

          // XXX: This is kind of a shitty place for this logic.
          if (
            tileMapCollider.lastCollision!.type === TileCollisionType.OneWay &&
            this.yVec < 0
          ) {
            // XXX: there's some glitchiness here that I can't figure out
            phys.translate({ x, y });
            continue;
          }
        }

        if (this.yVec > 0 && y > 0) {
          this.yVec = 0;
          this.grounded = true;
          this.onLadder = false;
        } else if (this.yVec < 0 && y < 0) {
          // bumping into ceiling... not sure whether to keep this yet
          this.yVec = 0;
        }
      }
    }

    if (phys.center.x < this.roomBoundaryX) {
      phys.center = { x: this.roomBoundaryX, y: phys.center.y };
    }

    if (this.yVec !== 0) {
      this.grounded = false;
    }
  }

  private updateAnimation(vec: Vector2) {
    if (this.onLadder) {
      if (vec.x || vec.y) {
        this.getComponent(AnimationManager).set('walking');
      } else {
        this.getComponent(AnimationManager).set('idle');
      }
    } else {
      if (vec.y) {
        this.getComponent(AnimationManager).set('jumping');
      } else if (vec.x) {
        this.getComponent(AnimationManager).set('walking');
      } else {
        this.getComponent(AnimationManager).set('idle');
      }
    }

    if (vec.x) {
      if (this.getComponent(SpriteRenderer)) {
        this.getComponent(SpriteRenderer).scaleX = vec.x;
      }
    }
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
        this.getComponent(SpriteRenderer).isVisible = false;
        yield this.pearl.async.waitMs(200);
        this.getComponent(SpriteRenderer).isVisible = true;
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

  private nextRoom(trigger: GameObject, skipCameraAnimation?: boolean) {
    const viewCenter = this.pearl.renderer.getViewCenter();
    const viewSize = this.pearl.renderer.getViewSize();

    this.roomBoundaryX = trigger.getComponent(Physical).center.x;

    let cameraMoveTime = skipCameraAnimation ? 0 : 2000;
    this.getComponent(CameraMover).moveCamera(cameraMoveTime, {
      x: this.roomBoundaryX + viewSize.x / 2,
      y: viewCenter.y,
    });

    const spawns = [...this.gameObject.parent!.children].filter((entity) =>
      entity.hasTag('spawn')
    );
    const nextSpawn = getClosestEntityHorizontal(
      this.gameObject,
      spawns.filter(
        (entity) => entity.getComponent(Physical).center.x >= this.roomBoundaryX
      )
    );

    if (!nextSpawn) {
      throw new Error(
        `could not find a spawn after room trigger @ ${this.roomBoundaryX}`
      );
    }

    this.spawnPosition = nextSpawn.getComponent(Physical).center;
  }

  onCollision(collision: CollisionInformation) {
    if (collision.gameObject.hasTag('roomTrigger')) {
      this.nextRoom(collision.gameObject);

      this.pearl.entities.destroy(collision.gameObject);
    } else if (collision.gameObject.hasTag('enemy')) {
      if (this.state === 'alive') {
        this.die();
      }
    }
  }
}
