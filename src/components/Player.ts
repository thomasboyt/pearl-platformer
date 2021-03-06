import {
  Component,
  Entity,
  Keys,
  SpriteRenderer,
  AnimationManager,
  CollisionInformation,
  Physical,
  BoxCollider,
  Vector2,
} from 'pearl';
import TiledTileMap from './TiledTileMap';
import SpawningDyingRenderer from './SpawningDyingRenderer';
import PlatformerPhysics from './PlatformerPhysics';
import RoomManager from './RoomManager';
import { Tag } from '../types';

const jumpSpeed = 1;

type PlayerState = 'spawning' | 'alive' | 'dead';

export default class Player extends Component<void> {
  playerSpeed = 0.04;
  onLadder = false;
  state: PlayerState = 'spawning';

  init() {
    const phys = this.getComponent(Physical);
    const editorStartPosition = phys.center;

    const roomManager = this.entity.parent!.getComponent(RoomManager);
    roomManager.setRoomFromPosition(phys.center.x);

    // Debugging helper
    roomManager.spawnPosition = editorStartPosition;
    this.respawn();
  }

  // TODO: Obviously refactor this and clear up flow once I am awake enough to
  // reason about it
  update(dt: number) {
    if (this.state !== 'alive') {
      return;
    }

    if (this.onLadder) {
      this.updateLadder(dt);

      if (this.onLadder) {
        // TODO: lil antipattern-ish?
        return;
      }
    }

    const phys = this.getComponent(Physical);
    const platformerPhys = this.getComponent(PlatformerPhysics);

    // TODO: would be nice if this instead had a "last-pressed key wins" system
    // e.g. was pressing left, then pressed right, go right
    //      was pressing right, then pressed right, go right
    //      was pressing left, then  pressed left, go left
    //      was pressing right, then pressed left, go right
    platformerPhys.vel.x = 0;
    if (this.pearl.inputter.isKeyDown(Keys.rightArrow)) {
      platformerPhys.vel.x += 1;
    }
    if (this.pearl.inputter.isKeyDown(Keys.leftArrow)) {
      platformerPhys.vel.x -= 1;
    }

    if (
      this.pearl.inputter.isKeyPressed(Keys.space) &&
      platformerPhys.grounded
    ) {
      this.jump();
    }
    platformerPhys.move(dt);

    this.updateAnimation(platformerPhys.vel);

    const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);
    const tiles = tileMap.tilesAtLocalPos(phys.localCenter);

    if (this.pearl.inputter.isKeyPressed(Keys.upArrow)) {
      if (tiles.indexOf('chain') !== -1 || tiles.indexOf('ladder') !== -1) {
        this.enterLadder();
      }
    }

    if (tiles.indexOf('spikes') !== -1) {
      this.die();
    }

    this.checkFellOOB();
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
        this.getComponent(SpriteRenderer).scaleX = vec.x >= 0 ? 1 : -1;
      }
    }
  }

  private enterLadder() {
    console.log('enter ladder');

    // snap to center of ladder
    const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);
    const phys = this.getComponent(Physical);
    const coordinates = tileMap.localPosToTileCoordinates(phys.center);
    const center = {
      x: coordinates.x * tileMap.tileWidth + tileMap.tileWidth / 2,
      y: phys.center.y,
    };
    phys.center = center;

    // zero out gravity, in case we were falling and got on ladder
    this.getComponent(PlatformerPhysics).vel = { x: 0, y: 0 };

    this.onLadder = true;
  }

  // XXX: This obviously has a lot of special case collision checks, and while
  // they're actually exactly what I need for this game, it might be nice if it
  // at least used KinematicBody.moveAndCollide() or something.
  private updateLadder(dt: number) {
    const phys = this.getComponent(Physical);
    const prevCenter = phys.center;

    this.getComponent(AnimationManager).set('walking');
    if (this.pearl.inputter.isKeyDown(Keys.upArrow)) {
      phys.translate({ x: 0, y: -this.playerSpeed * dt });
    } else if (this.pearl.inputter.isKeyDown(Keys.downArrow)) {
      phys.translate({ x: 0, y: this.playerSpeed * dt });
    } else {
      this.getComponent(AnimationManager).set('idle');
    }

    // resolve collisions

    const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);

    const topEdgeY = phys.center.y - this.getComponent(BoxCollider).height / 2;
    const bottomEdgeY =
      phys.center.y + this.getComponent(BoxCollider).height / 2;

    const headTiles = tileMap.tilesAtLocalPos({
      x: phys.center.x,
      y: topEdgeY,
    });
    const feetTiles = tileMap.tilesAtLocalPos({
      x: phys.center.x,
      y: bottomEdgeY,
    });

    // Bonked head against wall, so go back to previous position
    if (headTiles.indexOf('wall') > -1) {
      phys.center = prevCenter;
    }

    if (
      this.pearl.inputter.isKeyPressed(Keys.leftArrow) ||
      this.pearl.inputter.isKeyPressed(Keys.rightArrow) ||
      (feetTiles.indexOf('chain') === -1 && feetTiles.indexOf('ladder') === -1)
    ) {
      console.log('exit ladder');
      this.onLadder = false;
      return;
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
    this.getComponent(PlatformerPhysics).vel = { x: 0, y: 0 };
    this.getComponent(Physical).center = this.entity.parent!.getComponent(
      RoomManager
    ).spawnPosition;
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
    this.getComponent(PlatformerPhysics).vel.y = -jumpSpeed;
  }

  onCollision(collision: CollisionInformation) {
    if (collision.gameObject.hasTag(Tag.RoomTrigger)) {
      this.entity
        .parent!.getComponent(RoomManager)
        .setRoomFromTrigger(collision.entity);

      this.pearl.entities.destroy(collision.gameObject);
    } else if (collision.gameObject.hasTag(Tag.Enemy)) {
      if (this.state === 'alive') {
        this.die();
      }
    } else if (collision.gameObject.hasTag(Tag.Key)) {
      this.entity.parent!.getComponent(RoomManager).destroyBlocksInRoom();
      this.pearl.entities.destroy(collision.gameObject);
    }
  }
}
