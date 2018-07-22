import { Component, VectorMaths as V, Vector2 } from 'pearl';

export default class CameraMover extends Component<void> {
  moving = false;
  elapsedMs: number = 0;
  targetMs: number = 0;
  targetVec!: Vector2;

  moveCamera(ms: number, targetVec: Vector2) {
    this.elapsedMs = 0;
    this.targetMs = ms;
    this.targetVec = targetVec;
    this.moving = true;
  }

  update(dt: number) {
    if (!this.moving) {
      return;
    }

    this.elapsedMs += dt;

    let f = this.elapsedMs / this.targetMs;
    if (f > 1) {
      f = 1;
    }
    this.pearl.renderer.setViewCenter(
      V.lerp(this.pearl.renderer.getViewCenter(), this.targetVec, f)
    );

    if (this.elapsedMs >= this.targetMs) {
      this.moving = false;
    }
  }
}
