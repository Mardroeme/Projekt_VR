import * as THREE from "three"
import { useMemo, useRef, useState, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Text, Billboard } from "@react-three/drei"

// ===== Wspólne parametry pokoju =====
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
          {`INSTRUKCJA:\nAktywuj 3 zagadki.\nDrzwi na północy otworzą się po 3/3.`}
        </Text>
      </group>
    </group>
  )
}

// ====== Puzzle cube (range=1.0, dystans w WORLD) ======
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
  const [inRange, setInRange] = useState(false)
  const worldPos = useRef(new THREE.Vector3())

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

// ====== PANEL NUMERYCZNY – klik tylko, max 3 aktywne, twarde sprawdzenie dystansu ======
function KeyButton({
  label, onToggle, isOn, localPos
}: {
  label: string
  onToggle: () => void
  isOn: boolean
  localPos: [number, number, number]
}) {
  const { camera } = useThree()
  const ref = useRef<THREE.Mesh>(null)

  const press = (e: any) => {
    e.stopPropagation?.()
    if (!ref.current) return
    const world = new THREE.Vector3()
    ref.current.getWorldPosition(world)
    const distWorld = world.distanceTo(camera.position)
    const distRay = typeof e?.distance === "number" ? e.distance : Infinity
    if (distWorld > 1.0 || distRay > 1.1) return
    onToggle()
  }

  const zOffset = isOn ? -0.05 : 0

  return (
    <group position={localPos}>
      <mesh
        ref={ref}
        position={[0, 0, zOffset]}
        castShadow
        userData={{ collider: true }}
        onPointerDown={press}
      >
        <boxGeometry args={[0.3, 0.3, 0.1]} />
        <meshStandardMaterial color={isOn ? "#15c915" : "#444"} />
        <Text position={[0, 0, 0.06]} fontSize={0.15} color={"#fff"} anchorX="center" anchorY="middle">
          {label}
        </Text>
      </mesh>
    </group>
  )
}

function KeypadPuzzle({
  solvedAlready, onSolved
}: {
  solvedAlready: boolean
  onSolved: () => void
}) {
  const [onSet, setOnSet] = useState<Set<string>>(new Set())
  const goal = new Set(["7","8","9"])

  useEffect(() => {
    if (solvedAlready) return
    let ok = true
    goal.forEach(g => { if (!onSet.has(g)) ok = false })
    if (ok) onSolved()
  }, [onSet, solvedAlready])

  const toggle = (n: string) => {
    setOnSet(prev => {
      const next = new Set(prev)
      if (next.has(n)) { next.delete(n) } else { if (next.size >= 3) return prev; next.add(n) }
      return next
    })
  }

  const buttons = ["1","2","3","4","5","6","7","8","9","0"]
  const positions: [number, number, number][] = buttons.map((_, i) => {
    const row = Math.floor(i / 5)
    const col = i % 5
    return [col * 0.35 - 0.7, row * -0.35, 0]
  })

  return (
    <group position={[ROOM.w / 2 - 0.21, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <Text position={[0, 0.9, 0.01]} fontSize={0.2} color={"#e6edf3"} anchorX="center" anchorY="middle">
        Dlaczego 6 bało się 7?
      </Text>
      {buttons.map((b, i) => (
        <KeyButton
          key={b}
          label={b}
          isOn={onSet.has(b)}
          onToggle={() => toggle(b)}
          localPos={positions[i]}
        />
      ))}
    </group>
  )
}

// ====== ZAGADKA: Sekwencja świateł (Simon) — górne pokazują, dolne klikane ======
function LightDisc({
  color, active, onPress, localPos, distanceLimit = 1.2, interactive = true
}: {
  color: string
  active: boolean
  onPress?: () => void
  localPos: [number, number, number]
  distanceLimit?: number
  interactive?: boolean
}) {
  const { camera } = useThree()
  const ref = useRef<THREE.Mesh>(null)

  const press = (e: any) => {
    if (!interactive) return
    e.stopPropagation?.()
    if (!ref.current) return
    const wp = new THREE.Vector3()
    ref.current.getWorldPosition(wp)
    const distWorld = wp.distanceTo(camera.position)
    const distRay = typeof e?.distance === "number" ? e.distance : Infinity
    if (distWorld > distanceLimit || distRay > distanceLimit + 0.1) return
    onPress && onPress()
  }

  return (
    <mesh
      ref={ref}
      position={localPos}
      rotation={[Math.PI / 2, 0, 0]}
      castShadow
      onPointerDown={interactive ? press : undefined}
      userData={{ collider: true }}
    >
      <cylinderGeometry args={[0.18, 0.18, 0.06, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={active ? 1.6 : 0.05}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  )
}

function LightSequencePuzzle({
  solvedAlready, onSolved
}: {
  solvedAlready: boolean
  onSolved: () => void
}) {
  const COLORS = ["#ff3b3b", "#26d07c", "#3da3ff", "#ffd93b"] // czerwony, zielony, niebieski, żółty
  const [sequence, setSequence] = useState<number[]>([])
  const [showing, setShowing] = useState(false)
  const [activeTop, setActiveTop] = useState<number | null>(null)
  const [activeBottom, setActiveBottom] = useState<number | null>(null)
  const [inputIdx, setInputIdx] = useState(0)
  const [ready, setReady] = useState(false)

  // start sekwencji
  useEffect(() => {
    if (solvedAlready) return
    const seq = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4))
    setSequence(seq)
    const t = setTimeout(() => play(seq, 0), 500)
    return () => clearTimeout(t)
  }, [])

  const play = (seq: number[], i: number) => {
    setShowing(true)
    if (i >= seq.length) {
      setActiveTop(null)
      setShowing(false)
      setReady(true)
      setInputIdx(0)
      return
    }
    setActiveTop(seq[i])
    setTimeout(() => {
      setActiveTop(null)
      setTimeout(() => play(seq, i + 1), 300)
    }, 600)
  }

  const pressBottom = (idx: number) => {
    if (solvedAlready || showing || !ready) return
    const expected = sequence[inputIdx]

    // zapal dolny krążek
    setActiveBottom(idx)

    if (idx === expected) {
      const next = inputIdx + 1
      if (next >= sequence.length) {
        // Ostatni poprawny wybór: zostaw podświetlenie na moment, potem zalicz
        setReady(false)
        setTimeout(() => {
          setActiveBottom(null)
          onSolved()
        }, 250)
      } else {
        // Środek sekwencji: krótki flash i dalej
        setTimeout(() => setActiveBottom(null), 150)
        setInputIdx(next)
      }
    } else {
      // Błąd — krótka pauza i powtórka sekwencji, zgaś dolny
      setTimeout(() => setActiveBottom(null), 150)
      setReady(false)
      setInputIdx(0)
      setTimeout(() => play(sequence, 0), 400)
    }
  }

  // pozycje względem południowej ściany
  const wallInnerZ = ROOM.d / 2 - WALL_T / 2
  const zCenter = -0.04
  const topY = 0.2
  const bottomY = -0.25

  const baseX = [-0.6, -0.2, 0.2, 0.6]

  return (
    <group position={[0, 1.5, wallInnerZ]}>
      <Text position={[0, 0.55, 0.01]} fontSize={0.18} color={"#e6edf3"} anchorX="center" anchorY="middle">
        Odtwórz sekwencję
      </Text>

      {/* GÓRNE – tylko wizualizacja */}
      {baseX.map((x, i) => (
        <LightDisc
          key={"top-" + i}
          color={COLORS[i]}
          active={activeTop === i}
          localPos={[x, topY, zCenter]}
          interactive={false}
        />
      ))}

      {/* DOLNE – szare, klikalne */}
      {baseX.map((x, i) => (
        <LightDisc
          key={"bottom-" + i}
          color={activeBottom === i ? "#cfcfcf" : "#8a8a8a"}
          active={activeBottom === i}
          localPos={[x, bottomY, zCenter]}
          interactive={true}
          onPress={() => pressBottom(i)}
        />
      ))}
    </group>
  )
}

// ====== Drzwi przesuwne (północ) ======
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

// ====== GŁÓWNY KOMPONENT POKOJU ======
export default function Room1({
  solved, onSolved, consumeE
}: {
  solved: [boolean, boolean, boolean]
  onSolved: (idx: number) => void
  consumeE: () => boolean
}) {
  // MAPPING: [0]=kostka, [1]=panel numeryczny, [2]=sekwencja świateł (góra pokazuje, dół klikasz)
  const solvedCount = (solved[0] ? 1 : 0) + (solved[1] ? 1 : 0) + (solved[2] ? 1 : 0)
  const doorOpen = solvedCount === 3
  const zAtWall = -ROOM.d / 2 + WALL_T / 2
  const doorH = 2.3

  return (
    <group name="RoomA" position={[0, 0, 0]}>
      <Ground />
      <WallsWithStaticOpening orientation="north" />
      <Ceiling />
      <InstructionPoster />

      {/* 1 kostka */}
      <Table position={[-2.2, 0.8, -0.5]} />
      <PuzzleCube index={0} position={[0, 0.8, 1]} solved={solved[0]} onSolved={onSolved} consumeE={consumeE} />

      {/* Panel numeryczny */}
      <KeypadPuzzle solvedAlready={solved[1]} onSolved={() => onSolved(1)} />

      {/* Sekwencja świateł: góra (display only) + dół (input) */}
      <LightSequencePuzzle solvedAlready={solved[2]} onSolved={() => onSolved(2)} />

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
