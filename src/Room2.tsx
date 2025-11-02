
import * as THREE from "three"
import { useMemo } from "react"

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
  const { w, h } = ROOM
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

  const South = () => (orientation === "south" ? <OpenWall z={+ROOM.d / 2} /> : <FullWall z={+ROOM.d / 2} />)
  const North = () => (orientation === "north" ? <OpenWall z={-ROOM.d / 2} /> : <FullWall z={-ROOM.d / 2} />)

  return (
    <group>
      <North />
      <South />
      <mesh position={[ROOM.w / 2, ROOM.h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow userData={{ collider: true }}>
        <boxGeometry args={[ROOM.d, ROOM.h, t]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[-ROOM.w / 2, ROOM.h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow userData={{ collider: true }}>
        <boxGeometry args={[ROOM.d, ROOM.h, t]} />
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

export default function Room2() {
  return (
    <group name="RoomB" position={[0, 0, -ROOM.d]}>
      <Ground />
      <WallsWithStaticOpening orientation="south" />
      <Ceiling />
      <Table position={[1.2, 0.8, 1]} />
      <pointLight position={[0, ROOM.h - 0.6, 0]} intensity={0.7} distance={7} color={"#ff6b6b"} />
    </group>
  )
}
