// import {
//   Component,
//   Entity,
//   KinematicBody,
//   Keys,
//   SpriteRenderer,
//   AnimationManager,
//   CollisionInformation,
//   Physical,
//   BoxCollider,
//   Vector2,
//   GameObject,
// } from 'pearl';
// import TileMapCollider, { TileCollisionType } from './TileMapCollider';
// import TiledTileMap from './TiledTileMap';
// import SpawningDyingRenderer from './SpawningDyingRenderer';
// import CameraMover from './CameraMover';

// const gravityAccel = 0.002;

// export default class Player extends Component<void> {
//   moveSpeed: number = 0;
//   vec = { x: 0, y: 0 };
//   grounded = false;
//   onLadder = false;

//   update(dt: number) {
//     // TODO: if (!isEnabled) { return }
//     this.vec.y += gravityAccel * dt;

//     if (this.pearl.inputter.isKeyPressed(Keys.space) && this.grounded) {
//       this.jump();
//     }

//     this.moveAndCollide(dt);
//   }

//   private moveAndCollide(dt: number) {
//     const phys = this.getComponent(Physical);

//     const collisions = this.getComponent(KinematicBody).moveAndSlide({
//       x: this.vec.x * dt * this.moveSpeed,
//       y: this.vec.y,
//     });

//     if (collisions.length) {
//       for (let collision of collisions) {
//         if (collision.gameObject.name === 'level') {
//           const { x, y } = collision.response.overlapVector;

//           const tileMapCollider = this.gameObject.parent!.getComponent(
//             TileMapCollider
//           );

//           // XXX: This is kind of a shitty place for this logic.
//           if (
//             tileMapCollider.lastCollision!.type === TileCollisionType.OneWay &&
//             this.vec.y < 0
//           ) {
//             // XXX: there's some glitchiness here that I can't figure out
//             phys.translate({ x, y });
//           } else {
//             if (this.vec.y > 0 && y > 0) {
//               this.vec.y = 0;
//               this.grounded = true;
//               this.onLadder = false;
//             } else if (this.vec.y < 0 && y < 0) {
//               // bumping into ceiling... not sure whether to keep this yet
//               this.vec.y = 0;
//             }
//           }
//         }
//       }
//     }

//     if (this.vec.y !== 0) {
//       this.grounded = false;
//     }
//   }

//   private updateAnimation(vec: Vector2) {
//     if (this.onLadder) {
//       if (vec.x || vec.y) {
//         this.getComponent(AnimationManager).set('walking');
//       } else {
//         this.getComponent(AnimationManager).set('idle');
//       }
//     } else {
//       if (vec.y) {
//         this.getComponent(AnimationManager).set('jumping');
//       } else if (vec.x) {
//         this.getComponent(AnimationManager).set('walking');
//       } else {
//         this.getComponent(AnimationManager).set('idle');
//       }
//     }

//     if (vec.x) {
//       if (this.getComponent(SpriteRenderer)) {
//         this.getComponent(SpriteRenderer).scaleX = vec.x;
//       }
//     }
//   }

//   private updateLadder(dt: number) {
//     const tileMap = this.gameObject.parent!.getComponent(TiledTileMap);
//     const phys = this.getComponent(Physical);
//     const tiles = tileMap.tilesAtLocalPos(phys.localCenter);

//     if (tiles.indexOf('chain') === -1 && tiles.indexOf('ladder') === -1) {
//       this.onLadder = false;
//       return;
//     }

//     if (this.pearl.inputter.isKeyDown(Keys.upArrow)) {
//       this.vec.y = -this.playerSpeed * dt;
//     } else if (this.pearl.inputter.isKeyDown(Keys.downArrow)) {
//       this.vec.y = this.playerSpeed * dt;
//     } else {
//       this.vec.y = 0;
//     }
//   }

//   private checkFellOOB() {
//     const topEdge =
//       this.getComponent(Physical).center.y -
//       this.getComponent(BoxCollider).height / 2;

//     if (topEdge > this.pearl.renderer.getViewSize().y) {
//       this.respawn();
//     }
//   }

//   private respawn() {
//     this.vec.y = 0; // quick fix for deaths from tunnelin thru floor
//     this.getComponent(Physical).center = this.spawnPosition;
//     this.getComponent(SpriteRenderer).scaleX = 1;
//     this.state = 'spawning';
//     this.getComponent(SpawningDyingRenderer).spawn(() => {
//       this.state = 'alive';
//     });
//   }

//   private die() {
//     this.state = 'dead';
//     this.runCoroutine(function*(this: Player) {
//       for (let i = 0; i < 3; i += 1) {
//         this.getComponent(SpriteRenderer).isVisible = true;
//         yield this.pearl.async.waitMs(200);
//         this.getComponent(SpriteRenderer).isVisible = false;
//         yield this.pearl.async.waitMs(200);
//       }
//       this.respawn();
//     });
//   }

//   private jump() {
//     if (this.grounded) {
//       this.vec.y = -jumpSpeed;
//     }
//   }

//   private nextRoom(trigger: GameObject, skipCameraAnimation?: boolean) {
//     const viewCenter = this.pearl.renderer.getViewCenter();
//     const viewSize = this.pearl.renderer.getViewSize();

//     this.roomBoundaryX = trigger.getComponent(Physical).center.x;

//     let cameraMoveTime = skipCameraAnimation ? 0 : 2000;
//     this.getComponent(CameraMover).moveCamera(cameraMoveTime, {
//       x: this.roomBoundaryX + viewSize.x / 2,
//       y: viewCenter.y,
//     });

//     const nextSpawn = getClosestEntityHorizontal(
//       this.gameObject,
//       this.pearl.entities
//         .all('spawn')
//         .filter(
//           (entity) =>
//             entity.getComponent(Physical).center.x >= this.roomBoundaryX
//         )
//     );

//     if (!nextSpawn) {
//       throw new Error(
//         `could not find a spawn after room trigger @ ${this.roomBoundaryX}`
//       );
//     }

//     this.spawnPosition = nextSpawn.getComponent(Physical).center;
//   }

//   onCollision(collision: CollisionInformation) {
//     if (collision.gameObject.hasTag('roomTrigger')) {
//       this.nextRoom(collision.gameObject);

//       this.pearl.entities.destroy(collision.gameObject);
//     }
//   }
// }
