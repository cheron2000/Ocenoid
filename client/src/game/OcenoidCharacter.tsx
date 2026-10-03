import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Target = { x: number; y: number; z: number; yaw: number };

/**
 * Procedural humanoid character built from primitives.
 * Supports idle bobbing and a walk animation (arm/leg swing).
 * No external model file required.
 */
export function OcenoidCharacter({ target, color = "#55b9d2" }: { target: Target; color?: string }) {
  const root = useRef<THREE.Group>(null);
  const current = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const prev = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const phase = useRef(0);

  // Body part refs for animation
  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!root.current) return;

    const next = new THREE.Vector3(target.x, target.y, target.z);
    prev.current.copy(current.current);
    current.current.lerp(next, 1 - Math.exp(-12 * delta));
    root.current.position.copy(current.current);
    root.current.rotation.y = target.yaw;

    const speed = prev.current.distanceTo(current.current) / Math.max(delta, 0.001);
    const moving = speed > 0.15;

    if (moving) {
      phase.current += delta * 10;
    } else {
      // Gentle idle bob
      phase.current += delta * 1.5;
    }

    const swing = moving ? Math.sin(phase.current) * 0.6 : 0;
    const bob = moving ? Math.abs(Math.sin(phase.current)) * 0.06 : Math.sin(phase.current) * 0.02;

    // Body bob
    if (bodyRef.current) bodyRef.current.position.y = bob;

    // Arm swing (opposite to legs)
    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;

    // Leg swing
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
  });

  const skinColor = "#d7a06b";
  const shoeColor = "#2a2a2a";

  return (
    <group ref={root}>
      <group ref={bodyRef}>
        {/* ===== HEAD ===== */}
        <mesh position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.22, 16, 12]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.08, 1.65, 0.18]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0.08, 1.65, 0.18]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>

        {/* ===== TORSO ===== */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.45, 0.55, 0.25]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Belt */}
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[0.46, 0.06, 0.26]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>

        {/* ===== ARMS ===== */}
        {/* Left arm */}
        <group position={[-0.32, 1.35, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>
        {/* Right arm */}
        <group position={[0.32, 1.35, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.06, 0.35, 4, 8]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>

        {/* ===== LEGS ===== */}
        {/* Left leg */}
        <group position={[-0.1, 0.88, 0]}>
          <mesh ref={leftLegRef} position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
            <meshStandardMaterial color="#2c5282" />
          </mesh>
        </group>
        {/* Right leg */}
        <group position={[0.1, 0.88, 0]}>
          <mesh ref={rightLegRef} position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
            <meshStandardMaterial color="#2c5282" />
          </mesh>
        </group>

        {/* ===== SHOES ===== */}
        <mesh position={[-0.1, 0.38, 0.04]}>
          <boxGeometry args={[0.14, 0.1, 0.2]} />
          <meshStandardMaterial color={shoeColor} />
        </mesh>
        <mesh position={[0.1, 0.38, 0.04]}>
          <boxGeometry args={[0.14, 0.1, 0.2]} />
          <meshStandardMaterial color={shoeColor} />
        </mesh>
      </group>
    </group>
  );
}
