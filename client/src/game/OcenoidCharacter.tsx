import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Target = { x: number; y: number; z: number; yaw: number };

function createCheckeredTexture(color1: string, color2: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = color2;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function createFabricTexture(baseColor: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 15000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

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

  const jacketTexture = useMemo(() => createCheckeredTexture(color, '#ffffff'), [color]);
  const pantsTexture = useMemo(() => createFabricTexture('#334155'), []);
  const hairTexture = useMemo(() => createFabricTexture('#3f2b1c'), []);
  const skinTexture = useMemo(() => createFabricTexture(skinColor), [skinColor]);

  return (
    <group ref={root}>
      <group ref={bodyRef}>
        {/* ===== HEAD & FACE ===== */}
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshStandardMaterial map={skinTexture} roughness={0.6} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 1.78, -0.02]}>
          <boxGeometry args={[0.38, 0.12, 0.4]} />
          <meshStandardMaterial map={hairTexture} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.68, -0.2]}>
          <boxGeometry args={[0.38, 0.25, 0.1]} />
          <meshStandardMaterial map={hairTexture} roughness={0.9} />
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
          <meshStandardMaterial map={jacketTexture} roughness={0.8} />
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
            <meshStandardMaterial map={jacketTexture} roughness={0.8} />
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial map={skinTexture} />
            </mesh>
          </mesh>
        </group>
        {/* Right arm */}
        <group position={[0.28, 1.38, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial map={jacketTexture} roughness={0.8} />
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial map={skinTexture} />
            </mesh>
          </mesh>
        </group>

        {/* ===== LEGS & SNEAKERS ===== */}
        {/* Left leg */}
        <group position={[-0.12, 0.88, 0]}>
          <mesh ref={leftLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
            <meshStandardMaterial map={pantsTexture} roughness={0.9} />
            {/* Sneaker */}
            <mesh position={[0, -0.28, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.3} />
            </mesh>
          </mesh>
        </group>
        {/* Right leg */}
        <group position={[0.12, 0.88, 0]}>
          <mesh ref={rightLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
            <meshStandardMaterial map={pantsTexture} roughness={0.9} />
            {/* Sneaker */}
            <mesh position={[0, -0.28, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.3} />
            </mesh>
          </mesh>
        </group>
      </group>
    </group>
  );
}
