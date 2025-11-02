
import { useEffect, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { PointerLockControls } from "@react-three/drei"
import * as THREE from "three"

export default function DesktopControls() {
  const { camera, scene } = useThree()
  const vel = useRef(new THREE.Vector3())
  const dir = useRef(new THREE.Vector3())
  const keys = useRef<Record<string, boolean>>({})

  const HALF_W = 12 / 2
  const HALF_D = 12 / 2
  const ROOM_B_SHIFT = 12
  const R = 0.30
  const PLAYER_MAX_Y_MARGIN = 0.2

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true)
    const up   = (e: KeyboardEvent) => (keys.current[e.code] = false)
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up) }
  }, [])

  useFrame((_s, dt) => {
    const forward = (keys.current["KeyW"] ? 1 : 0) - (keys.current["KeyS"] ? 1 : 0)
    const strafe  = (keys.current["KeyD"] ? 1 : 0) - (keys.current["KeyA"] ? 1 : 0)
    const speed = (keys.current["ShiftLeft"] || keys.current["ShiftRight"]) ? 5 : 2.5

    dir.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
    dir.current.y = 0; dir.current.normalize()
    const right = new THREE.Vector3(-dir.current.z, 0, dir.current.x)

    vel.current.set(0, 0, 0)
    vel.current.addScaledVector(dir.current, forward * speed * dt)
    vel.current.addScaledVector(right,   strafe  * speed * dt)

    const next = camera.position.clone().add(vel.current)

    // RoomA + RoomB bounds
    const zMin = -HALF_D - ROOM_B_SHIFT + R
    const zMax =  HALF_D - R
    next.x = THREE.MathUtils.clamp(next.x, -HALF_W + R, HALF_W - R)
    next.z = THREE.MathUtils.clamp(next.z, zMin, zMax)

    // Player capsule height
    const pMinY = 0.0
    const pMaxY = camera.position.y + PLAYER_MAX_Y_MARGIN

    // Fresh collider traversal every frame (avoids stale refs when React remounts)
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3()

    scene.traverse((o) => {
      if (!(o as any).userData?.collider) return
      box.setFromObject(o)
      if (!isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z)) return

      const overlapY = (box.max.y > pMinY) && (box.min.y < pMaxY)
      if (!overlapY) return

      const insideX = next.x > box.min.x - R && next.x < box.max.x + R
      const insideZ = next.z > box.min.z - R && next.z < box.max.z + R
      if (insideX && insideZ) {
        const penLeft   = next.x - (box.min.x - R)
        const penRight  = (box.max.x + R) - next.x
        const penTop    = next.z - (box.min.z - R)
        const penBottom = (box.max.z + R) - next.z
        const minXPen = Math.min(penLeft, penRight)
        const minZPen = Math.min(penTop, penBottom)
        if (minXPen < minZPen) {
          next.x = (penLeft < penRight) ? (box.min.x - R) : (box.max.x + R)
        } else {
          next.z = (penTop < penBottom) ? (box.min.z - R) : (box.max.z + R)
        }
      }
    })

    camera.position.copy(next)
  })

  return <PointerLockControls />
}
