import * as THREE from "three"
import { useMemo, useRef, useState, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Text, Billboard } from "@react-three/drei"

// lokalny typ (bez importu z XRScene, żeby nie robić cyklicznych zależności)
type VRReg = {
  register: (obj: THREE.Object3D, onSelect: (hit: THREE.Intersection) => void) => () => void
}

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
  const x = -ROOM.w / 2 + 0.18
  return (
    <group position={[x, 1.35, -1.5]}>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow userData={{ collider: false }}>
        <planeGeometry args={[1.8, 1.1]} />
        <meshStandardMaterial color={"#15181d"} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <group rotation={[0, Math.PI / 2, 0]} position={[0.002, 0, 0.001]}>
        <Text fontSize={0.12} maxWidth={1.6} lineHeight={1.2} color={"#e6edf3"} anchorX="center" anchorY="middle">
          {`INSTRUKCJA:\nAktywuj 3 zagadki.\nDrzwi na północy otworzą się po 3/3. Przerwa na kremówkę.`}
        </Text>
      </group>
    </group>
  )
}

// ====== ZAGADKA 1: token do przeniesienia między stolikami ======
function TokenPuzzle({
  solvedAlready,
  onSolved,
  consumeE,
}: {
  solvedAlready: boolean
  onSolved: () => void
  consumeE: () => boolean
}) {
  const { camera } = useThree()
  const tokenRef = useRef<THREE.Mesh>(null)
  const [carried, setCarried] = useState(false)
  const [placed, setPlaced] = useState(solvedAlready)

  const sourcePos = useRef(new THREE.Vector3(-2.2, 0.95, -0.5))
  const targetPos = useRef(new THREE.Vector3(2.2, 0.95, -0.5))
  const tmpForward = useRef(new THREE.Vector3())
  const tmpPos = useRef(new THREE.Vector3())

  useEffect(() => {
    if (solvedAlready) setPlaced(true)
  }, [solvedAlready])

  useFrame(() => {
    const token = tokenRef.current
    if (!token) return

    if (carried) {
      tmpForward.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
      tmpForward.current.y = 0
      tmpForward.current.normalize()
      tmpPos.current.copy(camera.position)
      tmpPos.current.addScaledVector(tmpForward.current, 0.9)
      tmpPos.current.y -= 0.15
      token.position.copy(tmpPos.current)
    } else {
      token.position.copy(placed ? targetPos.current : sourcePos.current)
    }

    if (placed || solvedAlready) return

    if (consumeE()) {
      const camPos = camera.position
      const distSource = camPos.distanceTo(sourcePos.current)
      const distTarget = camPos.distanceTo(targetPos.current)

      if (!carried && distSource <= 1.1) {
        setCarried(true)
        return
      }
      if (carried && distTarget <= 1.1) {
        setCarried(false)
        setPlaced(true)
        onSolved()
        return
      }
    }
  })

  return (
    <group>
      {/* dwa stoliki */}
      <Table position={[-2.2, 0.8, -0.5]} />
      <Table position={[2.2, 0.8, -0.5]} />

      {/* gniazdo na token */}
      <mesh
        position={[targetPos.current.x, targetPos.current.y + 0.01, targetPos.current.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        userData={{ collider: false }}
      >
        <ringGeometry args={[0.18, 0.34, 32]} />
        <meshStandardMaterial
          color={placed ? "#2fe22f" : "#888888"}
          emissive={placed ? "#2fe22f" : "#000000"}
          emissiveIntensity={placed ? 0.7 : 0}
          roughness={0.4}
        />
      </mesh>

      {/* sam token */}
      <mesh ref={tokenRef} castShadow userData={{ collider: true }}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 24]} />
        <meshStandardMaterial color={placed ? "#15c915" : "#ffcc33"} metalness={0.35} roughness={0.4} />
      </mesh>

      {/* podpowiedź */}
      {!placed && (
        <Billboard position={[-2.2, 1.5, -0.5]}>
          <Text fontSize={0.16} color={"#ffffff"} anchorX="center" anchorY="middle">
            {`Weź token (E)\ni zanieś na drugi stół`}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

// ====== PANEL NUMERYCZNY – klik tylko, max 3 aktywne, twarde sprawdzenie dystansu ======
function KeyButton({
  label,
  onToggle,
  isOn,
  localPos,
  vr,
}: {
  label: string
  onToggle: () => void
  isOn: boolean
  localPos: [number, number, number]
  vr?: VRReg
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

  // VR: trigger/select ma działać jak klik
  useEffect(() => {
    if (!vr || !ref.current) return
    return vr.register(ref.current, (hit) => {
      press({ stopPropagation: () => {}, distance: hit.distance, object: hit.object })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vr, isOn])

  return (
    <group position={localPos}>
      <mesh ref={ref} position={[0, 0, zOffset]} castShadow userData={{ collider: true }} onPointerDown={press}>
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
  solvedAlready,
  onSolved,
  vr,
}: {
  solvedAlready: boolean
  onSolved: () => void
  vr?: VRReg
}) {
  const [onSet, setOnSet] = useState<Set<string>>(new Set())
  const goal = new Set(["7", "8", "9"])

  useEffect(() => {
    if (solvedAlready) return
    let ok = true
    goal.forEach((g) => {
      if (!onSet.has(g)) ok = false
    })
    if (ok) onSolved()
  }, [onSet, solvedAlready])

  const toggle = (n: string) => {
    setOnSet((prev) => {
      const next = new Set(prev)
      if (next.has(n)) {
        next.delete(n)
      } else {
        if (next.size >= 3) return prev
        next.add(n)
      }
      return next
    })
  }

  const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
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
        <KeyButton key={b} label={b} isOn={onSet.has(b)} onToggle={() => toggle(b)} localPos={positions[i]} vr={vr} />
      ))}
    </group>
  )
}

// ====== ZAGADKA: Sekwencja świateł (Simon) — górne pokazują, dolne klikane ======
function LightDisc({
  color,
  active,
  onPress,
  localPos,
  distanceLimit = 1.2,
  interactive = true,
  vr,
}: {
  color: string
  active: boolean
  onPress?: () => void
  localPos: [number, number, number]
  distanceLimit?: number
  interactive?: boolean
  vr?: VRReg
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

  // VR: trigger/select ma działać jak klik
  useEffect(() => {
    if (!vr || !interactive || !ref.current) return
    return vr.register(ref.current, (hit) => {
      press({ stopPropagation: () => {}, distance: hit.distance, object: hit.object })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vr, interactive, active])

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
  solvedAlready,
  onSolved,
  vr,
}: {
  solvedAlready: boolean
  onSolved: () => void
  vr?: VRReg
}) {
  const COLORS = ["#ff3b3b", "#26d07c", "#3da3ff", "#ffd93b"]
  const [sequence, setSequence] = useState<number[]>([])
  const [showing, setShowing] = useState(false)
  const [activeTop, setActiveTop] = useState<number | null>(null)
  const [activeBottom, setActiveBottom] = useState<number | null>(null)
  const [inputIdx, setInputIdx] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (solvedAlready) return
    const seq = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4))
    setSequence(seq)
    const t = setTimeout(() => play(seq, 0), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solvedAlready])

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

  // Automatyczne odtwarzanie sekwencji co 5 sekund, dopóki zagadka nie jest rozwiązana
  useEffect(() => {
    if (solvedAlready || sequence.length === 0) return
    if (!ready || showing) return
    const currentSeq = [...sequence]
    const id = window.setTimeout(() => {
      if (!solvedAlready) {
        setReady(false)
        setInputIdx(0)
        play(currentSeq, 0)
      }
    }, 5000)
    return () => window.clearTimeout(id)
  }, [sequence, ready, showing, solvedAlready])

  const pressBottom = (idx: number) => {
    if (solvedAlready || showing || !ready) return
    const expected = sequence[inputIdx]

    setActiveBottom(idx)

    if (idx === expected) {
      const next = inputIdx + 1
      if (next >= sequence.length) {
        setReady(false)
        setTimeout(() => {
          setActiveBottom(null)
          onSolved()
        }, 250)
      } else {
        setTimeout(() => setActiveBottom(null), 150)
        setInputIdx(next)
      }
    } else {
      setTimeout(() => setActiveBottom(null), 150)
      setReady(false)
      setInputIdx(0)
      setTimeout(() => play(sequence, 0), 400)
    }
  }

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

      {baseX.map((x, i) => (
        <LightDisc
          key={"top-" + i}
          color={COLORS[i]}
          active={activeTop === i}
          localPos={[x, topY, zCenter]}
          interactive={false}
        />
      ))}

      {baseX.map((x, i) => (
        <LightDisc
          key={"bottom-" + i}
          color={activeBottom === i ? "#cfcfcf" : "#8a8a8a"}
          active={activeBottom === i}
          localPos={[x, bottomY, zCenter]}
          interactive={true}
          onPress={() => pressBottom(i)}
          vr={vr}
        />
      ))}
    </group>
  )
}

// VR rejestracja dla LightDisc (dla interaktywnych)
// (na końcu pliku, bo używa `press` z komponentu)
// eslint-disable-next-line react-hooks/rules-of-hooks
function useVRRegisterIfInteractive(vr: VRReg | undefined, ref: React.RefObject<THREE.Object3D>, interactive: boolean, handler: (e: any) => void) {
  useEffect(() => {
    if (!vr || !interactive || !ref.current) return
    return vr.register(ref.current, (hit) => {
      handler({ stopPropagation: () => {}, distance: hit.distance, object: hit.object })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vr, interactive])
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
  solved,
  onSolved,
  consumeE,
  vr,
}: {
  solved: [boolean, boolean, boolean]
  onSolved: (idx: number) => void
  consumeE: () => boolean
  vr?: VRReg
}) {
  // MAPPING: [0]=token, [1]=panel numeryczny, [2]=sekwencja świateł
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

      {/* 1. ZAGADKA: przeniesienie tokenu */}
      <TokenPuzzle solvedAlready={solved[0]} onSolved={() => onSolved(0)} consumeE={consumeE} />

      {/* 2. Panel numeryczny */}
      <KeypadPuzzle solvedAlready={solved[1]} onSolved={() => onSolved(1)} vr={vr} />

      {/* 3. Sekwencja świateł: góra (display only) + dół (input) */}
      <LightSequencePuzzle solvedAlready={solved[2]} onSolved={() => onSolved(2)} vr={vr} />

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
