import { Component, Physical, Entity, Vector2 } from 'pearl';
import { Tag } from '../types';
import CameraMover from './CameraMover';
import TiledTileMap from './TiledTileMap';

function getClosestEntityHorizontal(x: number, entities: Entity[]) {
  return entities.reduce(
    (last, entity) => {
      if (!last) {
        return entity;
      }

      const closer =
        Math.abs(entity.getComponent(Physical).center.x - x) <
        Math.abs(last.getComponent(Physical).center.x - x);

      if (closer) {
        return entity;
      } else {
        return last;
      }
    },
    null as Entity | null
  );
}

export default class RoomManager extends Component<void> {
  leftBoundaryX!: number;
  rightBoundaryX!: number;
  spawnPosition!: Vector2;

  init() {}

  setRoomFromPosition(x: number) {
    // get the room boundary from x
    const beforeTriggers = this.pearl.entities.all(Tag.RoomTrigger);
    const trigger = getClosestEntityHorizontal(x, beforeTriggers);

    if (!trigger) {
      throw new Error(`no room trigger found before x position ${x}`);
    }

    this.setRoomFromTrigger(trigger);
  }

  setRoomFromTrigger(trigger: Entity, skipCameraAnimation?: boolean) {
    // Get left boundary
    this.leftBoundaryX = trigger.getComponent(Physical).center.x;

    // Get right boundary from next trigger
    const triggers = [...this.gameObject.children].filter((entity) =>
      entity.hasTag(Tag.RoomTrigger)
    );

    const nextTrigger = getClosestEntityHorizontal(
      this.leftBoundaryX,
      triggers.filter(
        (entity) => entity.getComponent(Physical).center.x > this.leftBoundaryX
      )
    );

    this.rightBoundaryX = nextTrigger
      ? nextTrigger.getComponent(Physical).center.x
      : Infinity;

    // move camera
    const viewCenter = this.pearl.renderer.getViewCenter();
    const viewSize = this.pearl.renderer.getViewSize();

    let cameraMoveTime = skipCameraAnimation ? 0 : 2000;
    this.getComponent(CameraMover).moveCamera(cameraMoveTime, {
      x: this.leftBoundaryX + viewSize.x / 2,
      y: viewCenter.y,
    });

    // set spawn position
    const spawns = [...this.gameObject.children].filter((entity) =>
      entity.hasTag(Tag.Spawn)
    );
    const nextSpawn = getClosestEntityHorizontal(
      this.leftBoundaryX,
      spawns.filter(
        (entity) => entity.getComponent(Physical).center.x >= this.leftBoundaryX
      )
    );

    if (!nextSpawn) {
      throw new Error(
        `could not find a spawn after room trigger @ ${this.leftBoundaryX}`
      );
    }

    this.spawnPosition = nextSpawn.getComponent(Physical).center;
  }

  // getEntitiesInRoom() {}

  destroyBlocksInRoom() {
    const tileMap = this.getComponent(TiledTileMap);
    const blocks = tileMap.getTilesOfType('block');

    for (let blockPos of blocks) {
      const realPos = {
        x: blockPos.x * tileMap.tileWidth + tileMap.tileWidth / 2,
        y: blockPos.y * tileMap.tileHeight + tileMap.tileHeight / 2,
      };
      if (realPos.x >= this.leftBoundaryX && realPos.x <= this.rightBoundaryX) {
        tileMap.setTileAt(blockPos, 20, 'Walls');
      }
    }
  }
}
