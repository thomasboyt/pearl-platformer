import {
  Component,
  Entity,
  SpriteSheetAsset,
  AnimationManager,
  BoxCollider,
  PolygonRenderer,
  KinematicBody,
} from 'pearl';
import TiledTileMap, { TiledEntityFactories } from './TiledTileMap';
import TileMapCollider from './TileMapCollider';
import Player from './Player';
import SpawningDyingRenderer from './SpawningDyingRenderer';
import CameraMover from './CameraMover';

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
              width: 8,
              height: 8,
            }),
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
