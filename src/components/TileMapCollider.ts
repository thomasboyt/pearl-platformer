import {
  Component,
  CollisionResponse,
  PolygonShape,
  Collider,
  CollisionShape,
  Position,
  Vector2,
  VectorMaths as V,
  Physical,
} from 'pearl';

export enum TileCollisionType {
  Empty,
  Wall,
  OneWay,
}

interface TileCollisionInformation {
  type: TileCollisionType;
  polygon: PolygonShape;
  position: Position;
}

export interface ITileMap {
  idxToTileCoordinates(idx: number): Vector2;
  tileCoordinatesToIdx(tilePos: Vector2): number;
  tileWidth: number;
  tileHeight: number;
}

export default class TileMapCollider extends Collider {
  isEnabled = true;
  isTrigger = false;

  tileMap!: ITileMap;
  collisionMap: (TileCollisionInformation | null)[] = [];

  lastCollision?: TileCollisionInformation;

  create() {
    this.gameObject.registerCollider(this);
  }

  initializeCollisions(tileMap: ITileMap, collisionMap: TileCollisionType[]) {
    this.tileMap = tileMap;

    this.collisionMap = collisionMap.map((type, idx, arr) => {
      if (type === TileCollisionType.Empty) {
        return null;
      }

      const { x, y } = tileMap.idxToTileCoordinates(idx);

      const worldX = x * tileMap.tileWidth;
      const worldY = y * tileMap.tileHeight;

      let polygon: PolygonShape;
      if (type === TileCollisionType.OneWay) {
        polygon = new PolygonShape({
          points: [
            [-tileMap.tileWidth / 2, -tileMap.tileHeight / 2],
            [tileMap.tileWidth / 2, -tileMap.tileHeight / 2],
          ],
        });
      } else {
        polygon = PolygonShape.createBox({
          width: tileMap.tileWidth,
          height: tileMap.tileHeight,
        });
      }

      return {
        type,
        polygon,
        position: {
          center: {
            x: worldX + tileMap.tileWidth / 2,
            y: worldY + tileMap.tileHeight / 2,
          },
        },
      };
    });
  }

  // TODO: Allow non-rectangular tiles
  testShape(shape: CollisionShape, otherPosition: Position) {
    const phys = this.gameObject.maybeGetComponent(Physical);
    const worldCenter = phys ? phys.center : { x: 0, y: 0 };

    for (let idx = 0; idx < this.collisionMap.length; idx += 1) {
      const collisionInfo = this.collisionMap[idx];
      if (!collisionInfo) {
        continue;
      }

      const tilePolygonShape = collisionInfo.polygon;

      const worldPosition = {
        ...collisionInfo.position,
        center: {
          x: collisionInfo.position.center.x + worldCenter.x,
          y: collisionInfo.position.center.y + worldCenter.y,
        },
      };

      // TODO: should this be inverted?
      const resp = tilePolygonShape.testShape(
        shape,
        worldPosition,
        otherPosition
      );

      if (resp && resp.overlap > 0) {
        // see "internal edges"
        // https://wildbunny.co.uk/blog/2011/12/14/how-to-make-a-2d-platform-game-part-2-collision-detection/
        const normal = V.unit(resp.overlapVector);
        const tilePos = this.tileMap.idxToTileCoordinates(idx);

        const adjacentTile = this.collisionMap[
          this.tileMap.tileCoordinatesToIdx({
            x: tilePos.x + normal.x,
            y: tilePos.y + normal.y,
          })
        ];

        if (adjacentTile) {
          // TODO: This needs to be finer to prevent seam collisions on top edge
          // of one-way tiles, obviously
          if (adjacentTile.type !== TileCollisionType.OneWay) {
            continue;
          }
        }

        // this is used in a hack for one-way collisions, see Player.ts
        this.lastCollision = collisionInfo;

        return resp;
      }
    }
  }
}
