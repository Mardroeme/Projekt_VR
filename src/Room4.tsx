import * as THREE from "three"
import { useMemo } from "react"
import { Text } from "@react-three/drei"

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

type DoorWallSide = "north" | "south" | "both" | "none"
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
        <mesh position={[ -(doorW / 2 + segW / 2), h / 2, z ]} castShadow userData={{ collider: true }}>
          <boxGeometry args={[segW, h, t]} />
          <primitive object={mat} attach="material" />
        </mesh>
        <mesh position={[ doorW / 2 + segW / 2, h / 2, z ]} castShadow userData={{ collider: true }}>
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

  const South = () => (orientation === "south" || orientation === "both" ? <OpenWall z={+ROOM.d / 2} /> : <FullWall z={+ROOM.d / 2} />)
  const North = () => (orientation === "north" || orientation === "both" ? <OpenWall z={-ROOM.d / 2} /> : <FullWall z={-ROOM.d / 2} />)

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

function Chair({ position = [0, 0.0, -0.85] as [number, number, number], rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* siedzisko */}
      <mesh position={[0, 0.35, 0]} castShadow userData={{ collider: true }}>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color={"#3b434e"} roughness={0.9} />
      </mesh>
      {/* oparcie (ZA postacią) */}
      <mesh position={[0, 0.65, -0.22]} castShadow userData={{ collider: true }}>
        <boxGeometry args={[0.5, 0.6, 0.06]} />
        <meshStandardMaterial color={"#353c46"} roughness={0.9} />
      </mesh>
      {/* nogi */}
      {[-0.22, 0.22].map((x) =>
        [-0.22, 0.22].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.18, z]} castShadow userData={{ collider: true }}>
            <boxGeometry args={[0.06, 0.36, 0.06]} />
            <meshStandardMaterial color={"#2f3540"} roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  )
}

function CharacterSeated({ position = [0, 0.8, -0.85] as [number, number, number], rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* tułów */}
      <mesh position={[0, -0.25, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.45, 12]} />
        <meshStandardMaterial color={"#6d7a8b"} />
      </mesh>
      {/* głowa */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={"#c9d1d9"} />
      </mesh>
      {/* ręce */}
      <mesh position={[0.18, -0.18, 0]} rotation={[0, 0, -Math.PI/6]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.28, 8]} />
        <meshStandardMaterial color={"#6d7a8b"} />
      </mesh>
      <mesh position={[-0.18, -0.18, 0]} rotation={[0, 0, Math.PI/6]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.28, 8]} />
        <meshStandardMaterial color={"#6d7a8b"} />
      </mesh>
      {/* nogi zgięte */}
      <mesh position={[0.08, -0.45, 0]} rotation={[0, 0, -Math.PI/10]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
        <meshStandardMaterial color={"#6d7a8b"} />
      </mesh>
      <mesh position={[-0.08, -0.45, 0]} rotation={[0, 0, Math.PI/10]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
        <meshStandardMaterial color={"#6d7a8b"} />
      </mesh>
    </group>
  )
}

export default function Room4() {
  return (
    <group name="RoomD" position={[0, 0, -ROOM.d * 3]}>
      <Ground />
      <WallsWithStaticOpening orientation="south" />
      <Ceiling />
      <Table position={[0, 0.8, 0]} />
      <Chair position={[0, 0.0, -0.85]} rotationY={0} />
      <CharacterSeated position={[0, 0.8, -0.85]} rotationY={0} />
      <Text
        position={[0, 1.9, -0.85]}
        fontSize={0.6}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Gratulacje!
      </Text>
      <pointLight position={[0, ROOM.h - 0.6, 0]} intensity={0.8} distance={8} color={"#b0a7ff"} />
    </group>
  )
}
