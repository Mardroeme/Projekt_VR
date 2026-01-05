import * as THREE from "three"
import { useEffect, useMemo, useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { ContactShadows } from "@react-three/drei"
import Room1, { ROOM } from "./Room1"
import Room2 from "./Room2"
import Room3 from "./Room3"
import Room4 from "./Room4"

// ============ VR "klik" (ray z kontrolera + trigger/select) ============
export type VRReg = {
  register: (obj: THREE.Object3D, onSelect: (hit: THREE.Intersection) => void) => () => void
}

// ============ Klawisz E – stabilna obsługa =========
let __eDown = false
let __eEdgeFrame = -1
let __frameNo = 0
let __listenerAttached = false

function InteractKeyListener() {
  useEffect(() => {
    if (__listenerAttached) return
    const onDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && !e.repeat) {
        if (!__eDown) {
          __eDown = true
          __eEdgeFrame = __frameNo
        }
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e") __eDown = false
    }
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    __listenerAttached = true
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
      __listenerAttached = false
    }
  }, [])
  return null
}

function consumeE() {
  return __eEdgeFrame === __frameNo
}

// ====== ŚWIATŁA (PRZYWRÓCONE) ======
function IndustrialLamp({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 0.2, 16]} />
        <meshStandardMaterial color={"#3a3f46"} metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.18, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial emissive={"#fff8d5"} emissiveIntensity={1.3} color={"#444"} />
      </mesh>
      <pointLight intensity={intensity} distance={8} />
    </group>
  )
}

function Lights() {
  const dir = useRef<THREE.DirectionalLight>(null!)
  useFrame(({ clock }) => {
    dir.current.intensity = 0.8 + Math.sin(clock.elapsedTime * 1.7) * 0.03
  })
  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.12} groundColor={"#1a1a1a"} />
      <directionalLight ref={dir} castShadow position={[4, 6, 2]} intensity={0.8} />
      <IndustrialLamp position={[-3, ROOM.h - 0.1, -1.5]} intensity={0.9} />
      <IndustrialLamp position={[3, ROOM.h - 0.1, 1.5]} intensity={0.85} />
      <IndustrialLamp position={[0, ROOM.h - 0.1, -ROOM.d / 2 + 0.4]} intensity={1.25} />
      <IndustrialLamp position={[-2.5, ROOM.h - 0.1, -ROOM.d - 2]} intensity={0.9} />
      <IndustrialLamp position={[2.5, ROOM.h - 0.1, -ROOM.d + 1.5]} intensity={0.85} />
      <IndustrialLamp position={[-2.5, ROOM.h - 0.1, -ROOM.d * 2 - 2]} intensity={0.9} />
      <IndustrialLamp position={[2.5, ROOM.h - 0.1, -ROOM.d * 2 + 1.5]} intensity={0.85} />
      <IndustrialLamp position={[-2.5, ROOM.h - 0.1, -ROOM.d * 3 - 2]} intensity={0.9} />
      <IndustrialLamp position={[2.5, ROOM.h - 0.1, -ROOM.d * 3 + 1.5]} intensity={0.85} />
    </>
  )
}

export default function XRScene() {
  const { gl, scene, camera } = useThree()
  const [solved, setSolved] = useState<[boolean, boolean, boolean]>([false, false, false])

  const vr = useMemo(() => {
    const items: Array<{ obj: THREE.Object3D; onSelect: (hit: THREE.Intersection) => void }> = []
    return {
      register(obj: THREE.Object3D, onSelect: (hit: THREE.Intersection) => void) {
        const entry = { obj, onSelect }
        items.push(entry)
        return () => {
          const i = items.indexOf(entry)
          if (i >= 0) items.splice(i, 1)
        }
      },
      items,
    }
  }, [])

  const pressedPrev = useRef(new WeakMap<XRInputSource, boolean>())
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const origin = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    scene.background = new THREE.Color("#0b0d10")
    scene.fog = new THREE.Fog("#0b0d10", 12, 26)
    gl.setClearColor("#0b0d10")
  }, [gl, scene])

  const markSolved = (idx: number) => {
    setSolved(prev => {
      if (prev[idx]) return prev
      const next = [...prev] as [boolean, boolean, boolean]
      next[idx] = true
      return next
    })
  }

  useFrame((_, dt) => {
    __frameNo++

    scene.traverse(o => {
      const tick = (o as any).userData?.tick
      if (typeof tick === "function") tick(dt, camera)
    })

    if (!gl.xr.isPresenting) return
    const session = gl.xr.getSession()
    const frame = gl.xr.getFrame()
    const refSpace = gl.xr.getReferenceSpace()
    if (!session || !frame || !refSpace) return

    for (const source of session.inputSources) {
      const gp = source.gamepad
      if (!gp || gp.buttons.length === 0) continue

      const pressed = gp.buttons[0].pressed
      const prev = pressedPrev.current.get(source) ?? false
      pressedPrev.current.set(source, pressed)
      if (!(pressed && !prev)) continue

      const pose = frame.getPose(source.targetRaySpace, refSpace)
      if (!pose) continue

      m4.fromArray(pose.transform.matrix)
      q.setFromRotationMatrix(m4)
      origin.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z)
      dir.set(0, 0, -1).applyQuaternion(q).normalize()

      raycaster.set(origin, dir)
      const hits = raycaster.intersectObjects(vr.items.map(i => i.obj), true)
      if (!hits.length) continue

      let cur: THREE.Object3D | null = hits[0].object
      let found = vr.items.find(i => i.obj === cur)
      while (!found && cur?.parent) {
        cur = cur.parent
        found = vr.items.find(i => i.obj === cur)
      }

      found?.onSelect(hits[0])
    }
  })

  return (
    <>
      <InteractKeyListener />
      <Lights />
      <Room1 solved={solved} onSolved={markSolved} consumeE={consumeE} vr={vr} />
      <Room2 consumeE={consumeE} vr={vr} />
      <Room3 consumeE={consumeE} vr={vr} />
      <Room4 />
      <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={30} blur={2.5} far={20} />
    </>
  )
}
