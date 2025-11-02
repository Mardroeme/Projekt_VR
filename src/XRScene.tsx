
import * as THREE from "three"
import { useEffect, useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { ContactShadows } from "@react-three/drei"
import Room1, { ROOM } from "./Room1"
import Room2 from "./Room2"

// ============ Interakcja E ============
let __ePulse = false
let __listenerAttached = false

function InteractKeyListener() {
  useEffect(() => {
    if (__listenerAttached) return
    const onDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && !e.repeat) __ePulse = true
    }
    window.addEventListener("keydown", onDown)
    __listenerAttached = true
    return () => {
      window.removeEventListener("keydown", onDown)
      __listenerAttached = false
    }
  }, [])
  return null
}
function consumeE() { if (__ePulse) { __ePulse = false; return true } return false }

function IndustrialLamp({ position = [0, ROOM.h - 0.2, 0] as [number, number, number], intensity = 0.95 }) {
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
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <meshStandardMaterial color={"#202327"} />
      </mesh>
      <pointLight intensity={intensity} distance={8} />
    </group>
  )
}

function Lights() {
  const dir = useRef<THREE.DirectionalLight>(null)
  useFrame(({ clock }) => {
    if (!dir.current) return
    dir.current.intensity = 0.8 + Math.sin(clock.elapsedTime * 1.7) * 0.03
  })
  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.12} groundColor={"#1a1a1a"} />
      <directionalLight ref={dir} castShadow position={[4, 6, 2]} intensity={0.8} shadow-mapSize={1024} />
      {/* Lampy – RoomA */}
      <IndustrialLamp position={[-3, ROOM.h - 0.1, -1.5]} intensity={0.9} />
      <IndustrialLamp position={[ 3, ROOM.h - 0.1,  1.5]} intensity={0.85} />
      {/* nad przejściem (RoomA strona) */}
      <IndustrialLamp position={[0, ROOM.h - 0.1, -ROOM.d/2 + 0.4]} intensity={1.25} />
      {/* RoomB */}
      <IndustrialLamp position={[-2.5, ROOM.h - 0.1, -ROOM.d - 2]} intensity={0.9} />
      <IndustrialLamp position={[ 2.5, ROOM.h - 0.1, -ROOM.d + 1.5]} intensity={0.85} />
      <pointLight position={[0, ROOM.h - 0.2, -ROOM.d/2 + 0.6]} intensity={1.2} distance={10} />
    </>
  )
}

export default function XRScene() {
  const { gl, scene } = useThree()
  const [solved, setSolved] = useState<[boolean, boolean, boolean]>([false, false, false])

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

  return (
    <group>
      <InteractKeyListener />
      <Lights />

      <Room1 solved={solved} onSolved={markSolved} consumeE={consumeE} />
      <Room2 />

      <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={ROOM.w * 2} blur={2.6} far={3} />
    </group>
  )
}
