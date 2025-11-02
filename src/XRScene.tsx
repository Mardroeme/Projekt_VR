
import * as THREE from "three"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { ContactShadows, Text, Billboard } from "@react-three/drei"

// =============================
// Interakcja klawiszem "E"
// =============================
let __ePulse = false
let __listenerAttached = false

function InteractKeyListener() {
  useEffect(() => {
    if (__listenerAttached) return
    const onDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && !e.repeat) __ePulse = true
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e") {
        // nic – trzymanie nie daje dodatkowych akcji, działamy na PULSE
      }
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

function consumeInteractPulse() {
  if (__ePulse) {
    __ePulse = false
    return true
  }
  return false
}

// =============================
// Parametry pokoju
// =============================
const ROOM = { w: 12, d: 12, h: 3.0 }
const WALL_T = 0.2

// =============================
// Oświetlenie
// =============================
function Lights() {
  const dir = useRef<THREE.DirectionalLight>(null)
  useFrame(({ clock }) => {
    if (!dir.current) return
    dir.current.intensity = 0.9 + Math.sin(clock.elapsedTime * 2.1) * 0.03
  })
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight intensity={0.15} groundColor={"#1a1a1a"} />
      <directionalLight ref={dir} castShadow position={[4, 6, 2]} intensity={0.9} shadow-mapSize={1024} />
      <pointLight position={[0, ROOM.h - 0.3, 0]} intensity={0.6} distance={8} />
    </>
  )
}

// =============================
// Podłoga
// =============================
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM.w, ROOM.d]} />
      <meshStandardMaterial color={"#2d3138"} roughness={0.95} />
    </mesh>
  )
}

// =============================
// Prosty sufit
// =============================
function Ceiling() {
  return (
    <mesh position={[0, ROOM.h, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM.w, ROOM.d]} />
      <meshStandardMaterial color={"#2a2f36"} roughness={0.98} />
    </mesh>
  )
}

// =============================
// Ściany z opcjonalnym otworem na drzwi
// =============================
type DoorWallSide = "north" | "south" | "none"
function WallsWithDoorway({ orientation = "none" as DoorWallSide }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2f35", roughness: 0.96 }), [])
  const { w, d, h } = ROOM
  const t = WALL_T
  const doorW = 2.2
  const doorH = 2.2

  const FullWall = ({ z }: { z: number }) => (
    <mesh position={[0, h / 2, z]} castShadow>
      <boxGeometry args={[w, h, t]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )

  const DoorWall = ({ z }: { z: number }) => {
    const segW = (w - doorW) / 2
    const topH = h - doorH
    return (
      <group>
        <mesh position={[-(doorW / 2 + segW / 2), h / 2, z]} castShadow>
          <boxGeometry args={[segW, h, t]} />
          <primitive object={mat} attach="material" />
        </mesh>
        <mesh position={[doorW / 2 + segW / 2, h / 2, z]} castShadow>
          <boxGeometry args={[segW, h, t]} />
          <primitive object={mat} attach="material" />
        </mesh>
        <mesh position={[0, doorH + (topH / 2), z]} castShadow>
          <boxGeometry args={[doorW, topH, t]} />
          <primitive object={mat} attach="material" />
        </mesh>
      </group>
    )
  }

  const North = () => (orientation === "north" ? <DoorWall z={-d / 2} /> : <FullWall z={-d / 2} />)
  const South = () => (orientation === "south" ? <DoorWall z={+d / 2} /> : <FullWall z={+d / 2} />)

  return (
    <group>
      <North />
      <South />
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[d, h, t]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[d, h, t]} />
        <primitive object={mat} attach="material" />
      </mesh>
    </group>
  )
}

// =============================
// Stół
// =============================
function Table({ position = [0, 0.8, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.7]} />
        <meshStandardMaterial color={"#404853"} roughness={0.85} />
      </mesh>
      {[-0.5, 0.5].map((x) =>
        [-0.25, 0.25].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.45, z]} castShadow>
            <boxGeometry args={[0.08, 0.8, 0.08]} />
            <meshStandardMaterial color={"#3a414b"} />
          </mesh>
        ))
      )}
    </group>
  )
}

// =============================
// Pojedyncza kostka sterowana klawiszem E
// =============================
function PuzzleCube({
  index,
  position,
  solved,
  onSolved,
  range = 2.0,
}: {
  index: number
  position: [number, number, number]
  solved: boolean
  onSolved: (idx: number) => void
  range?: number
}) {
  const { camera } = useThree()
  const cubeRef = useRef<THREE.Mesh>(null)
  const [inRange, setInRange] = useState(false)

  useFrame(() => {
    const m = cubeRef.current
    if (!m) return
    const dist = m.position.distanceTo(camera.position)
    const near = dist <= range
    if (near !== inRange) setInRange(near)
    if (!solved && near && consumeInteractPulse()) {
      onSolved(index)
    }
  })

  return (
    <group>
      <mesh ref={cubeRef} position={position} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={solved ? "limegreen" : "gold"} />
      </mesh>
      {!solved && inRange && (
        <Billboard position={[position[0], position[1] + 0.55, position[2]]}>
          <Text fontSize={0.16} color={"#ffffff"} anchorX="center" anchorY="middle">
            E – interakcja
          </Text>
        </Billboard>
      )}
    </group>
  )
}

// =============================
// Drzwi z zawiasem + licznik postępu
// =============================
function HingedDoor({ open, progress }: { open: boolean; progress: string }) {
  const pivot = useRef<THREE.Group>(null)
  const doorW = 2.2
  const doorH = 2.2
  const zAtWall = -ROOM.d / 2 + WALL_T / 2 // płaszczyzna ściany północnej RoomA

  useFrame((_, dt) => {
    const t = pivot.current
    if (!t) return
    const target = open ? Math.PI / 2 : 0
    t.rotation.y = THREE.MathUtils.lerp(t.rotation.y, target, 1 - Math.pow(0.0001, dt * 2.2))
  })

  return (
    <group>
      {/* ościeżnica – wizual */}
      <mesh position={[0, doorH / 2 + 0.1, zAtWall - WALL_T / 2]} castShadow>
        <boxGeometry args={[2.2, 2.4, WALL_T]} />
        <meshStandardMaterial color={"#1f232a"} />
      </mesh>

      {/* zawias (pivot) */}
      <group ref={pivot} position={[-doorW / 2, doorH / 2, zAtWall]}>
        <mesh castShadow position={[doorW / 2, 0, 0]}>
          <boxGeometry args={[doorW, doorH, 0.08]} />
          <meshStandardMaterial color={"#2a2f38"} />
        </mesh>
      </group>

      {/* licznik postępu */}
      <Billboard position={[0, doorH + 0.2, zAtWall + 0.04]}>
        <Text fontSize={0.22} color={open ? "#2ecc71" : "#e0e6ef"} anchorX="center" anchorY="middle">
          {progress}
        </Text>
      </Billboard>
    </group>
  )
}

// =============================
// Scena główna
// =============================
export default function XRScene() {
  const { gl, scene } = useThree()
  const [solved, setSolved] = useState<[boolean, boolean, boolean]>([false, false, false])

  const solvedCount = (solved[0] ? 1 : 0) + (solved[1] ? 1 : 0) + (solved[2] ? 1 : 0)
  const doorOpen = solvedCount === 3

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

      {/* ROOM A (przód) */}
      <group name="RoomA" position={[0, 0, 0]}>
        <Ground />
        <WallsWithDoorway orientation="north" />
        <Ceiling />

        <Table position={[-2.2, 0.8, -0.5]} />
        <Table position={[2.4, 0.8, 1.4]} />

        <PuzzleCube index={0} position={[-2, 0.8, -1]} solved={solved[0]} onSolved={markSolved} />
        <PuzzleCube index={1} position={[0, 0.8, 1]} solved={solved[1]} onSolved={markSolved} />
        <PuzzleCube index={2} position={[2, 0.8, 2]} solved={solved[2]} onSolved={markSolved} />

        <HingedDoor open={doorOpen} progress={`${solvedCount}/3`} />
      </group>

      {/* ROOM B (za drzwiami) */}
      <group name="RoomB" position={[0, 0, -ROOM.d]}>
        <Ground />
        <WallsWithDoorway orientation="south" />
        <Ceiling />
        <Table position={[1.2, 0.8, 1]} />
        <pointLight position={[0, ROOM.h - 0.6, 0]} intensity={0.7} distance={7} color={"#ff6b6b"} />
      </group>

      <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={ROOM.w * 2} blur={2.6} far={3} />
    </group>
  )
}
