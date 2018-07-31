import { Component, Entity, SpriteSheetAsset } from 'pearl';
import TiledTileMap from './TiledTileMap';
import TileMapCollider from './TileMapCollider';
import { Tag, ZIndex } from '../types';
import entityFactories from '../entityFactories';
import RoomManager from './RoomManager';
import CameraMover from './CameraMover';

export default class Game extends Component<null> {
  init() {
    const sheet = this.pearl.assets.get(SpriteSheetAsset, 'sheet');

    const level = this.pearl.entities.add(
      new Entity({
        name: Tag.World,
        zIndex: ZIndex.World,
        components: [
          new TiledTileMap({
            level: require('../../assets/level.json'),
            tileset: require('../../assets/dunjo.json'),
            spriteSheet: sheet,
            entityFactories,
          }),
          new TileMapCollider(),
          new RoomManager(),
          new CameraMover(),
        ],
      })
    );
  }
}
