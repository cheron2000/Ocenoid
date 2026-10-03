import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function BoatModel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const boatRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!boatRef.current) return;
    // Gentle bobbing motion on the water
    const t = state.clock.elapsedTime;
    boatRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.05;
    boatRef.current.rotation.z = Math.sin(t * 1.2) * 0.02;
    boatRef.current.rotation.x = Math.sin(t * 0.8) * 0.02;
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group ref={boatRef}>
        {/* Main Hull */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.4, 0.8, 5]} />
          <meshStandardMaterial color="#6b4c3a" />
        </mesh>
        
        {/* Bow (Front part) */}
        <mesh position={[0, 0.4, -2.9]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.8, 3, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#5e4130" />
        </mesh>

        {/* Stern (Back part) */}
        <mesh position={[0, 0.6, 2.4]}>
          <boxGeometry args={[2.4, 0.4, 0.2]} />
          <meshStandardMaterial color="#4f3322" />
        </mesh>

        {/* Left Rail */}
        <mesh position={[-1.15, 0.9, -0.3]}>
          <boxGeometry args={[0.1, 0.2, 5.2]} />
          <meshStandardMaterial color="#8b654b" />
        </mesh>

        {/* Right Rail */}
        <mesh position={[1.15, 0.9, -0.3]}>
          <boxGeometry args={[0.1, 0.2, 5.2]} />
          <meshStandardMaterial color="#8b654b" />
        </mesh>

        {/* Mast */}
        <mesh position={[0, 2.8, -0.5]}>
          <cylinderGeometry args={[0.1, 0.15, 4.8, 8]} />
          <meshStandardMaterial color="#4a3020" />
        </mesh>

        {/* Sail */}
        <mesh position={[0, 3.2, -0.4]} rotation={[0, -0.2, 0]}>
          <boxGeometry args={[3.2, 3.5, 0.05]} />
          <meshStandardMaterial color="#f8f9fa" />
        </mesh>

        {/* Crossbeam (Yard) */}
        <mesh position={[0, 4.8, -0.45]} rotation={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 3.4, 8]} />
          <meshStandardMaterial color="#4a3020" />
        </mesh>
        
        {/* Steering Wheel Base */}
        <mesh position={[0, 0.9, 1.8]}>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshStandardMaterial color="#3a2518" />
        </mesh>

        {/* Deck Floor (slightly brighter wood) */}
        <mesh position={[0, 0.81, 0]}>
          <boxGeometry args={[2.2, 0.05, 4.8]} />
          <meshStandardMaterial color="#9c7255" />
        </mesh>
      </group>
    </group>
  );
}
