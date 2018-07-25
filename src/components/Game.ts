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
import TiledTileMap, { TiledEntityFactories } from './TiledTileMap';
import TileMapCollider from './TileMapCollider';
import Player from './Player';
import SpawningDyingRenderer from './SpawningDyingRenderer';
import CameraMover from './CameraMover';
import Enemy from './Enemy';
import PlatformerPhysics from './PlatformerPhysics';

export default class Game extends Component<null> {
  init() {
    const sheet = this.pearl.assets.get(SpriteSheetAsset, 'sheet');

    const entityFactories: TiledEntityFactories = {
      player: (objectInfo) => {
        return new Entity({
          name: 'player',
          components: [
            new Player(),
            new SpawningDyingRenderer(),
            new KinematicBody(),
            new CameraMover(),
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
          tags: ['roomTrigger'],
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
          tags: ['spawn'],
          components: [],
        });
      },

      bloop: (objectInfo) => {
        return new Entity({
          name: 'bloop',
          tags: ['enemy'],
          components: [
            new SpriteRenderer({
              scaleX: 2,
              scaleY: 2,
            }),
            new AnimationManager({
              sheet: this.pearl.assets.get(SpriteSheetAsset, 'bloop'),
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
    };

    const level = this.pearl.entities.add(
      new Entity({
        name: 'level',
        components: [
          new TiledTileMap({
            level: require('../../assets/level.json'),
            tileset: require('../../assets/dunjo.json'),
            spriteSheet: sheet,
            entityFactories,
          }),
          new TileMapCollider(),
        ],
      })
    );
  }
}
