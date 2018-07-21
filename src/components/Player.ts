import {
  Component,
  KinematicBody,
  Keys,
  SpriteRenderer,
  AnimationManager,
  CollisionInformation,
} from 'pearl';

const gravityAccel = 0.002;
const jumpSpeed = 1.5;

export default class Player extends Component<void> {
  playerSpeed = 0.03;
  yVec = 0;

  update(dt: number) {
    let xVec = 0;
    if (this.pearl.inputter.isKeyDown(Keys.rightArrow)) {
      xVec = 1;
    } else if (this.pearl.inputter.isKeyDown(Keys.leftArrow)) {
      xVec = -1;
    }

    this.yVec += gravityAccel * dt;

    if (this.pearl.inputter.isKeyPressed(Keys.space)) {
      this.jump();
    }

    const collisions = this.getComponent(KinematicBody).moveAndSlide({
      x: xVec * dt * this.playerSpeed,
      y: this.yVec,
    });

    if (collisions.length) {
      const collision = collisions[0];

      if (collision.gameObject.name === 'level') {
        const { x, y } = collision.response.overlapVector;

        if (this.yVec > 0 && y > 0) {
          this.yVec = 0;
        } else if (this.yVec < 0 && y < 0) {
          this.yVec = 0;
        }
      }
    }

    if (this.yVec) {
      this.getComponent(AnimationManager).set('jumping');
    } else if (xVec) {
      this.getComponent(AnimationManager).set('walking');
    } else {
      this.getComponent(AnimationManager).set('idle');
    }

    if (xVec) {
      // this.getComponent(AnimationManager).set('walking');

      if (this.getComponent(SpriteRenderer)) {
        this.getComponent(SpriteRenderer).scaleX = xVec;
      }
    } else {
      // this.getComponent(AnimationManager).set('idle');
    }
  }

  jump() {
    this.yVec = -jumpSpeed;
  }

  // onCollision(collision: CollisionInformation) {
  //   if (collision.gameObject.name === 'level') {
  //     const vec = collision.response.overlapVector;

  //     // if (vec.x > vec.y) {
  //     //   console.log('resetting');
  //     this.yVec = 0;
  //     // }
  //   }
  // }
}
