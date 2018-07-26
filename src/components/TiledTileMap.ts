import {
  SpriteSheet,
  Component,
  Sprite,
  GameObject,
  Vector2,
  SpriteRenderer,
  Physical,
  PearlInstance,
} from 'pearl';

import memoize from 'micro-memoize';
import { deepEqual } from 'fast-equals';
import { chunk } from 'lodash-es';

import {
  TiledLevelJSON,
  TiledTilesetJSON,
  TiledTileLayer,
  ObjectInfo,
  loadObject,
  TiledObject,
  TiledTilesetTile,
} from '../tiled';

import TileMapCollider, {
  ITileMap,
  TileCollisionType,
} from './TileMapCollider';

interface Settings {
  level: TiledLevelJSON;
  tileset: TiledTilesetJSON;
  spriteSheet: SpriteSheet;
  entityFactories: TiledEntityFactories;
}

export type TiledEntityFactory = (
  objectInfo: ObjectInfo,
  pearl: PearlInstance
) => GameObject;

export type TiledEntityFactories = {
  [type: string]: TiledEntityFactory | undefined;
};

export default class TiledTileMap extends Component<Settings>
  implements ITileMap {
  width!: number;
  height!: number;
  tileWidth!: number;
  tileHeight!: number;

  spriteSheet!: SpriteSheet;
  tileSprites: { [id: string]: Sprite } = {};

  tileLayers: TiledTileLayer[] = [];
  tileset!: TiledTilesetJSON;

  create(settings: Settings) {
    const { level, tileset, spriteSheet, entityFactories } = settings;
    this.spriteSheet = spriteSheet;

    this.width = level.width;
    this.height = level.height;
    this.tileWidth = level.tilewidth;
    this.tileHeight = level.tileheight;
    this.tileset = tileset;

    // NOTE: tilesets are 1-indexed. when multiple tilesets are supported, use
    // firstgid here
    for (let i = 0; i < tileset.tilecount; i += 1) {
      this.tileSprites[i + 1] = this.spriteSheet.createSprite(i);
    }

    for (let layer of level.layers) {
      if (layer.type === 'tilelayer') {
        this.tileLayers.push(layer);
      } else if (layer.type === 'objectgroup') {
        for (let object of layer.objects) {
          this.createObject(object, entityFactories);
        }
      }
    }

    this.createCollisionMap();
  }

  private createObject(
    object: TiledObject,
    entityFactories: TiledEntityFactories
  ) {
    const { tileset } = this;
    const objectInfo = loadObject(object);

    const resolvedType =
      objectInfo.objectType === 'tile'
        ? objectInfo.type || tileset.tiles[objectInfo.gid].type
        : objectInfo.type;

    if (!resolvedType) {
      throw new Error(`can't parse object without a type: ${objectInfo}`);
    }

    const factory = entityFactories[resolvedType];

    if (!factory) {
      throw new Error(`no entity factory for object type ${resolvedType}`);
    }

    const entity = factory(objectInfo, this.pearl);

    if (objectInfo.objectType === 'tile') {
      entity.addComponent(
        new SpriteRenderer({
          sprite: this.tileSprites[objectInfo.gid + 1],
          scaleX: objectInfo.scaleX,
          scaleY: objectInfo.scaleY,
        })
      );
    }

    entity.addComponent(
      new Physical({
        center: {
          x: objectInfo.topLeftX + objectInfo.width / 2,
          y: objectInfo.topLeftY + objectInfo.height / 2,
        },
      })
    );

    this.pearl.entities.add(entity);
    this.gameObject.appendChild(entity);
  }

  private createCollisionMap() {
    const wallLayer = this.tileLayers.find((layer) => layer.name === 'Walls');

    if (!wallLayer) {
      throw new Error('missing layer for walls (should be called "Walls"');
    }

    const { tileset } = this;

    const collisionMap = wallLayer.data.map((item) => {
      if (item === 0) {
        return TileCollisionType.Empty;
      }

      const gid = item - 1;
      const tile = this.getTilesetDataForGid(gid);

      if (!tile) {
        return TileCollisionType.Empty;
      }

      if (tile.type === 'wall' || tile.type === 'block') {
        return TileCollisionType.Wall;
      } else if (tile.type === 'platform') {
        return TileCollisionType.OneWay;
      } else {
        return TileCollisionType.Empty;
      }
    });

    this.getComponent(TileMapCollider).initializeCollisions(
      this,
      chunk(collisionMap, this.width)
    );
  }

  getTilesetDataForGid(gid: number): TiledTilesetTile {
    return this.tileset.tiles[gid];
  }

  getTilesOfType(type: string): Vector2[] {
    const indices: number[] = [];

    for (let layer of this.tileLayers) {
      for (let idx = 0; idx < layer.data.length; idx += 1) {
        const gid = layer.data[idx] - 1;
        const tile = this.getTilesetDataForGid(gid);
        if (tile && tile.type === type) {
          indices.push(idx);
        }
      }
    }

    return indices.map((idx) => this.idxToTileCoordinates(idx));
  }

  findGidForType(type: string): number | undefined {
    for (let gid of Object.keys(this.tileset.tiles)) {
      if (this.tileset.tiles[gid].type === type) {
        return parseInt(gid);
      }
    }
  }

  setTileAt({ x, y }: Vector2, gid: number, layerName: string) {
    const layerIdx = this.tileLayers.findIndex(
      (layer) => layer.name === layerName
    );

    if (layerIdx === -1) {
      throw new Error(`no tile layer found named ${layerName}`);
    }

    // lazy memoization bust
    this.tileLayers = this.tileLayers.slice();

    const data = this.tileLayers[layerIdx].data;
    data[this.tileCoordinatesToIdx({ x, y })] = gid + 1;

    // TODO: don't redo this every time lol
    this.createCollisionMap();
  }

  idxToTileCoordinates(idx: number): Vector2 {
    const tx = idx % this.width;
    const ty = Math.floor(idx / this.width);
    return { x: tx, y: ty };
  }

  tileCoordinatesToIdx(tilePos: Vector2): number {
    return tilePos.y * this.width + tilePos.x;
  }

  localPosToTileCoordinates(local: Vector2): Vector2 {
    const { x, y } = local;

    const rawTilePos = {
      x: x / this.tileWidth,
      y: y / this.tileHeight,
    };

    const floored = {
      x: Math.floor(rawTilePos.x),
      y: Math.floor(rawTilePos.y),
    };

    return floored;
  }

  localPosToIdx(local: Vector2): number {
    return this.tileCoordinatesToIdx(this.localPosToTileCoordinates(local));
  }

  tilesAtLocalPos(localPos: Vector2): string[] {
    const tiles = [];

    const idx = this.localPosToIdx(localPos);
    for (let layer of this.tileLayers) {
      const gid = layer.data[idx];
      if (gid) {
        const type =
          this.tileset.tiles[gid - 1] && this.tileset.tiles[gid - 1].type;
        tiles.push(type);
      }
    }

    return tiles;
  }

  private renderTile(
    ctx: CanvasRenderingContext2D,
    id: number,
    tx: number,
    ty: number
  ) {
    if (id === 0) {
      return;
    }

    return this.tileSprites[id].draw(
      ctx,
      tx * this.tileWidth,
      ty * this.tileHeight
    );
  }

  private _drawTiles(tileLayers: TiledTileLayer[]): HTMLCanvasElement {
    console.log('redrawing tiles');
    const canvas = document.createElement('canvas');
    canvas.width = this.tileWidth * this.width;
    canvas.height = this.tileHeight * this.height;
    const ctx = canvas.getContext('2d')!;

    for (let layer of tileLayers) {
      for (let i = 0; i < layer.data.length; i += 1) {
        const id = layer.data[i];
        const { x, y } = this.idxToTileCoordinates(i);
        this.renderTile(ctx, id, x, y);
      }
    }

    return canvas;
  }

  // XXX: Yes, this memoization means this._drawTiles has to be slice()d every
  // time it's changed!!
  private drawTiles = memoize(this._drawTiles);

  // TODO: allow TiledTileMap to be positioned
  render(ctx: CanvasRenderingContext2D) {
    const canvas = this.drawTiles(this.tileLayers);
    ctx.drawImage(canvas, 0, 0);
  }
}
