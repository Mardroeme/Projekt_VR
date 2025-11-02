import { useEffect, useMemo, useState } from "react"
import { useGame } from "../gameStore"

const fmt = (ms:number) => {
  const s = Math.floor(ms/1000)
  const m = Math.floor(s/60)
  const sec = s%60
  return `${m} min ${sec.toString().padStart(2,"0")} s`
}

export default function FinishModal() {
  const { startedAt, finishedAt, puzzlesSolved, puzzlesTotal, reset, start } = useGame()
  const [open, setOpen] = useState(false)
  const duration = useMemo(() => (startedAt && finishedAt) ? finishedAt - startedAt : 0, [startedAt, finishedAt])

  useEffect(() => { if (finishedAt) setOpen(true) }, [finishedAt])
  if (!open) return null

  return (
    <div className="modal">
      <div className="card">
        <h3>Gratulacje!</h3>
        <p>Czas: <b>{fmt(duration)}</b></p>
        <p>Zagadki: {puzzlesSolved}/{puzzlesTotal}</p>
        <div className="row">
          <button onClick={()=>{ setOpen(false); reset(); start(); }}>Zagraj ponownie</button>
          <button className="secondary" onClick={()=>setOpen(false)}>Zamknij</button>
        </div>
      </div>
    </div>
  )
}
