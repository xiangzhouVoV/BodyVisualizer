import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three/addons/controls/OrbitControls.js";

import type { BodyProfile, ModelSurface, ViewMode } from "../types/body";
import { ModelAdapter } from "./ModelAdapter";

const CAMERA_VIEWS: Record<Exclude<ViewMode, "free">, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
};

function CameraController({ heightCm, viewMode, onViewModeChange, comparing = false }: { heightCm: number; viewMode: ViewMode; onViewModeChange: (view: ViewMode) => void; comparing?: boolean }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControlsImpl | null>(null);
  // Models are grounded at y=0. Target the height midpoint so the camera
  // keeps a small, consistent margin above the head and below the feet.
  const modelHeight = Math.max(1.4, heightCm / 100);
  const target = useMemo(() => new THREE.Vector3(0, modelHeight * 0.5, 0), [modelHeight]);
  const position = useMemo(() => new THREE.Vector3(), []);
  // Widen the camera just enough to keep both silhouettes legible when the
  // comparison mode places Current and Target side by side.
  const distance = (comparing ? 4.2 : 3.1) * (modelHeight / 1.75);

  useEffect(() => {
    const orbit = new OrbitControlsImpl(camera, gl.domElement);
    orbit.enablePan = false;
    orbit.minDistance = 2;
    orbit.maxDistance = 5;
    orbit.target.copy(target);
    orbit.addEventListener("start", () => onViewModeChange("free"));
    controls.current = orbit;

    return () => orbit.dispose();
  }, [camera, gl, onViewModeChange]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (viewMode !== "free") {
      const view = CAMERA_VIEWS[viewMode];
      position.set(view[0] * distance, target.y + 0.08, view[2] * distance);
      camera.position.lerp(position, 1 - Math.exp(-7 * delta));
    }
    // Keep the current free orbit stable while the body parameters change.
    // Reinitializing OrbitControls here would reset the look-at point and can
    // leave only the feet centered in the canvas.
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
  onLoadingChange,
  onLoadingProgress,
  backgroundColor = "#efeee9",
  bodyColor,
  showGround = true,
  comparisonProfile,
  modelSurface = "simulator",
}: {
  profile: BodyProfile;
  showFatLayer: boolean;
  viewMode: ViewMode;
  onViewModeChange: (view: ViewMode) => void;
  onLoadingChange?: (loading: boolean) => void;
  onLoadingProgress?: (progress: number) => void;
  backgroundColor?: THREE.ColorRepresentation;
  bodyColor?: THREE.ColorRepresentation;
  showGround?: boolean;
  /** Renders a second, synchronized silhouette beside the primary profile. */
  comparisonProfile?: BodyProfile;
  /** Keeps Simulator and Calculator model instances and deformation modes isolated. */
  modelSurface?: ModelSurface;
}) {
  const comparing = Boolean(comparisonProfile);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.95, 3.1], fov: 34 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={1.25} />
      <hemisphereLight args={["#fff8ed", "#9aa5b1", 1.1]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -2]} intensity={0.65} />
      {comparing ? (
        <>
          <group position={[-0.62, 0, 0]}>
            <ModelAdapter profile={profile} modelSurface={modelSurface} showFatLayer={showFatLayer} bodyColor={bodyColor} onLoadingChange={onLoadingChange} onLoadingProgress={onLoadingProgress} />
          </group>
          <group position={[0.62, 0, 0]}>
            <ModelAdapter profile={comparisonProfile!} modelSurface={modelSurface} showFatLayer={showFatLayer} bodyColor={bodyColor} />
          </group>
        </>
      ) : (
        <ModelAdapter profile={profile} modelSurface={modelSurface} showFatLayer={showFatLayer} bodyColor={bodyColor} onLoadingChange={onLoadingChange} onLoadingProgress={onLoadingProgress} />
      )}
      {showGround && <mesh position={[0, -0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 64]} />
        <shadowMaterial transparent opacity={0.22} />
      </mesh>}
      <CameraController heightCm={Math.max(profile.heightCm, comparisonProfile?.heightCm ?? 0)} viewMode={viewMode} onViewModeChange={onViewModeChange} comparing={comparing} />
    </Canvas>
  );
}

export default BodyCanvas;
