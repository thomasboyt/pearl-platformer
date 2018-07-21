export interface TiledObject {
  name?: string;
  type?: string;
  gid?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: { [key: string]: any };
}

export interface TiledTileLayer {
  type: 'tilelayer';
  data: number[];
  name: string;
}

export interface TiledObjectLayer {
  type: 'objectgroup';
  name: string;
  objects: TiledObject[];
}

export interface TiledLevelJSON {
  layers: (TiledTileLayer | TiledObjectLayer)[];
  width: number;
  height: number;
  tileheight: number;
  tilewidth: number;
}

export interface TiledTilesetTile {
  type: string;
}

export interface TiledTilesetJSON {
  tileheight: number;
  tilewidth: number;
  tilecount: number;
  tiles: { [id: string]: TiledTilesetTile };
}

// http://doc.mapeditor.org/en/latest/reference/tmx-map-format/#tile-flipping
export interface BaseObjectInfo {
  name?: string;
  type?: string;
  width: number;
  height: number;
  topLeftX: number;
  topLeftY: number;
  properties: { [key: string]: any };
}

export interface TileObjectInfo extends BaseObjectInfo {
  objectType: 'tile';
  gid: number;
  scaleX: number;
  scaleY: number;
}

export interface RectangleObjectInfo extends BaseObjectInfo {
  objectType: 'rectangle';
}

export type ObjectInfo = TileObjectInfo | RectangleObjectInfo;

export const loadObject = (object: TiledObject): ObjectInfo => {
  const baseProperties = {
    name: object.name,
    type: object.type,
    width: object.width,
    height: object.height,
    properties: object.properties || {},
  };

  if ('gid' in object) {
    const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
    const FLIPPED_VERTICALLY_FLAG = 0x40000000;
    const FLIPPED_DIAGONALLY_FLAG = 0x20000000;

    const gid = object.gid! - 1;

    const flippedHorizontally = !!(gid & FLIPPED_HORIZONTALLY_FLAG);
    const flippedVertically = !!(gid & FLIPPED_VERTICALLY_FLAG);
    const flippedDiagonally = !!(gid & FLIPPED_DIAGONALLY_FLAG);

    let scaleX = 1;
    let scaleY = 1;
    if (flippedDiagonally) {
      scaleX *= -1;
      scaleY *= -1;
    }
    if (flippedHorizontally) {
      scaleX *= -1;
    }
    if (flippedVertically) {
      scaleY *= -1;
    }

    const unmaskedGid =
      gid &
      ~(
        FLIPPED_HORIZONTALLY_FLAG |
        FLIPPED_VERTICALLY_FLAG |
        FLIPPED_DIAGONALLY_FLAG
      );

    const topLeftX = object.x;
    const topLeftY = object.y - object.height;

    return {
      ...baseProperties,
      objectType: 'tile',

      gid: unmaskedGid,
      scaleX,
      scaleY,
      topLeftX,
      topLeftY,
    };
  } else {
    return {
      ...baseProperties,
      objectType: 'rectangle',
      topLeftX: object.x,
      topLeftY: object.y,
    };
  }
};
