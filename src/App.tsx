import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import XRScene from "./XRScene";

export default function App() {
  useEffect(() => {
    const old = document.getElementById("vr-button");
    if (old) old.remove();
  }, []);

  return (
    <>
      <div className="crosshair" />
      <Canvas
        style={{ width: "100vw", height: "100vh" }}
        camera={{ position: [0, 1.6, 3], fov: 60 }}
        onCreated={({ gl }) => {
          gl.xr.enabled = true;
          const btn = VRButton.createButton(gl);
          btn.id = "vr-button";
          document.body.appendChild(btn);
        }}
      >
        <XRScene />
      </Canvas>
    </>
  );
}
