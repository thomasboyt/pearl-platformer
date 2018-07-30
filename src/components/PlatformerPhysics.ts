import { Component, KinematicBody, Physical } from 'pearl';
import TileMapCollider, { TileCollisionType } from './TileMapCollider';

interface Properties {
  gravity: number;
}

export default class PlatformerPhysics extends Component<Partial<Properties>>
  implements Properties {
  vel = { x: 0, y: 0 };
  gravity = 0;
  grounded = true;

  create(props: Properties) {
    const keys = Object.keys(props) as (keyof Properties)[];

    for (let key of keys) {
      const val = props[key];
      this[key] = val;
    }
  }

  move(dt: number) {
    const phys = this.getComponent(Physical);

    this.vel.y += this.gravity * dt;

    const collisions = this.getComponent(KinematicBody).moveAndSlide(this.vel);

    if (collisions.length) {
      for (let collision of collisions) {
        if (collision.collider.isTrigger) {
          continue;
        }

        const { x, y } = collision.response.overlapVector;

        // XXX: This is kind of a shitty place for this logic.
        //
        // The tricky bit here is that testShape(), over in
        // TileMapCollider-land, doesn't get the velocity of the tested entity,
        // and can't conditionally not return the collision.
        //
        // It... might be reasonable to add velocity as an optional third
        // property to test shape, or maybe have `prevPosition` or something?
        // KinematicBody could then pass down the chain  this when it calls
        // getCollision(), but, eghhh, seems rough.
        //
        // The other option, to at least keep the logic here but not make it
        // TileMapCollider specific, would be to create individual entities from
        // TileMapCollider so you could say collision.entity.hasTag('oneway'),
        // or something. I don't like this idea in the slightest.
        //
        // No matter what, *some* one-way logic will definitely have to live in
        // this component, considering that I want to add the ability to
        // drop-down through one-way platforms, and that'll probably involve
        // something like `if (did drop down and colliding with one-way
        // platform) { ignore collision }`. I just want it to be independent of
        // TileMapCollider.
        if (collision.gameObject.collider instanceof TileMapCollider) {
          const tileMapCollider = collision.gameObject.collider;

          if (
            tileMapCollider.lastCollision!.type === TileCollisionType.OneWay &&
            this.vel.y < 0
          ) {
            // XXX: there's some glitchiness here that I can't figure out
            phys.translate({ x, y });
            continue;
          }
        }

        if (this.vel.y > 0 && y > 0) {
          this.vel.y = 0;
          this.grounded = true;
        } else if (this.vel.y < 0 && y < 0) {
          // bumping into ceiling... not sure whether to keep this yet
          this.vel.y = 0;
        }
      }
    }

    if (this.vel.y !== 0) {
      this.grounded = false;
    }
  }
}
