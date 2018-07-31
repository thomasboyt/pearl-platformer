import {
  Component,
  Entity,
  SpriteSheetAsset,
  AnimationManager,
  BoxCollider,
  PolygonRenderer,
  KinematicBody,
  SpriteRenderer,
} from 'pearl';
import { TiledEntityFactories } from './components/TiledTileMap';
import Player from './components/Player';
import SpawningDyingRenderer from './components/SpawningDyingRenderer';
import Enemy from './components/Enemy';
import PlatformerPhysics from './components/PlatformerPhysics';
import { Tag, ZIndex } from './types';

const entityFactories: TiledEntityFactories = {
  player: (objectInfo, pearl) => {
    const sheet = pearl.assets.get(SpriteSheetAsset, 'sheet');

    return new Entity({
      name: 'player',
      zIndex: ZIndex.Objects,
      components: [
        new Player(),
        new SpawningDyingRenderer(),
        new KinematicBody(),
        new BoxCollider({
          width: 6,
          height: 8,
        }),
        new PlatformerPhysics({
          gravity: 0.002,
        }),
        // hitbox debug
        // new PolygonRenderer({ strokeStyle: 'limegreen' }),
        new AnimationManager({
          sheet,
          initialState: 'idle',
          animations: {
            idle: {
              frames: [3],
              frameLengthMs: 0,
            },
            walking: {
              frames: [6, 5],
              frameLengthMs: 200,
            },
            jumping: {
              frames: [4],
              frameLengthMs: 0,
            },
          },
        }),
      ],
    });
  },
  roomTrigger: (objectInfo) => {
    const entity = new Entity({
      name: 'roomTrigger',
      tags: [Tag.RoomTrigger],
      components: [
        new BoxCollider({
          width: objectInfo.width,
          height: objectInfo.height,
        }),
      ],
    });

    entity.getComponent(BoxCollider).isTrigger = true;

    return entity;
  },
  spawn: () => {
    return new Entity({
      name: 'spawn',
      tags: [Tag.Spawn],
      components: [],
    });
  },

  bloop: (objectInfo, pearl) => {
    return new Entity({
      name: 'bloop',
      tags: [Tag.Enemy],
      zIndex: ZIndex.Objects,
      components: [
        new SpriteRenderer({
          scaleX: 2,
          scaleY: 2,
        }),
        new AnimationManager({
          sheet: pearl.assets.get(SpriteSheetAsset, 'bloop'),
          initialState: 'idle',
          animations: {
            idle: {
              frames: [0],
              frameLengthMs: 0,
            },
            walking: {
              frames: [1, 0],
              frameLengthMs: 200,
            },
          },
        }),
        new Enemy(),
        new KinematicBody(),
        new BoxCollider({
          // TODO: Once this thing is actually affected by gravity, it'll
          // sink into the ground. Need to add a "display offset" to
          // SpriteRenderer, I think? Or a collider offset? but display
          // offset much easier to reason about
          width: 6,
          height: 6,
        }),
      ],
    });
  },
  key: (objectInfo, pearl) => {
    const sheet = pearl.assets.get(SpriteSheetAsset, 'sheet');

    const entity = new Entity({
      name: 'key',
      tags: [Tag.Key],
      zIndex: ZIndex.Objects,
      components: [
        new SpriteRenderer({
          sprite: sheet.createSprite(13),
        }),
        new BoxCollider({
          width: 4,
          height: 4,
        }),
      ],
    });

    entity.getComponent(BoxCollider).isTrigger = true;
    return entity;
  },
  block: (objectInfo, pearl) => {
    const sheet = pearl.assets.get(SpriteSheetAsset, 'sheet');

    return new Entity({
      name: 'block',
      tags: [Tag.Block],
      zIndex: ZIndex.World,
      components: [
        new SpriteRenderer({
          sprite: sheet.createSprite(21),
        }),
        new BoxCollider({
          width: 12,
          height: 12,
        }),
      ],
    });
  },
};

export default entityFactories;
