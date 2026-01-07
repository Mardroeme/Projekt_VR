import * as THREE from "three"
import { useEffect, useMemo, useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Text, Billboard } from "@react-three/drei"

type VRReg = {
  register: (obj: THREE.Object3D, onSelect: (hit: THREE.Intersection) => void) => () => void
}

export const ROOM = { w: 12, d: 12, h: 3.0 }
export const WALL_T = 0.2

function VRClickableMesh({
  vr,
  onPointerDown,
  children,
  ...props
}: {
  vr?: VRReg
  onPointerDown?: (e: any) => void
  children?: any
  [key: string]: any
}) {
  const ref = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (!vr || !ref.current || !onPointerDown) return
    return vr.register(ref.current, (hit) => {
      onPointerDown({ stopPropagation: () => {}, distance: hit.distance, object: hit.object })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vr, onPointerDown])

  return (
    <mesh ref={ref} {...props} onPointerDown={onPointerDown}>
      {children}
    </mesh>
  )
}

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

  const South = () =>
    orientation === "south" || orientation === "both" ? <OpenWall z={+ROOM.d / 2} /> : <FullWall z={+ROOM.d / 2} />
  const North = () =>
    orientation === "north" || orientation === "both" ? <OpenWall z={-ROOM.d / 2} /> : <FullWall z={-ROOM.d / 2} />

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

function PuzzleCube({
  index,
  position,
  solved,
  onSolved,
  range = 1.0,
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
  const worldPos = useRef(new THREE.Vector3())
  const [inRange, setInRange] = useState(false)

  useFrame(() => {
    const m = cubeRef.current
    if (!m) return
    m.getWorldPosition(worldPos.current)
    const dist = worldPos.current.distanceTo(camera.position)
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

// ====== ZAGADKA 1: kod z notatek (napis na lewej ścianie) ======
function NoteCodePuzzle({
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
  const panelRef = useRef<THREE.Mesh>(null)
  const wp = useRef(new THREE.Vector3())

  const CODE = useMemo(() => [4, 1, 9] as const, [])
  const [input, setInput] = useState<number[]>([])
  const [panelNear, setPanelNear] = useState(false)

  const press = (n: number) => {
    if (solvedAlready) return
    setInput((prev) => (prev.length < CODE.length ? [...prev, n] : prev))
  }

  const backspace = () => {
    if (solvedAlready) return
    setInput((prev) => prev.slice(0, -1))
  }

  const clearAll = () => {
    if (solvedAlready) return
    setInput([])
  }

  const submit = () => {
    if (solvedAlready) return
    if (input.length !== CODE.length) return
    const ok = CODE.every((v, i) => v === input[i])
    if (ok) onSolved()
    setInput([])
  }

  useFrame(() => {
    if (solvedAlready) return
    if (!panelRef.current) return

    panelRef.current.getWorldPosition(wp.current)
    const dist = wp.current.distanceTo(camera.position)
    const near = dist <= 2.6
    if (near !== panelNear) setPanelNear(near)

    if (consumeE() && near) submit()
  })

  const panelX = ROOM.w / 2 - WALL_T / 2 - 0.08
  const panelPos: [number, number, number] = [panelX, 1.50, 0.3]
  const wallNotesPos: [number, number, number] = [-ROOM.w / 2 + WALL_T / 2 + 0.035, 1.65, 0.2]

  const inputText = input.length ? input.join(" ") : "— — —"

  const withinDistance = (e: any) => {
    const hit = typeof e?.distance === "number" ? e.distance : Infinity
    if (hit > 4.0) return false
    const w = new THREE.Vector3()
    e.object.getWorldPosition(w)
    if (w.distanceTo(camera.position) > 3.0) return false
    return true
  }

  return (
    <group>
      {/* NOTATKI NA LEWEJ ŚCIANIE */}
      <group position={wallNotesPos} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0.95, -0.25, -0.01]} userData={{ collider: false }}>
          <planeGeometry args={[2.1, 1.35]} />
          <meshStandardMaterial color={"#0f141b"} roughness={0.95} />
        </mesh>

        <Text
          position={[0, 0.45, 0.01]}
          fontSize={0.16}
          color={"#e6edf3"}
          anchorX="left"
          anchorY="top"
          maxWidth={2.0}
          lineHeight={1.25}
        >
{`Dzień 7: w ciszy słychać cztery uderzenia...
Dzień 12: ktoś szepcze jedno słowo...
Dzień 19: na ścianie zostało dziewięć znaków...`}
        </Text>
      </group>

      {/* PANEL NA PRAWEJ ŚCIANIE */}
      <group position={panelPos} rotation={[0, -Math.PI / 2, 0]}>
        <mesh ref={panelRef} castShadow userData={{ collider: true }}>
          <boxGeometry args={[1.1, 1.45, 0.14]} />
          <meshStandardMaterial color={solvedAlready ? "#123016" : "#151c26"} roughness={0.9} />
        </mesh>

        {/* ramka */}
        <mesh position={[0, 0, 0.08]} userData={{ collider: false }}>
          <boxGeometry args={[1.0, 1.35, 0.02]} />
          <meshStandardMaterial color={"#0f151c"} roughness={0.95} />
        </mesh>

        <Text position={[0, 0.62, 0.095]} fontSize={0.15} color={"#e6edf3"} anchorX="center" anchorY="middle">
          Panel kodu
        </Text>

        {/* wyświetlacz */}
        <mesh position={[0, 0.40, 0.095]} userData={{ collider: false }}>
          <boxGeometry args={[0.86, 0.18, 0.02]} />
          <meshStandardMaterial color={"#0f151c"} roughness={0.95} />
        </mesh>
        <Text position={[0, 0.40, 0.11]} fontSize={0.17} color={"#e6edf3"} anchorX="center" anchorY="middle">
          {inputText}
        </Text>

        {/* przyciski 0–9 */}
        <group position={[0, 0.05, 0.095]}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => {
            const col = i % 3
            const row = Math.floor(i / 3)
            const x = -0.36 + col * 0.36
            const y = 0.20 - row * 0.28
            return (
              <VRClickableMesh
                vr={vr}
                key={n}
                position={[x, y, 0]}
                castShadow
                userData={{ collider: true }}
                onPointerDown={(e) => {
                  e.stopPropagation?.()
                  if (!withinDistance(e)) return
                  press(n)
                }}
              >
                <boxGeometry args={[0.28, 0.22, 0.05]} />
                <meshStandardMaterial
                  color={solvedAlready ? "#15c915" : "#b0a7ff"}
                  emissive={solvedAlready ? "#15c915" : "#2a1f55"}
                  emissiveIntensity={solvedAlready ? 0.25 : 0.14}
                />
                <Text position={[0, 0, 0.035]} fontSize={0.14} color={"#0b0d10"} anchorX="center" anchorY="middle">
                  {n}
                </Text>
              </VRClickableMesh>
            )
          })}
        </group>

        {/* funkcje pomocnicze */}
        <group position={[0, -0.80, 0.095]}>
          <VRClickableMesh
            vr={vr}
            position={[-0.28, 0, 0]}
            castShadow
            userData={{ collider: true }}
            onPointerDown={(e) => {
              e.stopPropagation?.()
              if (!withinDistance(e)) return
              backspace()
            }}
          >
            <boxGeometry args={[0.40, 0.18, 0.05]} />
            <meshStandardMaterial color={"#2a2f38"} roughness={0.6} />
            <Text position={[0, 0, 0.035]} fontSize={0.12} color={"#e6edf3"} anchorX="center" anchorY="middle">
              ⌫
            </Text>
          </VRClickableMesh>

          <VRClickableMesh
            vr={vr}
            position={[0.28, 0, 0]}
            castShadow
            userData={{ collider: true }}
            onPointerDown={(e) => {
              e.stopPropagation?.()
              if (!withinDistance(e)) return
              clearAll()
            }}
          >
            <boxGeometry args={[0.40, 0.18, 0.05]} />
            <meshStandardMaterial color={"#2a2f38"} roughness={0.6} />
            <Text position={[0, 0, 0.035]} fontSize={0.12} color={"#e6edf3"} anchorX="center" anchorY="middle">
              C
            </Text>
          </VRClickableMesh>
        </group>

        {/* zatwierdź */}
        <VRClickableMesh
          vr={vr}
          position={[0, -1.05, 0.095]}
          castShadow
          userData={{ collider: true }}
          onPointerDown={(e) => {
            e.stopPropagation?.()
            if (!withinDistance(e)) return
            submit()
          }}
        >
          <boxGeometry args={[0.86, 0.20, 0.05]} />
          <meshStandardMaterial color={solvedAlready ? "#15c915" : "#2a2f38"} roughness={0.6} />
          <Text position={[0, 0, 0.035]} fontSize={0.13} color={"#e6edf3"} anchorX="center" anchorY="middle">
            Zatwierdź
          </Text>
        </VRClickableMesh>

        {panelNear && !solvedAlready && (
          <Billboard position={[0, 0.98, 0.05]}>
            <Text fontSize={0.14} color={"#ffffff"} anchorX="center" anchorY="middle">
              E – zatwierdź
            </Text>
          </Billboard>
        )}
      </group>
    </group>
  )
}

// ====== ZAGADKA 2: generator – kliknij w maksimum 3 razy (pudło = reset) ======
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
  const panelRef = useRef<THREE.Mesh>(null)
  const wp = useRef(new THREE.Vector3())

  const [pulse, setPulse] = useState(0) // 0..1
  const [hits, setHits] = useState(0)
  const [near, setNear] = useState(false)

  // parametry gry
  const PERIOD = 1.4 // sekundy na pełny cykl
  const THRESH = 0.92 // "okno" trafienia
  const RANGE = 2.4

  // pozycja panelu generatora (lewa strona pokoju, bliżej środka)
  const panelPos: [number, number, number] = [-ROOM.w / 2 + WALL_T / 2 + 0.18, 1.15, -2.2]
  const panelRot: [number, number, number] = [0, Math.PI / 2, 0]

  const attempt = () => {
    if (solvedAlready) return
    // trafienie tylko w maksimum
    if (pulse >= THRESH) {
      const next = hits + 1
      if (next >= 3) {
        onSolved()
      } else {
        setHits(next)
      }
    } else {
      setHits(0)
    }
  }

  useFrame(({ clock }) => {
    if (solvedAlready) return

    // puls 0..1
    const t = clock.getElapsedTime()
    const ph = (t % PERIOD) / PERIOD
    const s = Math.sin(ph * Math.PI * 2)
    const val = (s + 1) / 2
    setPulse(val)

    if (!panelRef.current) return
    panelRef.current.getWorldPosition(wp.current)
    const d = wp.current.distanceTo(camera.position)
    const n = d <= RANGE
    if (n !== near) setNear(n)

    if (n && consumeE()) attempt()
  })

  const glow = solvedAlready ? 1.0 : pulse

  return (
    <group>
      <group position={panelPos} rotation={panelRot}>
        {/* obudowa */}
        <mesh ref={panelRef} castShadow userData={{ collider: true }}>
          <boxGeometry args={[1.1, 1.1, 0.18]} />
          <meshStandardMaterial color={solvedAlready ? "#123016" : "#151c26"} roughness={0.85} />
        </mesh>

        <Text position={[0, 0.48, 0.10]} fontSize={0.14} color={"#e6edf3"} anchorX="center" anchorY="middle">
          Generator
        </Text>

        {/* lampka */}
        <mesh position={[0, 0.25, 0.10]} userData={{ collider: false }}>
  <circleGeometry args={[0.12, 28]} />
  <meshStandardMaterial
    color={pulse > THRESH ? "#ffffff" : "#a81e1e"}
    emissive={pulse > THRESH ? "#ffffff" : "#a81e1e"}
    emissiveIntensity={pulse > THRESH ? 2.2 : 0.6}
    transparent
    opacity={0.95}
  />
</mesh>


        {/* pasek timingu */}
<mesh position={[0, -0.05, 0.10]} userData={{ collider: false }}>
  <boxGeometry args={[0.9 * pulse, 0.05, 0.02]} />
  <meshStandardMaterial
    color={pulse > THRESH ? "#ffffff" : "#b03030"}
    emissive={pulse > THRESH ? "#ffffff" : "#b03030"}
    emissiveIntensity={pulse > THRESH ? 1.5 : 0.4}
  />
</mesh>

        <Text position={[0, 0.03, 0.10]} fontSize={0.13} color={"#9aa6b2"} anchorX="center" anchorY="middle">
          Trafienia: {solvedAlready ? "3/3" : `${hits}/3`}
        </Text>

        {/* przycisk */}
        <VRClickableMesh
          vr={vr}
          position={[0, -0.35, 0.10]}
          castShadow
          userData={{ collider: true }}
          onPointerDown={(e) => {
            e.stopPropagation?.()
            const hit = typeof (e as any)?.distance === "number" ? (e as any).distance : Infinity
            if (hit > 4.5) return
            const w = new THREE.Vector3()
            ;(e as any).object.getWorldPosition(w)
            if (w.distanceTo(camera.position) > 3.0) return
            attempt()
          }}
        >
          <boxGeometry args={[0.55, 0.22, 0.08]} />
          <meshStandardMaterial color={solvedAlready ? "#15c915" : "#b0a7ff"} roughness={0.5} />
          <Text position={[0, 0, 0.05]} fontSize={0.12} color={"#0b0d10"} anchorX="center" anchorY="middle">
            STOP
          </Text>
        </VRClickableMesh>

        {!solvedAlready && near && (
          <Billboard position={[0, 0.85, 0.05]}>
            <Text fontSize={0.14} color={"#ffffff"} anchorX="center" anchorY="middle">
              Klik lub E w maksimum (pudło = reset)
            </Text>
          </Billboard>
        )}
      </group>
    </group>
  )
}

// ====== ZAGADKA 3 (FINAŁ): 3 pokrętła – ustaw kod 4-1-9 i zatwierdź (pudło = reset) ======
function FinalDialPuzzle({
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
  const panelRef = useRef<THREE.Mesh>(null)
  const wp = useRef(new THREE.Vector3())
  const RANGE = 2.6

  const CODE = useMemo(() => [4, 1, 9] as const, [])
  const [vals, setVals] = useState<[number, number, number]>([1, 1, 1])
  const [near, setNear] = useState(false)

  // pozycja: prawa ściana, bliżej drzwi (żeby było "finałowo")
  const panelX = ROOM.w / 2 - WALL_T / 2 - 0.08
  const panelPos: [number, number, number] = [panelX, 1.25, -1.9]
  const panelRot: [number, number, number] = [0, -Math.PI / 2, 0]

  const withinDistance = (e: any) => {
    const hit = typeof e?.distance === "number" ? e.distance : Infinity
    if (hit > 4.5) return false
    const w = new THREE.Vector3()
    e.object.getWorldPosition(w)
    if (w.distanceTo(camera.position) > 3.2) return false
    return true
  }

  const inc = (i: 0 | 1 | 2) => {
    if (solvedAlready) return
    setVals((prev) => {
      const next = [...prev] as [number, number, number]
      next[i] = next[i] >= 9 ? 1 : next[i] + 1
      return next
    })
  }

  const reset = () => setVals([1, 1, 1])

  const submit = () => {
    if (solvedAlready) return
    const ok = CODE.every((v, i) => v === vals[i])
    if (ok) onSolved()
    else reset()
  }

  useFrame(() => {
    if (solvedAlready) return
    if (!panelRef.current) return
    panelRef.current.getWorldPosition(wp.current)
    const d = wp.current.distanceTo(camera.position)
    const n = d <= RANGE
    if (n !== near) setNear(n)
    if (n && consumeE()) submit()
  })

  return (
    <group>
      <group position={panelPos} rotation={panelRot}>
        <mesh ref={panelRef} castShadow userData={{ collider: true }}>
          <boxGeometry args={[1.35, 1.25, 0.16]} />
          <meshStandardMaterial color={solvedAlready ? "#123016" : "#151c26"} roughness={0.9} />
        </mesh>

        <Text position={[0, 0.48, 0.095]} fontSize={0.15} color={"#e6edf3"} anchorX="center" anchorY="middle">
          Zamek pieczęci
        </Text>

        {/* pokrętła */}
        <group position={[0, 0.10, 0.095]}>
          {([0, 1, 2] as const).map((i) => (
            <group key={i} position={[-0.42 + i * 0.42, 0, 0]}>
              <VRClickableMesh
                vr={vr}
                castShadow
                userData={{ collider: true }}
                onPointerDown={(e) => {
                  e.stopPropagation?.()
                  if (!withinDistance(e)) return
                  inc(i)
                }}
              >
                <cylinderGeometry args={[0.16, 0.16, 0.16, 24]} />
                <meshStandardMaterial
                  color={solvedAlready ? "#15c915" : "#2a2f38"}
                  emissive={solvedAlready ? "#15c915" : "#0b0d10"}
                  emissiveIntensity={solvedAlready ? 0.2 : 0.05}
                />
              </VRClickableMesh>

              <Text position={[0, 0, 0.12]} fontSize={0.22} color={"#e6edf3"} anchorX="center" anchorY="middle">
                {vals[i]}
              </Text>

              {!solvedAlready && (
                <Text position={[0, -0.22, 0.12]} fontSize={0.09} color={"#9aa6b2"} anchorX="center" anchorY="middle">
                  klik
                </Text>
              )}
            </group>
          ))}
        </group>

        {/* podpowiedź stanu */}
        <Text position={[0, -0.18, 0.095]} fontSize={0.12} color={"#9aa6b2"} anchorX="center" anchorY="middle">
          Aktualnie: {vals[0]}-{vals[1]}-{vals[2]}
        </Text>

        {/* zatwierdź */}
        <VRClickableMesh
          vr={vr}
          position={[0, -0.45, 0.095]}
          castShadow
          userData={{ collider: true }}
          onPointerDown={(e) => {
            e.stopPropagation?.()
            if (!withinDistance(e)) return
            submit()
          }}
        >
          <boxGeometry args={[0.95, 0.20, 0.06]} />
          <meshStandardMaterial
            color={solvedAlready ? "#15c915" : "#b03030"}
            emissive={solvedAlready ? "#15c915" : "#b03030"}
            emissiveIntensity={solvedAlready ? 0.25 : 0.15}
            roughness={0.55}
          />
          <Text position={[0, 0, 0.05]} fontSize={0.12} color={"#0b0d10"} anchorX="center" anchorY="middle">
            Zatwierdź
          </Text>
        </VRClickableMesh>

        {!solvedAlready && near && (
          <Billboard position={[0, 0.82, 0.05]}>
            <Text fontSize={0.14} color={"#ffffff"} anchorX="center" anchorY="middle">
              Ustaw 3 cyfry i kliknij Zatwierdź (E też działa). Błąd = reset.
            </Text>
          </Billboard>
        )}
      </group>
    </group>
  )
}


// ====== ZAGADKA 3 (FINAŁ): sekwencja dźwięków (bez plików – generowane tony) ======
// 3 przyciski A/B/C. Najpierw wysłuchaj sekwencji, potem kliknij w tej samej kolejności.
// Błąd = reset do początku. Sekwencja sama odtwarza się co 5s, gdy jesteś blisko i zagadka nie jest rozwiązana.

function SoundSequenceFinalPuzzle({
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

  const panelRef = useRef<THREE.Mesh>(null)
  const wp = useRef(new THREE.Vector3())

  // kolejność do kliknięcia: B → A → C (łatwo zmień)
  const SEQ = useMemo(() => [1, 0, 2] as const, [])
  const [step, setStep] = useState(0)
  const [near, setNear] = useState(false)
  const [playing, setPlaying] = useState(false)

  // tryb: zanim zaczniesz klikać, możesz odsłuchać (auto lub przyciskiem)
  const [mode, setMode] = useState<"idle" | "listening" | "input">("idle")

  const RANGE = 2.8
  const REPLAY_EVERY = 6.0 // sek (troszkę dłużej, żeby nie wchodziło w drogę)

  // proste generowanie dźwięków WebAudio (bez assetów)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastReplayRef = useRef<number>(-999)

  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current.state === "suspended") {
      try {
        await audioCtxRef.current.resume()
      } catch {
        // ok
      }
    }
    return audioCtxRef.current
  }

  const toneHz = (idx: number) => {
    if (idx === 0) return 220 // A
    if (idx === 1) return 440 // B
    return 660 // C
  }

  const playTone = async (idx: number, dur = 0.22) => {
    const ctx = await ensureAudio()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.value = toneHz(idx)

    const t0 = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  const playSequence = async () => {
    if (playing || solvedAlready) return

    // kluczowa zmiana: odsłuch NIE resetuje Ci postępu, jeśli jesteś w trakcie wpisywania (mode === "input")
    // odsłuch jest tylko w idle/listening
    if (mode === "input") return

    setPlaying(true)
    setMode("listening")
    await ensureAudio()

    for (const i of SEQ) {
      await playTone(i, 0.22)
      await new Promise((r) => setTimeout(r, 450))
    }

    setPlaying(false)
    setMode("input")
    setStep(0)
  }

  const press = async (idx: number) => {
    if (solvedAlready) return
    if (playing) return

    // jeśli jeszcze nie odsłuchałeś, to pierwszy klik przełącza na input, ale nie odpala odsłuchu (żeby trigger nie resetował)
    if (mode !== "input") {
      setMode("input")
      setStep(0)
    }

    await playTone(idx, 0.20)

    setStep((prev) => {
      const expected = SEQ[prev]
      if (idx === expected) {
        const next = prev + 1
        if (next >= SEQ.length) {
          onSolved()
          return prev
        }
        return next
      }
      // błąd = reset do początku
      return 0
    })
  }

  // pozycja finału
  const panelX = ROOM.w / 2 - WALL_T / 2 - 0.08
  const panelPos: [number, number, number] = [panelX, 1.25, -2.2]
  const panelRot: [number, number, number] = [0, -Math.PI / 2, 0]

  const withinDistance = (e: any) => {
    const hit = typeof e?.distance === "number" ? e.distance : Infinity
    if (hit > 5.0) return false
    const w = new THREE.Vector3()
    e.object.getWorldPosition(w)
    if (w.distanceTo(camera.position) > 3.4) return false
    return true
  }

  useFrame(({ clock }) => {
    if (!panelRef.current) return
    panelRef.current.getWorldPosition(wp.current)
    const d = wp.current.distanceTo(camera.position)
    const n = d <= RANGE
    if (n !== near) setNear(n)

    // auto odsłuch tylko zanim zaczniesz wpisywać (nie psuje inputu)
    if (!solvedAlready && n && !playing && mode !== "input") {
      const t = clock.getElapsedTime()
      if (t - lastReplayRef.current >= REPLAY_EVERY) {
        lastReplayRef.current = t
        playSequence()
      }
    }

    // E – odsłuch (TYLKO poza inputem)
    if (!solvedAlready && n && mode !== "input" && consumeE()) {
      lastReplayRef.current = clock.getElapsedTime()
      playSequence()
    }
  })

  const buttonColor = (i: number) => {
    if (solvedAlready) return "#15c915"
    return i === SEQ[step] && mode === "input" ? "#b0a7ff" : "#2a2f38"
  }

  const labels = ["A", "B", "C"] as const

  return (
    <group>
      <group position={panelPos} rotation={panelRot}>
        <mesh ref={panelRef} castShadow userData={{ collider: true }}>
          <boxGeometry args={[1.35, 1.15, 0.16]} />
          <meshStandardMaterial color={solvedAlready ? "#123016" : "#151c26"} roughness={0.9} />
        </mesh>

        <Text position={[0, 0.44, 0.095]} fontSize={0.15} color={"#e6edf3"} anchorX="center" anchorY="middle">
          Panel audio
        </Text>

        <Text position={[0, 0.24, 0.095]} fontSize={0.12} color={"#9aa6b2"} anchorX="center" anchorY="middle">
          Odsłuchaj → powtórz sekwencję
        </Text>

        <group position={[0, -0.10, 0.095]}>
          {[0, 1, 2].map((i) => (
            <VRClickableMesh
              vr={vr}
              key={i}
              position={[-0.48 + i * 0.48, 0, 0]}
              castShadow
              userData={{ collider: true }}
              onPointerDown={(e) => {
                e.stopPropagation?.()
                if (!withinDistance(e)) return
                press(i)
              }}
            >
              <boxGeometry args={[0.32, 0.26, 0.08]} />
              <meshStandardMaterial color={buttonColor(i)} emissive={"#000000"} emissiveIntensity={0.0} roughness={0.55} />
              <Text position={[0, 0, 0.055]} fontSize={0.14} color={"#e6edf3"} anchorX="center" anchorY="middle">
                {labels[i]}
              </Text>
            </VRClickableMesh>
          ))}
        </group>

        <Text
          position={[0, -0.36, 0.095]}
          fontSize={0.12}
          color={solvedAlready ? "#15c915" : "#9aa6b2"}
          anchorX="center"
          anchorY="middle"
        >
          {solvedAlready ? "OK" : mode === "input" ? `Postęp: ${step}/${SEQ.length}` : "Odsłuchaj sekwencję"}
        </Text>

        <VRClickableMesh
          vr={vr}
          position={[0, -0.55, 0.095]}
          castShadow
          userData={{ collider: true }}
          onPointerDown={(e) => {
            e.stopPropagation?.()
            if (!withinDistance(e)) return
            lastReplayRef.current = (performance.now?.() ?? 0) / 1000
            setMode("idle")
            playSequence()
          }}
        >
          <boxGeometry args={[0.95, 0.20, 0.06]} />
          <meshStandardMaterial
            color={solvedAlready ? "#15c915" : "#b03030"}
            emissive={solvedAlready ? "#15c915" : "#b03030"}
            emissiveIntensity={0.18}
            roughness={0.55}
          />
          <Text position={[0, 0, 0.05]} fontSize={0.12} color={"#0b0d10"} anchorX="center" anchorY="middle">
            Odsłuchaj (E)
          </Text>
        </VRClickableMesh>
      </group>
    </group>
  )
}


type Props = { consumeE: () => boolean; vr?: VRReg }

export default function Room3({ consumeE, vr }: Props) {
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
    <group name="RoomC" position={[0, 0, -ROOM.d * 2]}>
      <Ground />
      <WallsWithStaticOpening orientation="both" />
      <Ceiling />

      <NoteCodePuzzle solvedAlready={solved[0]} onSolved={() => handleSolved(0)} consumeE={consumeE} vr={vr} />

      {/* placeholdery na zagadki 2 i 3 */}
      <GeneratorTimingPuzzle solvedAlready={solved[1]} onSolved={() => handleSolved(1)} consumeE={consumeE} vr={vr} />
      <SoundSequenceFinalPuzzle solvedAlready={solved[2]} onSolved={() => handleSolved(2)} consumeE={consumeE} vr={vr} />

      {!doorOpen && (
        <group position={[0, doorH + 0.35, zAtWall + 0.06]}>
          <Text fontSize={0.26} color={"#e6edf3"} anchorX="center" anchorY="middle">
            {`${solvedCount}/3`}
          </Text>
        </group>
      )}

      <SlidingDoor open={doorOpen} />
    </group>
  )
}
