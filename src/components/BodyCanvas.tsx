import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three/addons/controls/OrbitControls.js";

import type { BodyProfile, ViewMode } from "../types/body";
import { ModelAdapter } from "./ModelAdapter";

const CAMERA_VIEWS: Record<Exclude<ViewMode, "free">, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
};

function CameraController({ heightCm, viewMode, onViewModeChange }: { heightCm: number; viewMode: ViewMode; onViewModeChange: (view: ViewMode) => void }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControlsImpl | null>(null);
  // Models are grounded at y=0. Target the height midpoint so the camera
  // keeps a small, consistent margin above the head and below the feet.
  const modelHeight = Math.max(1.4, heightCm / 100);
  const target = useMemo(() => new THREE.Vector3(0, modelHeight * 0.5, 0), [modelHeight]);
  const position = useMemo(() => new THREE.Vector3(), []);
  const distance = 3.1 * (modelHeight / 1.75);

  useEffect(() => {
    const orbit = new OrbitControlsImpl(camera, gl.domElement);
    orbit.enablePan = false;
    orbit.minDistance = 2;
    orbit.maxDistance = 5;
    orbit.target.copy(target);
    orbit.addEventListener("start", () => onViewModeChange("free"));
    controls.current = orbit;

    return () => orbit.dispose();
  }, [camera, gl, onViewModeChange, target]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (viewMode === "free") return;
    const view = CAMERA_VIEWS[viewMode];
    position.set(view[0] * distance, target.y + 0.08, view[2] * distance);
    camera.position.lerp(position, 1 - Math.exp(-7 * delta));
    orbit.target.lerp(target, 1 - Math.exp(-7 * delta));
    orbit.update();
  });

  return null;
}

export function BodyCanvas({
  profile,
  showFatLayer,
  viewMode,
  onViewModeChange,
  onCanvasReady,
}: {
  profile: BodyProfile;
  showFatLayer: boolean;
  viewMode: ViewMode;
  onViewModeChange: (view: ViewMode) => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.95, 3.1], fov: 34 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => onCanvasReady(gl.domElement)}
    >
      <color attach="background" args={["#efeee9"]} />
      <ambientLight intensity={1.25} />
      <hemisphereLight args={["#fff8ed", "#9aa5b1", 1.1]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -2]} intensity={0.65} />
      <ModelAdapter profile={profile} showFatLayer={showFatLayer} />
      <mesh position={[0, -0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 64]} />
        <shadowMaterial transparent opacity={0.22} />
      </mesh>
      <CameraController heightCm={profile.heightCm} viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </Canvas>
  );
}
