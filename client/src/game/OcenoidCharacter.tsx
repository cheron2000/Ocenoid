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
        {/* ===== HEAD & FACE ===== */}
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 1.78, -0.02]}>
          <boxGeometry args={[0.38, 0.12, 0.4]} />
          <meshStandardMaterial color="#3f2b1c" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.68, -0.2]}>
          <boxGeometry args={[0.38, 0.25, 0.1]} />
          <meshStandardMaterial color="#3f2b1c" roughness={0.8} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.08, 1.65, 0.18]}>
          <boxGeometry args={[0.06, 0.06, 0.02]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0.08, 1.65, 0.18]}>
          <boxGeometry args={[0.06, 0.06, 0.02]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>

        {/* ===== TORSO (CLOTHING) ===== */}
        {/* Jacket / Shirt */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.42, 0.55, 0.25]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        {/* Undershirt peeking out */}
        <mesh position={[0, 1.46, 0.1]}>
          <boxGeometry args={[0.15, 0.05, 0.15]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Belt */}
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[0.44, 0.06, 0.27]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Belt Buckle */}
        <mesh position={[0, 0.92, 0.14]}>
          <boxGeometry args={[0.1, 0.08, 0.05]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.5} />
        </mesh>

        {/* ===== ARMS & HANDS ===== */}
        {/* Left arm */}
        <group position={[-0.28, 1.38, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.7} />
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
          </mesh>
        </group>
        {/* Right arm */}
        <group position={[0.28, 1.38, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.7} />
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial color={skinColor} />
            </mesh>
          </mesh>
        </group>

        {/* ===== LEGS & SNEAKERS ===== */}
        {/* Left leg */}
        <group position={[-0.12, 0.88, 0]}>
          <mesh ref={leftLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.9} />
            {/* Sneaker */}
            <mesh position={[0, -0.28, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          </mesh>
        </group>
        {/* Right leg */}
        <group position={[0.12, 0.88, 0]}>
          <mesh ref={rightLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.9} />
            {/* Sneaker */}
            <mesh position={[0, -0.28, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          </mesh>
        </group>
      </group>
    </group>
  );
}
