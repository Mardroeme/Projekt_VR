import { useEffect, useState } from "react"
import { useGame } from "../gameStore"

export default function TimerHUD() {
  const { startedAt, finishedAt } = useGame()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  if (!startedAt) return null
  const end = finishedAt ?? now
  const ms = end - startedAt
  const mm = Math.floor(ms / 60000)
  const ss = Math.floor((ms % 60000) / 1000)

  return <div className="hud">⏱ {mm}:{ss.toString().padStart(2,"0")}</div>
}
