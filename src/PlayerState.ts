import * as THREE from "three";

class PlayerState {
  position = new THREE.Vector3();
  direction = new THREE.Vector3(0, 0, -1);
  actionPressed = false;

  setFromCamera(camera: THREE.Camera) {
    camera.getWorldPosition(this.position);
    camera.getWorldDirection(this.direction);
  }

  setActionPressed(value: boolean) {
    this.actionPressed = value;
  }

  consumeAction(): boolean {
    if (this.actionPressed) {
      this.actionPressed = false;
      return true;
    }
    return false;
  }
}

export const playerState = new PlayerState();
