import { Canvas } from "@react-three/fiber"
import { XR, VRButton, createXRStore } from "@react-three/xr"
import XRScene from './XRScene'
import DesktopControls from "./controls/DesktopControls"
import TimerHUD from "./ui/TimerHUD"
import FinishModal from "./ui/FinishModal"
import "./styles.css"
import Crosshair from "./ui/Crosshair"

const store = createXRStore()

export default function App() {
  return (
    <div className="canvas-wrap">
      <VRButton store={store} />
      <Canvas shadows camera={{ position: [0, 1.6, 3], fov: 70 }}>
  <DesktopControls />
  <XR store={store}>
    <XRScene />
  </XR>
</Canvas>
      <TimerHUD />
      <FinishModal />
      <Crosshair />
<div className="hint">
  PC: kliknij w scenę (pointer lock). WASD = ruch, Shift = sprint.
</div>

    </div>
  )
}
