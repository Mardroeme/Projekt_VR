import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Desktop movement: PointerLock look + WASD.
 * Collision: ANY Mesh is solid by default (tables, puzzles, props),
 * unless explicitly opted-out with userData.nocollide === true.
 *
 * This avoids having to tag every table/puzzle manually.
 */
export default function DesktopControls() {
  const { camera, scene, gl } = useThree();

  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const box = useRef(new THREE.Box3());

  const radius = 0.30;
  const eyeY = 1.6;

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const isSolid = (o: THREE.Object3D) => {
    const anyO = o as any;
    if (anyO?.userData?.nocollide === true) return false;
    if (!(o as any).isMesh) return false;
    // ignore "floor" so you don't get pushed weirdly; walls/props stay solid
    const n = (o.name || "").toLowerCase();
    if (n.includes("floor")) return false;
    return true;
  };

  const resolveCollisions = (pos: THREE.Vector3) => {
    scene.traverse((o) => {
      if (!isSolid(o)) return;

      o.updateWorldMatrix(true, false);
      box.current.setFromObject(o);
      if (!isFinite(box.current.min.x)) return;

      const cx = THREE.MathUtils.clamp(pos.x, box.current.min.x, box.current.max.x);
      const cy = THREE.MathUtils.clamp(pos.y, box.current.min.y, box.current.max.y);
      const cz = THREE.MathUtils.clamp(pos.z, box.current.min.z, box.current.max.z);

      const dx = pos.x - cx;
      const dy = pos.y - cy;
      const dz = pos.z - cz;

      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 >= radius * radius) return;

      const dist = Math.sqrt(dist2) || 0.0001;
      const push = (radius - dist) + 0.001;

      pos.x += (dx / dist) * push;
      pos.y += (dy / dist) * push;
      pos.z += (dz / dist) * push;
    });
  };

  useFrame((_s, dt) => {
    if (gl.xr?.isPresenting) return;

    const forward = (keys.current["KeyW"] ? 1 : 0) - (keys.current["KeyS"] ? 1 : 0);
    const strafe = (keys.current["KeyD"] ? 1 : 0) - (keys.current["KeyA"] ? 1 : 0);

    const sprint = keys.current["ShiftLeft"] || keys.current["ShiftRight"];
    const speed = sprint ? 4.5 : 2.5;

    fwd.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.current.y = 0;
    fwd.current.normalize();

    right.current.crossVectors(fwd.current, new THREE.Vector3(0, 1, 0)).normalize();

    vel.current.set(0, 0, 0);
    vel.current.addScaledVector(fwd.current, forward * speed);
    vel.current.addScaledVector(right.current, strafe * speed);

    const next = camera.position.clone().addScaledVector(vel.current, dt);
    next.y = eyeY;

    resolveCollisions(next);
    camera.position.copy(next);
  });

  return <PointerLockControls />;
}
