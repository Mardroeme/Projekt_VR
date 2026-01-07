// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import DesktopControls from "./controls/DesktopControls";
import { playerState } from "./PlayerState";

import Room1 from "./Room1";
import Room2 from "./Room2";
import Room3 from "./Room3";
import Room4 from "./Room4";

const R1:any = Room1, R2:any = Room2, R3:any = Room3, R4:any = Room4;

export default function XRScene() {
  const { gl, camera, scene } = useThree();

  const [solved, setSolved] = useState([false, false, false]);
  const onSolved = (idx:number) => setSolved((p:any)=>{const n=[...p]; n[idx]=true; return n;});

  const vr = useMemo(() => {
    const handlers = new Map<THREE.Object3D, (hit: THREE.Intersection) => void>();
    return {
      register(obj: THREE.Object3D, fn: (hit: THREE.Intersection) => void) {
        handlers.set(obj, fn);
        return () => handlers.delete(obj);
      },
      _handlers: handlers
    };
  }, []);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tmpM = useMemo(() => new THREE.Matrix4(), []);
  const o = useMemo(() => new THREE.Vector3(), []);
  const d = useMemo(() => new THREE.Vector3(), []);

  const fireFromHit = (hit: THREE.Intersection) => {
    let obj: any = hit.object;
    while (obj && !vr._handlers.has(obj)) obj = obj.parent;
    if (obj && vr._handlers.has(obj)) { vr._handlers.get(obj)?.(hit); return true; }

    let cur: any = hit.object;
    while (cur) {
      const h = cur.__r3f?.handlers;
      if (h?.onPointerDown) { h.onPointerDown({ stopPropagation(){}, distance: hit.distance, object: hit.object }); return true; }
      if (h?.onClick) { h.onClick({ stopPropagation(){}, distance: hit.distance, object: hit.object }); return true; }
      cur = cur.parent;
    }
    return false;
  };

  const doRaycastFrom = (fromObj: THREE.Object3D) => {
    tmpM.identity().extractRotation(fromObj.matrixWorld);
    o.setFromMatrixPosition(fromObj.matrixWorld);
    d.set(0,0,-1).applyMatrix4(tmpM).normalize();

    raycaster.set(o, d);
    raycaster.far = 3.5;

    const hits = raycaster.intersectObjects(scene.children, true);
    if (!hits.length) return false;

    for (const h of hits) {
      if (h.object?.visible === false) continue;
      let x:any = h.object;
      while (x) {
        if (vr._handlers.has(x)) return fireFromHit(h);
        const hh = x.__r3f?.handlers;
        if (hh?.onPointerDown || hh?.onClick) return fireFromHit(h);
        x = x.parent;
      }
    }
    return false;
  };

  // --- XR reference space locomotion (controllers follow) ---
  const baseRef = useRef<any>(null);
  const pos = useRef(new THREE.Vector3(0,0,0));
  const yaw = useRef(0);

  const dead = 0.18;
  const moveSpeed = 2.2;

  const applyRef = () => {
    if (!baseRef.current) return;
    const T = (window as any).XRRigidTransform;
    if (!T) return;

    const inv = { x: -pos.current.x, y: 0, z: -pos.current.z };
    const half = (-yaw.current) / 2;
    const rot = { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
    gl.xr.setReferenceSpace(baseRef.current.getOffsetReferenceSpace(new T(inv, rot)));
  };

  useEffect(() => {
    gl.xr.enabled = true;

    const onKeyDown = (e: KeyboardEvent) => { if (e.code === "KeyE") playerState.setActionPressed(true); };
    window.addEventListener("keydown", onKeyDown);

    const c0 = gl.xr.getController(0);
    const c1 = gl.xr.getController(1);
    scene.add(c0); scene.add(c1);

    const makeRay = () => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-6)]);
      const m = new THREE.LineBasicMaterial({});
      return new THREE.Line(g, m);
    };
    c0.add(makeRay());
    c1.add(makeRay());

    const onSelect = (e:any) => {
      playerState.setActionPressed(true);
      const src = e?.target as THREE.Object3D | undefined;
      if (src && doRaycastFrom(src)) return;
      doRaycastFrom(gl.xr.getCamera(camera) as any);
    };
    c0.addEventListener("selectstart", onSelect);
    c1.addEventListener("selectstart", onSelect);

    const onSessionStart = () => {
      baseRef.current = gl.xr.getReferenceSpace();
      pos.current.set(0,0,0);
      yaw.current = 0;
      applyRef();
    };
    const onSessionEnd = () => { baseRef.current = null; pos.current.set(0,0,0); yaw.current = 0; };

    gl.xr.addEventListener("sessionstart", onSessionStart);
    gl.xr.addEventListener("sessionend", onSessionEnd);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      c0.removeEventListener("selectstart", onSelect);
      c1.removeEventListener("selectstart", onSelect);
      scene.remove(c0); scene.remove(c1);
      gl.xr.removeEventListener("sessionstart", onSessionStart);
      gl.xr.removeEventListener("sessionend", onSessionEnd);
    };
  }, [gl, scene, camera]);

  // Collision: if any object has userData.collider === true, treat as blocking
  const collides = (origin: THREE.Vector3, dir: THREE.Vector3, dist: number) => {
    raycaster.set(origin, dir);
    raycaster.far = dist;

    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      let obj: any = h.object;
      while (obj) {
        if (obj.userData?.collider) return true;
        obj = obj.parent;
      }
    }
    return false;
  };

  useFrame((_s, dt) => {
    playerState.setFromCamera(camera);

    if (!gl.xr?.isPresenting) return;
    const session = gl.xr.getSession();
    if (!session) return;

    let leftGp: Gamepad | null = null;
    for (const src of session.inputSources) {
      const anyS: any = src as any;
      if (!anyS.gamepad) continue;
      if (src.handedness === "left") leftGp = anyS.gamepad;
    }

    const axesL = leftGp?.axes ?? [];
    const lxA = axesL[2] ?? 0, lyA = axesL[3] ?? 0;
    const lxB = axesL[0] ?? 0, lyB = axesL[1] ?? 0;
    const useA = Math.abs(lxA) + Math.abs(lyA) > Math.abs(lxB) + Math.abs(lyB);
    const lx = useA ? lxA : lxB;
    const ly = useA ? lyA : lyB;

    const strafeRaw = lx;
    const forwardRaw = -ly;

    const strafe = Math.abs(strafeRaw) < dead ? 0 : strafeRaw;
    const forward = Math.abs(forwardRaw) < dead ? 0 : forwardRaw;

    if (strafe === 0 && forward === 0) return;

    const xrCam: any = gl.xr.getCamera(camera);
    const q = xrCam.quaternion;

    const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(q); fwd.y=0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();

    const step = moveSpeed * dt;
    const camPos = new THREE.Vector3();
    xrCam.getWorldPosition(camPos);

    if (forward !== 0) {
      const dir = fwd.clone().multiplyScalar(Math.sign(forward));
      if (!collides(camPos, dir, 0.35)) pos.current.addScaledVector(fwd, forward * step);
    }
    if (strafe !== 0) {
      const dir = right.clone().multiplyScalar(Math.sign(strafe));
      if (!collides(camPos, dir, 0.35)) pos.current.addScaledVector(right, strafe * step);
    }

    // ✅ No right-stick turning
    applyRef();
  });

  return (
    <>
      <DesktopControls />

      <ambientLight intensity={0.45} />
      <hemisphereLight intensity={0.45} />
      <pointLight position={[0, 2.7, 0]} intensity={2.2} distance={24} decay={2} />
      <pointLight position={[36, 2.7, 0]} intensity={2.2} distance={24} decay={2} />
      <pointLight position={[72, 2.7, 0]} intensity={2.2} distance={24} decay={2} />
      <pointLight position={[108, 2.7, 0]} intensity={2.2} distance={24} decay={2} />
      <directionalLight position={[2, 6, 3]} intensity={0.25} />

      <R1 solved={solved} onSolved={onSolved} consumeE={() => playerState.consumeAction()} vr={vr} />
      <R2 solved={solved} onSolved={onSolved} consumeE={() => playerState.consumeAction()} vr={vr} />
      <R3 solved={solved} onSolved={onSolved} consumeE={() => playerState.consumeAction()} vr={vr} />
      <R4 />
    </>
  );
}
