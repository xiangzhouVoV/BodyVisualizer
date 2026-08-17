import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { calculateBodyDimensions, type BodyPartName } from "../lib/bodyShape";
import type { BodyProfile } from "../types/body";

const skin = "#d4a084";
const skinShadow = "#b77d65";
const SMOOTHING = 12;

type Transform = { position: [number, number, number]; scale: [number, number, number] };

function AnimatedMesh({
  name,
  transform,
  rotation,
  children,
}: {
  name: BodyPartName;
  transform: Transform;
  rotation?: [number, number, number];
  children: ReactNode;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const initialized = useRef(false);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    const current = mesh.current;
    const [x, y, z] = transform.position;
    const [scaleX, scaleY, scaleZ] = transform.scale;

    if (!initialized.current) {
      current.position.set(x, y, z);
      current.scale.set(scaleX, scaleY, scaleZ);
      initialized.current = true;
      return;
    }

    current.position.x = THREE.MathUtils.damp(current.position.x, x, SMOOTHING, delta);
    current.position.y = THREE.MathUtils.damp(current.position.y, y, SMOOTHING, delta);
    current.position.z = THREE.MathUtils.damp(current.position.z, z, SMOOTHING, delta);
    current.scale.x = THREE.MathUtils.damp(current.scale.x, scaleX, SMOOTHING, delta);
    current.scale.y = THREE.MathUtils.damp(current.scale.y, scaleY, SMOOTHING, delta);
    current.scale.z = THREE.MathUtils.damp(current.scale.z, scaleZ, SMOOTHING, delta);
  });

  return <mesh ref={mesh} name={name} rotation={rotation} castShadow>{children}</mesh>;
}

function Limb({ name, transform, rotation = 0 }: { name: BodyPartName; transform: Transform; rotation?: number }) {
  return (
    <AnimatedMesh name={name} transform={transform} rotation={[0, 0, rotation]}>
      <capsuleGeometry args={[1, 1, 10, 18]} />
      <meshStandardMaterial color={skin} roughness={0.72} />
    </AnimatedMesh>
  );
}

function FatLayer({ dimensions }: { dimensions: { armLength: number; armRadius: number; bodyFat: number; calfLength: number; chestDepth: number; chestWidth: number; legRadius: number; legTop: number; pelvisWidth: number; shoulderWidth: number; thighLength: number; torsoLength: number; waistDepth: number; waistWidth: number } }) {
  const { armLength, armRadius, bodyFat, calfLength, chestDepth, chestWidth, legRadius, legTop, pelvisWidth, shoulderWidth, thighLength, torsoLength, waistDepth, waistWidth } = dimensions;
  const opacity = 0.12 + bodyFat * 0.42;
  const extraRadius = 0.025 + bodyFat * 0.06;
  const shoulderY = legTop + torsoLength * 0.82;
  const sides = [
    { side: -1, label: "left" },
    { side: 1, label: "right" },
  ] as const;
  return (
    <group name="fat-layer" renderOrder={2}>
      <AnimatedMesh name="fat-chest" transform={{ position: [0, legTop + torsoLength * 0.64, chestDepth * 0.12], scale: [chestWidth / 2 + bodyFat * 0.035, torsoLength * 0.22 + bodyFat * 0.04, chestDepth / 2 + 0.025] }}>
        <sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#e38b5d" roughness={0.88} transparent opacity={opacity} depthWrite={false} />
      </AnimatedMesh>
      <AnimatedMesh name="fat-waist" transform={{ position: [0, legTop + torsoLength * 0.23, waistDepth * 0.13], scale: [waistWidth / 2 + bodyFat * 0.04, torsoLength * 0.2 + bodyFat * 0.05, waistDepth / 2 + 0.03] }}>
        <sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#e38b5d" roughness={0.88} transparent opacity={opacity} depthWrite={false} />
      </AnimatedMesh>
      <AnimatedMesh name="fat-hip" transform={{ position: [0, legTop - 0.015, 0.08], scale: [pelvisWidth / 2 + bodyFat * 0.04, 0.085 + bodyFat * 0.025, 0.11 + bodyFat * 0.03] }}>
        <sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#e38b5d" roughness={0.88} transparent opacity={opacity} depthWrite={false} />
      </AnimatedMesh>
      {sides.map(({ side, label }) => {
        const legX = side * pelvisWidth * 0.24;
        return (
          <group key={`fat-${label}`}>
            <AnimatedMesh name={`fat-${label}-upper-arm` as BodyPartName} transform={{ position: [side * (shoulderWidth / 2 + 0.07), shoulderY - armLength * 0.28, 0.018], scale: [armRadius + extraRadius, armLength * 0.55 / 3, armRadius + extraRadius] }} rotation={[0, 0, side * -0.15]}>
              <capsuleGeometry args={[1, 1, 10, 18]} /><meshStandardMaterial color="#e38b5d" roughness={0.88} transparent opacity={opacity} depthWrite={false} />
            </AnimatedMesh>
            <AnimatedMesh name={`fat-${label}-forearm` as BodyPartName} transform={{ position: [side * (shoulderWidth / 2 + 0.12), shoulderY - armLength * 0.77, 0.018], scale: [armRadius * 0.83 + extraRadius, armLength * 0.48 / 3, armRadius * 0.83 + extraRadius] }} rotation={[0, 0, side * -0.08]}>
              <capsuleGeometry args={[1, 1, 10, 18]} /><meshStandardMaterial color="#e38b5d" roughness={0.88} transparent opacity={opacity} depthWrite={false} />
            </AnimatedMesh>
            <AnimatedMesh name={`fat-${label}-thigh` as BodyPartName} transform={{ position: [legX, 0.08 + calfLength + thighLength / 2, 0.018], scale: [legRadius + extraRadius, thighLength / 3, legRadius + extraRadius] }}>
              <capsuleGeometry args={[1, 1, 10, 18]} /><meshStandardMaterial color="#e38b5d" roughness={0.88} transparent opacity={opacity} depthWrite={false} />
            </AnimatedMesh>
            <AnimatedMesh name={`fat-${label}-calf` as BodyPartName} transform={{ position: [legX, 0.08 + calfLength / 2, 0.018], scale: [legRadius * 0.82 + extraRadius, calfLength / 3, legRadius * 0.82 + extraRadius] }}>
              <capsuleGeometry args={[1, 1, 10, 18]} /><meshStandardMaterial color="#e38b5d" roughness={0.88} transparent opacity={opacity} depthWrite={false} />
            </AnimatedMesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Modular fallback renderer. It consumes only semantic BodyProfile inputs and
 * named part transforms. ModelAdapter selects this renderer when the formal GLB
 * asset is unavailable, so UI, state, camera, and export code remain untouched.
 */
export function BodyModel({ profile, showFatLayer }: { profile: BodyProfile; showFatLayer: boolean }) {
  const {
    armLength, armRadius, bodyFat, calfLength, chestDepth, chestWidth, isFemale,
    legRadius, legTop, pelvisWidth, shoulderWidth, thighLength, torsoLength,
    waistDepth, waistWidth,
  } = calculateBodyDimensions(profile);
  const torsoCenter = legTop + torsoLength / 2;
  const shoulderY = legTop + torsoLength * 0.82;
  const outfit = isFemale ? "#7956a7" : "#385a85";
  const sides = [
    { side: -1, label: "left" },
    { side: 1, label: "right" },
  ] as const;

  return (
    <group name="body-modular-mannequin">
      {sides.map(({ side, label }) => {
        const legX = side * pelvisWidth * 0.24;
        const calfY = 0.08 + calfLength / 2;
        const thighY = 0.08 + calfLength + thighLength / 2;
        const armX = side * (shoulderWidth / 2 + 0.07);

        return (
          <group key={label}>
            <AnimatedMesh
              name={`${label}-foot` as BodyPartName}
              transform={{ position: [legX, 0.055, 0.035], scale: [legRadius * 0.95, 0.055, legRadius * 1.5] }}
            >
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color={skinShadow} roughness={0.74} />
            </AnimatedMesh>
            <Limb name={`${label}-calf` as BodyPartName} transform={{ position: [legX, calfY, 0], scale: [legRadius * 0.82, calfLength / 3, legRadius * 0.82] }} />
            <Limb name={`${label}-thigh` as BodyPartName} transform={{ position: [legX, thighY, 0], scale: [legRadius, thighLength / 3, legRadius] }} />
            <Limb
              name={`${label}-upper-arm` as BodyPartName}
              transform={{ position: [armX, shoulderY - armLength * 0.28, 0], scale: [armRadius, armLength * 0.55 / 3, armRadius] }}
              rotation={side * -0.15}
            />
            <Limb
              name={`${label}-forearm` as BodyPartName}
              transform={{ position: [side * (shoulderWidth / 2 + 0.12), shoulderY - armLength * 0.77, 0], scale: [armRadius * 0.83, armLength * 0.48 / 3, armRadius * 0.83] }}
              rotation={side * -0.08}
            />
          </group>
        );
      })}

      <AnimatedMesh name="pelvis" transform={{ position: [0, legTop - 0.02, 0], scale: [pelvisWidth / 2, 0.09, 0.095] }}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color={outfit} roughness={0.7} />
      </AnimatedMesh>
      <AnimatedMesh name="torso" transform={{ position: [0, torsoCenter, 0], scale: [Math.max(chestWidth, waistWidth) / 2, torsoLength * 0.45, Math.max(chestDepth, waistDepth) / 2] }}>
        <sphereGeometry args={[1, 28, 22]} />
        <meshStandardMaterial color={outfit} roughness={0.67} />
      </AnimatedMesh>
      <AnimatedMesh name="waist" transform={{ position: [0, legTop + torsoLength * 0.16, waistDepth * 0.05], scale: [waistWidth / 2, torsoLength * 0.2, waistDepth / 2] }}>
        <sphereGeometry args={[1, 28, 22]} />
        <meshStandardMaterial color={outfit} roughness={0.67} />
      </AnimatedMesh>
      {showFatLayer && <FatLayer dimensions={{ armLength, armRadius, bodyFat, calfLength, chestDepth, chestWidth, legRadius, legTop, pelvisWidth, shoulderWidth, thighLength, torsoLength, waistDepth, waistWidth }} />}
      <AnimatedMesh name="neck" transform={{ position: [0, legTop + torsoLength + 0.055, 0], scale: [0.055, 0.065, 0.055] }}>
        <cylinderGeometry args={[1, 1, 2, 16]} />
        <meshStandardMaterial color={skinShadow} roughness={0.72} />
      </AnimatedMesh>
      <AnimatedMesh name="head" transform={{ position: [0, legTop + torsoLength + 0.24, 0], scale: [0.15, 0.205, 0.15] }}>
        <sphereGeometry args={[1, 28, 22]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </AnimatedMesh>
    </group>
  );
}
