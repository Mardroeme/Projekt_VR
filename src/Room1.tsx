
import * as THREE from "three"
import { useMemo, useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Text, Billboard } from "@react-three/drei"

// Wspólne parametry
export const ROOM = { w: 12, d: 12, h: 3.0 }
export const WALL_T = 0.2

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM.w, ROOM.d]} />
      <meshStandardMaterial color={"#2d3138"} roughness={0.95} />
    </mesh>
  )
}

function Ceiling() {
  return (
    <mesh position={[0, ROOM.h, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM.w, ROOM.d]} />
      <meshStandardMaterial color={"#2a2f36"} roughness={0.98} />
    </mesh>
  )
}

type DoorWallSide = "north" | "south" | "none"
function WallsWithStaticOpening({ orientation = "none" as DoorWallSide }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2f35", roughness: 0.96 }), [])
  const { w, d, h } = ROOM
  const t = WALL_T
  const doorW = 2.4
  const doorH = 2.3

  const FullWall = ({ z }: { z: number }) => (
    <mesh position={[0, h / 2, z]} castShadow userData={{ collider: true }}>
      <boxGeometry args={[w, h, t]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )

  const OpenWall = ({ z }: { z: number }) => {
    const segW = (w - doorW) / 2
    const topH = h - doorH
    return (
      <group>
        <mesh position={[-(doorW / 2 + segW / 2), h / 2, z]} castShadow userData={{ collider: true }}>
          <boxGeometry args={[segW, h, t]} />
          <primitive object={mat} attach="material" />
        </mesh>
        <mesh position={[doorW / 2 + segW / 2, h / 2, z]} castShadow userData={{ collider: true }}>
          <boxGeometry args={[segW, h, t]} />
          <primitive object={mat} attach="material" />
        </mesh>
        {/* nadproże bez kolizji */}
        <mesh position={[0, doorH + (topH / 2), z]} castShadow userData={{ collider: false }}>
          <boxGeometry args={[doorW, topH, t]} />
          <primitive object={mat} attach="material" />
        </mesh>
      </group>
    )
  }

  const North = () => (orientation === "north" ? <OpenWall z={-d / 2} /> : <FullWall z={-d / 2} />)
  const South = () => (orientation === "south" ? <OpenWall z={+d / 2} /> : <FullWall z={+d / 2} />)

  return (
    <group>
      <North />
      <South />
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow userData={{ collider: true }}>
        <boxGeometry args={[d, h, t]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow userData={{ collider: true }}>
        <boxGeometry args={[d, h, t]} />
        <primitive object={mat} attach="material" />
      </mesh>
    </group>
  )
}

function Table({ position = [0, 0.8, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, -0.05, 0]} userData={{ collider: true }}>
        <boxGeometry args={[1.2, 0.1, 0.7]} />
        <meshStandardMaterial color={"#404853"} roughness={0.85} />
      </mesh>
      {[-0.5, 0.5].map((x) =>
        [-0.25, 0.25].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.45, z]} castShadow userData={{ collider: true }}>
            <boxGeometry args={[0.08, 0.8, 0.08]} />
            <meshStandardMaterial color={"#3a414b"} />
          </mesh>
        ))
      )}
    </group>
  )
}

function InstructionPoster() {
  const x = -ROOM.w/2 + 0.18
  return (
    <group position={[x, 1.35, -1.5]}>
      <mesh rotation={[0, Math.PI/2, 0]} castShadow userData={{ collider: false }}>
        <planeGeometry args={[1.8, 1.1]} />
        <meshStandardMaterial color={"#15181d"} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <group rotation={[0, Math.PI/2, 0]} position={[0.002, 0, 0.001]}>
        <Text fontSize={0.12} maxWidth={1.6} lineHeight={1.2} color={"#e6edf3"} anchorX="center" anchorY="middle">
          {`INSTRUKCJA:\nZbierz/aktywuj 3 kostki (E).\nPo 3/3 drzwi przesuną się i przejście będzie wolne.`}
        </Text>
      </group>
    </group>
  )
}

function PuzzleCube({
  index,
  position,
  solved,
  onSolved,
  range = 2.0,
  consumeE,
}: {
  index: number
  position: [number, number, number]
  solved: boolean
  onSolved: (idx: number) => void
  range?: number
  consumeE: () => boolean
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
    if (!solved && near && consumeE()) onSolved(index)
  })

  return (
    <group>
      <mesh ref={cubeRef} position={position} castShadow userData={{ collider: true }}>
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

function SlidingDoor({ open }: { open: boolean }) {
  const plate = useRef<THREE.Mesh>(null)
  const doorW = 2.35
  const doorH = 2.25
  const thickness = 0.08
  const zAtWall = -ROOM.d / 2 + WALL_T / 2 - 0.03
  const closedX = 0
  const openX = doorW + 0.35

  useFrame((_, dt) => {
    const m = plate.current
    if (!m) return
    const target = open ? openX : closedX
    m.position.x = THREE.MathUtils.damp(m.position.x, target, 1.5, dt)
  })

  return (
    <mesh ref={plate} position={[closedX, doorH / 2, zAtWall]} castShadow userData={{ collider: true }}>
      <boxGeometry args={[doorW, doorH, thickness]} />
      <meshStandardMaterial color={"#2a2f38"} metalness={0.1} roughness={0.7} />
    </mesh>
  )
}

export default function Room1({
  solved, onSolved, consumeE
}: {
  solved: [boolean, boolean, boolean]
  onSolved: (idx: number) => void
  consumeE: () => boolean
}) {
  const solvedCount = (solved[0]?1:0)+(solved[1]?1:0)+(solved[2]?1:0)
  const doorOpen = solvedCount === 3
  const zAtWall = -ROOM.d / 2 + WALL_T / 2
  const doorH = 2.3

  return (
    <group name="RoomA" position={[0, 0, 0]}>
      <Ground />
      <WallsWithStaticOpening orientation="north" />
      <Ceiling />

      <InstructionPoster />

      <Table position={[-2.2, 0.8, -0.5]} />
      <Table position={[2.4, 0.8, 1.4]} />

      <PuzzleCube index={0} position={[-2, 0.8, -1]} solved={solved[0]} onSolved={onSolved} consumeE={consumeE} />
      <PuzzleCube index={1} position={[0, 0.8, 1]} solved={solved[1]} onSolved={onSolved} consumeE={consumeE} />
      <PuzzleCube index={2} position={[2, 0.8, 2]} solved={solved[2]} onSolved={onSolved} consumeE={consumeE} />

      {!doorOpen && (
        <group position={[0, doorH + 0.35, zAtWall + 0.06]} rotation={[0, 0, 0]}>
          <Text fontSize={0.26} color={"#e6edf3"} anchorX="center" anchorY="middle">
            {`${solvedCount}/3`}
          </Text>
        </group>
      )}

      <SlidingDoor open={doorOpen} />
    </group>
  )
}
