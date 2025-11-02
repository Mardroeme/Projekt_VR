import { useEffect, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { PointerLockControls } from "@react-three/drei"
import * as THREE from "three"

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number }

export default function DesktopControls() {
  const { camera, scene } = useThree()
  const vel = useRef(new THREE.Vector3())
  const dir = useRef(new THREE.Vector3())
  const keys = useRef<Record<string, boolean>>({})

  // rozmiar pokoju (z XRScene: ROOM { w:12, d:12 })
  const HALF_W = 12 / 2
  const HALF_D = 12 / 2
  const R = 0.30 // "promień gracza" – odsuwa od ścian i mebli

  // prostokątne kolidery 2D (XZ) wyliczone z Box3 obiektów oznaczonych userData.collider
  const rects = useRef<Rect[]>([])

  const rebuildRects = () => {
    const out: Rect[] = []
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      if ((o as any).userData?.collider) {
        const box = new THREE.Box3().setFromObject(o)
        out.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z })
      }
    })
    rects.current = out
  }

  useEffect(() => {
    rebuildRects()
    const id = setTimeout(rebuildRects, 50) // na wszelki wypadek po pierwszym renderze
    return () => clearTimeout(id)
  }, [scene])

  // klawiatura
  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true)
    const up   = (e: KeyboardEvent) => (keys.current[e.code] = false)
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up) }
  }, [])

  useFrame((_s, dt) => {
    // ruch WASD
    const forward = (keys.current["KeyW"] ? 1 : 0) - (keys.current["KeyS"] ? 1 : 0)
    const strafe  = (keys.current["KeyD"] ? 1 : 0) - (keys.current["KeyA"] ? 1 : 0)
    const speed = (keys.current["ShiftLeft"] || keys.current["ShiftRight"]) ? 5 : 2.5

    dir.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
    dir.current.y = 0; dir.current.normalize()
    const right = new THREE.Vector3(-dir.current.z, 0, dir.current.x)

    vel.current.set(0, 0, 0)
    vel.current.addScaledVector(dir.current, forward * speed * dt)
    vel.current.addScaledVector(right,   strafe  * speed * dt)

    // kandydat nowej pozycji
    const next = camera.position.clone().add(vel.current)

    // 1) ściany pokoju (margines = R)
    next.x = THREE.MathUtils.clamp(next.x, -HALF_W + R, HALF_W - R)
    next.z = THREE.MathUtils.clamp(next.z, -HALF_D + R, HALF_D - R)

    // 2) kolizje z prostokątami mebli/drzwi w XZ
    for (const a of rects.current) {
      // czy gracz wchodzi w prostokąt rozszerzony o promień?
      const insideX = next.x > a.minX - R && next.x < a.maxX + R
      const insideZ = next.z > a.minZ - R && next.z < a.maxZ + R
      if (insideX && insideZ) {
        // policz penetracje po obu osiach i odsuń po mniejszej
        const penLeft   = next.x - (a.minX - R)
        const penRight  = (a.maxX + R) - next.x
        const penTop    = next.z - (a.minZ - R)
        const penBottom = (a.maxZ + R) - next.z

        const minXPen = Math.min(penLeft, penRight)
        const minZPen = Math.min(penTop, penBottom)

        if (minXPen < minZPen) {
          // odsuń w X
          if (penLeft < penRight) next.x = a.minX - R
          else next.x = a.maxX + R
        } else {
          // odsuń w Z
          if (penTop < penBottom) next.z = a.minZ - R
          else next.z = a.maxZ + R
        }
      }
    }

    camera.position.copy(next)
  })

  return <PointerLockControls />
}
