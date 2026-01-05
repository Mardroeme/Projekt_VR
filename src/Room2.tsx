import * as THREE from "three"
import { useMemo, useRef, useState, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Text, Billboard } from "@react-three/drei"

type VRReg = {
  register: (obj: THREE.Object3D, onSelect: (hit: THREE.Intersection) => void) => () => void
}

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

type DoorWallSide = "north" | "south" | "none" | "both"
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
        <mesh position={[0, doorH + topH / 2, z]} castShadow userData={{ collider: false }}>
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

// ====== ZAGADKA 1: bezpieczniki + skrzynka, kolejność I->II->III ======
function FuseBoxPuzzle({
  solvedAlready,
  onSolved,
  consumeE,
  vr,
  tablePos = [0.0, 0.8, 0.9] as [number, number, number],
}: {
  solvedAlready: boolean
  onSolved: () => void
  consumeE: () => boolean
  vr?: VRReg
  tablePos?: [number, number, number]
}) {
  const { camera } = useThree()

  const [carrying, setCarrying] = useState<number | null>(null)
  const [socketFilled, setSocketFilled] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [nextRequired, setNextRequired] = useState(0)

  const fuseRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const boxInteractRef = useRef<THREE.Mesh>(null)

  const wp = useRef(new THREE.Vector3())
  const wp2 = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3())
  const carryWorld = useRef(new THREE.Vector3())

  const fuseLabels = ["I", "II", "III"] as const

  const fuseLocalPos: [number, number, number][] = [
    [tablePos[0] - 0.25, 0.95, tablePos[2] - 0.05],
    [tablePos[0] + 0.0, 0.95, tablePos[2] - 0.05],
    [tablePos[0] + 0.25, 0.95, tablePos[2] - 0.05],
  ]

  const boxX = ROOM.w / 2 - WALL_T / 2 - 0.08
  const boxCenter: [number, number, number] = [boxX, 1.35, 0.0]

  const socketLocalPos: [number, number, number][] = [
    [boxX, 1.35 + 0.18, 0.0],
    [boxX, 1.35 + 0.0, 0.0],
    [boxX, 1.35 - 0.18, 0.0],
  ]

  const hardSnapAllToOrigin = () => {
    for (let i = 0; i < 3; i++) {
      const m = fuseRefs[i].current
      if (m) m.position.set(0, 0, 0)
    }
  }

  const resetAll = () => {
    hardSnapAllToOrigin()
    setCarrying(null)
    setSocketFilled([false, false, false])
    setNextRequired(0)
  }

  const tryPick = (i: number, hitDistance?: number) => {
    if (solvedAlready) return
    if (carrying !== null) return
    if (socketFilled[i]) return
    const m = fuseRefs[i].current
    if (!m) return
    m.getWorldPosition(wp.current)
    const distWorld = wp.current.distanceTo(camera.position)
    const distRay = typeof hitDistance === "number" ? hitDistance : Infinity
    if (distWorld > 1.35 || distRay > 1.6) return
    setCarrying(i)
  }

  const tryInsert = (hitDistance?: number) => {
    if (solvedAlready) return
    if (carrying === null) return

    const boxM = boxInteractRef.current
    if (!boxM) return
    boxM.getWorldPosition(wp2.current)
    const distWorld = wp2.current.distanceTo(camera.position)
    const distRay = typeof hitDistance === "number" ? hitDistance : Infinity
    // desktop (E)
    if (hitDistance === undefined && distWorld > 1.55) return
    // VR
    if (hitDistance !== undefined && distRay > 2.2) return

    const idx = carrying
    const expected = nextRequired
    if (idx !== expected) {
      resetAll()
      return
    }

    hardSnapAllToOrigin()
    setCarrying(null)
    setSocketFilled((prev) => {
      const n = [...prev] as [boolean, boolean, boolean]
      n[idx] = true
      return n
    })

    const next = expected + 1
    if (next >= 3) onSolved()
    else setNextRequired(next)
  }

  useFrame(() => {
    if (solvedAlready) return

    // każdy nie-niesiony bezpiecznik ma być w (0,0,0) lokalnie
    for (let i = 0; i < 3; i++) {
      if (i === carrying) continue
      const m = fuseRefs[i].current
      if (m && (m.position.x || m.position.y || m.position.z)) m.position.set(0, 0, 0)
    }

    if (carrying !== null) {
      const m = fuseRefs[carrying].current
      if (m) {
        forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
        forward.current.y = 0
        if (forward.current.lengthSq() > 1e-4) forward.current.normalize()

        carryWorld.current.copy(camera.position).addScaledVector(forward.current, 0.75)
        carryWorld.current.y -= 0.16

        const parent = m.parent as THREE.Object3D | null
        const desiredLocal = carryWorld.current.clone()
        if (parent) parent.worldToLocal(desiredLocal)

        m.position.lerp(desiredLocal, 0.45)
      }
    }

    if (!consumeE()) return
    if (carrying === null) {
      // E: wybierz najbliższy bezpiecznik
      let bestIdx: number | null = null
      let bestDist = Infinity
      for (let i = 0; i < 3; i++) {
        if (socketFilled[i]) continue
        const m = fuseRefs[i].current
        if (!m) continue
        m.getWorldPosition(wp.current)
        const d = wp.current.distanceTo(camera.position)
        if (d <= 1.35 && d < bestDist) {
          bestDist = d
          bestIdx = i
        }
      }
      if (bestIdx !== null) setCarrying(bestIdx)
      return
    }

    // E: włożenie do skrzynki
    tryInsert(undefined)
  })

  // VR rejestracja: bezpieczniki + skrzynka
  useEffect(() => {
    if (!vr || solvedAlready) return

    const offs: Array<() => void> = []

    for (let i = 0; i < 3; i++) {
      const m = fuseRefs[i].current
      if (!m) continue
      offs.push(
        vr.register(m, (hit) => {
          tryPick(i, hit.distance)
        })
      )
    }

    if (boxInteractRef.current) {
      offs.push(
        vr.register(boxInteractRef.current, (hit) => {
          tryInsert(hit.distance)
        })
      )
    }

    return () => offs.forEach((fn) => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vr, carrying, nextRequired, solvedAlready])

  return (
    <group>
      <Table position={tablePos} />

      {([0, 1, 2] as const).map((i) => {
        const isCarried = carrying === i
        const isFilled = socketFilled[i]
        const pos = isFilled ? socketLocalPos[i] : fuseLocalPos[i]

        return (
          <group key={"fuse-" + i} position={pos}>
            <mesh ref={fuseRefs[i]} castShadow userData={{ collider: true }} visible={!isFilled || isCarried}>
              <cylinderGeometry args={[0.08, 0.08, 0.22, 16]} />
              <meshStandardMaterial
                color={isFilled ? "#15c915" : isCarried ? "#cfcfcf" : "#ffcc33"}
                metalness={0.2}
                roughness={0.5}
              />
            </mesh>

            <Text
              position={[0, 0.16, 0]}
              fontSize={0.12}
              color={"#0b0d10"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.004}
              outlineColor={"#e6edf3"}
            >
              {fuseLabels[i]}
            </Text>
          </group>
        )
      })}

      <group position={boxCenter} rotation={[0, -Math.PI / 2, 0]}>
        <mesh ref={boxInteractRef} castShadow userData={{ collider: true }}>
          <boxGeometry args={[0.7, 0.7, 0.12]} />
          <meshStandardMaterial color={"#222a33"} roughness={0.85} />
        </mesh>

        <Text position={[0, 0.42, 0.08]} fontSize={0.14} color={"#e6edf3"} anchorX="center" anchorY="middle">
          Skrzynka
        </Text>

        {([0, 1, 2] as const).map((i) => {
          const filled = socketFilled[i]
          const isNext = i === nextRequired && !solvedAlready

          return (
            <group key={"sock-" + i} position={[0, 0.18 - i * 0.18, 0.062]}>
              <mesh userData={{ collider: false }}>
                <boxGeometry args={[0.42, 0.14, 0.02]} />
                <meshStandardMaterial
                  color={filled ? "#15c915" : isNext ? "#b0a7ff" : "#3a434e"}
                  emissive={filled ? "#15c915" : isNext ? "#2a1f55" : "#000000"}
                  emissiveIntensity={filled ? 0.55 : isNext ? 0.35 : 0}
                  roughness={0.8}
                />
              </mesh>
              <Text position={[-0.27, 0, 0.02]} fontSize={0.12} color={"#e6edf3"} anchorX="left" anchorY="middle">
                {fuseLabels[i]}
              </Text>
            </group>
          )
        })}
      </group>

      {!solvedAlready && (
        <Billboard position={[tablePos[0], 1.75, tablePos[2]]}>
          <Text fontSize={0.14} maxWidth={1.9} lineHeight={1.15} color={"#ffffff"} anchorX="center" anchorY="middle">
            {carrying === null
              ? `E – podnieś bezpiecznik\nKolejność: I → II → III`
              : `Podejdź do skrzynki\nE – włóż (zły resetuje)`}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

// ====== ZAGADKA 2: obracane płytki (90°) + wzór referencyjny ======
function TileRotatePuzzle({
  solvedAlready,
  onSolved,
  vr,
}: {
  solvedAlready: boolean
  onSolved: () => void
  vr?: VRReg
}) {
  const { camera } = useThree()
  const [rot, setRot] = useState<[0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]>([0, 0, 0, 0])

  // WZÓR: pokazujemy go po prawej (referencja)
  const goal = useMemo(() => [1, 3, 0, 2] as const, [])

  useEffect(() => {
    if (solvedAlready) return
    const ok = rot[0] === goal[0] && rot[1] === goal[1] && rot[2] === goal[2] && rot[3] === goal[3]
    if (ok) onSolved()
  }, [rot, goal, solvedAlready, onSolved])

  const clickTile = (idx: 0 | 1 | 2 | 3, e: any) => {
    if (solvedAlready) return
    e.stopPropagation?.()

    // limit dystansu
    const hitDist = typeof e?.distance === "number" ? e.distance : Infinity
    const w = new THREE.Vector3()
    e.object.getWorldPosition(w)
    const worldDist = w.distanceTo(camera.position)
    if (worldDist > 1.85 || hitDist > 2.0) return

    setRot((prev) => {
      const next = [...prev] as any
      next[idx] = ((next[idx] + 1) % 4) as 0 | 1 | 2 | 3
      return next
    })
  }

  // === USTAWIENIE NA LEWEJ ŚCIANIE ===
  const wallX = -ROOM.w / 2 + WALL_T / 2 + 0.06
  const panelY = 1.45
  const panelZ = 0.9
  const gap = 0.58

  const liveZ = panelZ
  const refZ = panelZ + 1.35

  const tileOffset = (i: 0 | 1 | 2 | 3) => {
    const dz = i % 2 === 0 ? -gap / 2 : gap / 2
    const dy = i < 2 ? gap / 2 : -gap / 2
    return { dy, dz }
  }

  const TileFace = ({
    idx,
    rotIndex,
    interactive,
    title,
    zBase,
  }: {
    idx: 0 | 1 | 2 | 3
    rotIndex: 0 | 1 | 2 | 3
    interactive: boolean
    title?: string
    zBase: number
  }) => {
    const { dy, dz } = tileOffset(idx)
    const rz = rotIndex * (Math.PI / 2)

    const ref = useRef<THREE.Mesh>(null)

    // VR: trigger/select ma działać jak klik (tylko live)
    useEffect(() => {
      if (!vr || !interactive || solvedAlready || !ref.current) return
      return vr.register(ref.current, (hit) => {
        clickTile(idx, { stopPropagation: () => {}, distance: hit.distance, object: hit.object })
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vr, interactive, solvedAlready, rotIndex])

    return (
      <group position={[wallX, panelY, zBase]} rotation={[0, Math.PI / 2, 0]}>
        {title && (
          <Text position={[0, 0.78, 0]} fontSize={0.16} color={"#e6edf3"} anchorX="center" anchorY="middle">
            {title}
          </Text>
        )}

        <group position={[dz, dy, 0]}>
          <mesh
            ref={ref}
            rotation={[0, 0, rz]}
            castShadow
            onPointerDown={interactive ? (e) => clickTile(idx, e) : undefined}
            userData={{ collider: false }}
          >
            <boxGeometry args={[0.52, 0.52, 0.04]} />
            <meshStandardMaterial color={interactive ? (solvedAlready ? "#15c915" : "#1a222c") : "#0f151c"} roughness={0.92} />
            {/* znak L */}
            <group position={[0, 0, 0.028]} scale={interactive ? 1 : 0.9}>
              <mesh>
                <boxGeometry args={[0.22, 0.06, 0.02]} />
                <meshStandardMaterial emissive={"#b0a7ff"} emissiveIntensity={0.75} color={"#2b3340"} />
              </mesh>
              <mesh position={[-0.08, -0.08, 0]}>
                <boxGeometry args={[0.06, 0.22, 0.02]} />
                <meshStandardMaterial emissive={"#b0a7ff"} emissiveIntensity={0.75} color={"#2b3340"} />
              </mesh>
            </group>
          </mesh>
        </group>
      </group>
    )
  }

  const indices = [0, 1, 2, 3] as const

  return (
    <group>
      {indices.map((i) => (
        <TileFace
          key={"live-" + i}
          idx={i}
          rotIndex={rot[i]}
          interactive={true}
          title={i === 0 ? "Ułóż symbol" : undefined}
          zBase={liveZ}
        />
      ))}

      {indices.map((i) => (
        <TileFace
          key={"ref-" + i}
          idx={i}
          rotIndex={goal[i] as 0 | 1 | 2 | 3}
          interactive={false}
          title={i === 0 ? "Wzór" : undefined}
          zBase={refZ}
        />
      ))}
    </group>
  )
}
// ====== ZAGADKA 3: generator + jeden przycisk (3 zatrzymania) ======
// Zasada: musisz "zatrzymać" wskaźnik 3 razy w zielonym okienku (kolejno).
// Pudło (wciśnięcie poza oknem) -> reset do początku (0/3).
function GeneratorTimingPuzzle({
  solvedAlready,
  onSolved,
  consumeE,
  vr,
}: {
  solvedAlready: boolean
  onSolved: () => void
  consumeE: () => boolean
  vr?: VRReg
}) {
  const { camera } = useThree()

  const phaseRef = useRef(0)
  const runningRef = useRef(true)
  const freezeRef = useRef(0)

  const stageRef = useRef<0 | 1 | 2>(0)
  const [stageUi, setStageUi] = useState<0 | 1 | 2 | 3>(0)

  const buttonRef = useRef<THREE.Mesh>(null)
  const needleRef = useRef<THREE.Mesh>(null)
  const windowRef = useRef<THREE.Mesh>(null)
  const wp = useRef(new THREE.Vector3())

  // 3 okna czasowe
  const windows = useMemo(() => {
    return [
      { a: 0.42, b: 0.58 },
      { a: 0.12, b: 0.24 },
      { a: 0.70, b: 0.84 },
    ] as const
  }, [])

  const genPos: [number, number, number] = [2.3, 0.0, -0.2]
  const barW = 1.4

  const inWindow = (p: number, a: number, b: number) => p >= a && p <= b

  const applyWindowVisual = (idx: 0 | 1 | 2) => {
    const w = windows[idx]
    const winX = ((w.a + w.b) / 2 - 0.5) * barW
    const winW = Math.max(0.05, (w.b - w.a) * barW)
    if (windowRef.current) {
      windowRef.current.position.x = winX
      windowRef.current.scale.x = winW
    }
  }

  const resetAll = () => {
    stageRef.current = 0
    setStageUi(0)
    runningRef.current = true
    freezeRef.current = 0
    applyWindowVisual(0)
  }

  const successStop = () => {
    const next = (stageRef.current + 1) as 1 | 2 | 3
    if (next === 3) {
      setStageUi(3)
      onSolved()
      return
    }

    stageRef.current = next as 0 | 1 | 2
    setStageUi(next as 0 | 1 | 2 | 3)

    // pauza po trafieniu
    runningRef.current = false
    freezeRef.current = 0.55
    applyWindowVisual(stageRef.current)
  }

  const tryPress = () => {
    if (solvedAlready) return
    if (!runningRef.current) return

    const p = phaseRef.current
    const w = windows[stageRef.current]
    if (inWindow(p, w.a, w.b)) successStop()
    else resetAll()
  }

  // VR: trigger/select ma działać jak klik w przycisk
  useEffect(() => {
    if (!vr || solvedAlready || !buttonRef.current) return
    return vr.register(buttonRef.current, (hit) => {
      // zachowujemy ten sam limit co onPointerDown
      if (hit.distance > 2.2) return
      tryPress()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vr, solvedAlready, stageUi])

  useFrame((_, dt) => {
    if (solvedAlready) return

    if (!runningRef.current) {
      freezeRef.current -= dt
      if (freezeRef.current <= 0) {
        runningRef.current = true
        freezeRef.current = 0
      }
    }

    if (runningRef.current) {
      phaseRef.current = (phaseRef.current + dt * 0.6) % 1
    }

    const needleX = (phaseRef.current - 0.5) * barW
    if (needleRef.current) needleRef.current.position.x = needleX

    if (consumeE()) {
      if (!buttonRef.current) return
      buttonRef.current.getWorldPosition(wp.current)
      if (wp.current.distanceTo(camera.position) > 2.2) return
      tryPress()
    }
  })

  useEffect(() => {
    if (solvedAlready) return
    applyWindowVisual(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <group position={genPos}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.8, 1.1, 0.9]} />
        <meshStandardMaterial color={"#1b212a"} roughness={0.9} />
      </mesh>

      <group position={[0, 1.2, 0.47]}>
        <mesh>
          <boxGeometry args={[1.55, 0.55, 0.08]} />
          <meshStandardMaterial color={"#0f151c"} />
        </mesh>

        <group position={[0, 0.02, 0.05]}>
          <mesh>
            <boxGeometry args={[barW, 0.1, 0.02]} />
            <meshStandardMaterial color={"#222a33"} />
          </mesh>

          <mesh ref={windowRef} position={[0, 0, 0.012]} scale={[0.2, 1, 1]}>
            <boxGeometry args={[1, 0.11, 0.02]} />
            <meshStandardMaterial color={"#15c915"} emissive={"#15c915"} emissiveIntensity={0.25} transparent opacity={0.45} />
          </mesh>

          <mesh ref={needleRef} position={[0, 0, 0.02]}>
            <boxGeometry args={[0.05, 0.14, 0.03]} />
            <meshStandardMaterial color={"#b0a7ff"} emissive={"#b0a7ff"} emissiveIntensity={0.35} />
          </mesh>
        </group>

        <Text position={[0, 0.25, 0.05]} fontSize={0.14} color={"#e6edf3"} anchorX="center" anchorY="middle">
          Generator
        </Text>
        <Text position={[0.62, 0.25, 0.05]} fontSize={0.14} color={"#e6edf3"} anchorX="center" anchorY="middle">
          {`${stageUi}/3`}
        </Text>
      </group>

      <mesh
        ref={buttonRef}
        position={[0, 0.35, 0.55]}
        castShadow
        userData={{ collider: true }}
        onPointerDown={(e) => {
          e.stopPropagation?.()
          const hit = typeof (e as any)?.distance === "number" ? (e as any).distance : Infinity
          if (hit > 2.2) return
          tryPress()
        }}
      >
        <cylinderGeometry args={[0.12, 0.12, 0.1, 20]} />
        <meshStandardMaterial
          color={stageUi === 3 ? "#15c915" : "#b0a7ff"}
          emissive={stageUi === 3 ? "#15c915" : "#2a1f55"}
          emissiveIntensity={stageUi === 3 ? 0.35 : 0.2}
        />
      </mesh>

      {!solvedAlready && (
        <Billboard position={[0, 1.85, 0]}>
          <Text fontSize={0.14} color={"#ffffff"} anchorX="center" anchorY="middle">
            {`Zatrzymaj 3 razy w zielonym oknie\nPudło resetuje (0/3)`}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

function SlidingDoor


({ open }: { open: boolean }) {
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

type Props = { consumeE: () => boolean; vr?: VRReg }

export default function Room2({ consumeE, vr }: Props) {
  const [solved, setSolved] = useState<[boolean, boolean, boolean]>([false, false, false])
  const solvedCount = (solved[0] ? 1 : 0) + (solved[1] ? 1 : 0) + (solved[2] ? 1 : 0)
  const doorOpen = solvedCount === 3
  const zAtWall = -ROOM.d / 2 + WALL_T / 2
  const doorH = 2.3



  const handleSolved = (idx: number) => {
    setSolved((prev) => {
      if (prev[idx]) return prev
      const next = [...prev] as [boolean, boolean, boolean]
      next[idx] = true
      return next
    })
  }

  return (
    <group name="RoomB" position={[0, 0, -ROOM.d]}>
      <Ground />
      <WallsWithStaticOpening orientation="both" />
      <Ceiling />

      {/* 1: bezpieczniki */}
      <FuseBoxPuzzle solvedAlready={solved[0]} onSolved={() => handleSolved(0)} consumeE={consumeE} vr={vr} tablePos={[0.0, 0.8, 0.9]} />

      {/* 2: płytki */}
      <TileRotatePuzzle solvedAlready={solved[1]} onSolved={() => handleSolved(1)} vr={vr} />

      {/* 3: generator timing */}
      <GeneratorTimingPuzzle solvedAlready={solved[2]} onSolved={() => handleSolved(2)} consumeE={consumeE} vr={vr} />

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