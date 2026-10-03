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
        {/* ===== HELMET / HEAD ===== */}
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[0.48, 0.5, 0.45]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Visor */}
        <mesh position={[0, 1.65, 0.23]}>
          <boxGeometry args={[0.38, 0.25, 0.1]} />
          <meshStandardMaterial color="#0ea5e9" roughness={0.1} metalness={0.8} />
        </mesh>
        {/* Helmet trim / earpieces */}
        <mesh position={[-0.26, 1.62, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0.26, 1.62, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#334155" />
        </mesh>

        {/* ===== TORSO (DIVING SUIT) ===== */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.48, 0.55, 0.3]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* Chest Plate */}
        <mesh position={[0, 1.25, 0.16]}>
          <boxGeometry args={[0.35, 0.35, 0.05]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
        {/* O2 Dial on chest */}
        <mesh position={[0.1, 1.3, 0.19]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Belt */}
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.32]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Belt Buckle */}
        <mesh position={[0, 0.92, 0.17]}>
          <boxGeometry args={[0.15, 0.12, 0.05]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
        </mesh>
        
        {/* ===== OXYGEN TANK (BACKPACK) ===== */}
        <group position={[0, 1.25, -0.25]}>
          {/* Main Tank */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.45, 16]} />
            <meshStandardMaterial color="#3b82f6" metalness={0.3} />
          </mesh>
          {/* Tank Valve */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.1]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.03]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>

        {/* ===== ARMS & GLOVES ===== */}
        {/* Left arm */}
        <group position={[-0.32, 1.38, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
            {/* Glove */}
            <mesh position={[0, -0.22, 0]}>
              <sphereGeometry args={[0.09, 12, 12]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </mesh>
        </group>
        {/* Right arm */}
        <group position={[0.32, 1.38, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
            {/* Glove */}
            <mesh position={[0, -0.22, 0]}>
              <sphereGeometry args={[0.09, 12, 12]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </mesh>
        </group>

        {/* ===== LEGS & FLIPPERS ===== */}
        {/* Left leg */}
        <group position={[-0.14, 0.88, 0]}>
          <mesh ref={leftLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 4, 8]} />
            <meshStandardMaterial color="#334155" />
            {/* Shoe / Flipper */}
            <mesh position={[0, -0.28, 0.06]}>
              <boxGeometry args={[0.18, 0.12, 0.28]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </mesh>
        </group>
        {/* Right leg */}
        <group position={[0.14, 0.88, 0]}>
          <mesh ref={rightLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 4, 8]} />
            <meshStandardMaterial color="#334155" />
            {/* Shoe / Flipper */}
            <mesh position={[0, -0.28, 0.06]}>
              <boxGeometry args={[0.18, 0.12, 0.28]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </mesh>
        </group>
      </group>
    </group>
  );
}
