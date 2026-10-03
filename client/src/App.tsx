import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function OceanPrototype() {
  return (
    <Canvas camera={{ position: [8, 7, 10], fov: 50 }}>
      <color attach="background" args={["#07141d"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 10, 5]} intensity={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0b6f8a" roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[4.8, 0.7, 2.5]} />
        <meshStandardMaterial color="#6b3512" />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[4.4, 0.24, 2.3]} />
        <meshStandardMaterial color="#a05a20" />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 2.8, 16]} />
        <meshStandardMaterial color="#8a541f" />
      </mesh>
      <mesh position={[12, 0.35, 0]}>
        <cylinderGeometry args={[4, 4, 1.2, 32]} />
        <meshStandardMaterial color="#4d7022" />
      </mesh>
      <mesh position={[12, 0.96, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 0.3, 32]} />
        <meshStandardMaterial color="#aa8b4c" />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
}

export default function App() {
  return (
    <main className="app">
      <header className="hud">
        <strong>OCENOID</strong>
        <span>Phase 1 · Ocean Prototype</span>
      </header>
      <section className="scene">
        <OceanPrototype />
      </section>
    </main>
  );
}
