import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Player = { id: string; x: number; y: number; z: number; yaw: number };
type ServerMessage =
  | { type: "welcome"; id: string }
  | { type: "snapshot"; players: Player[] };

const SERVER_URL = `ws://${window.location.hostname}:8787`;

function LocalPlayer({ position }: { position: Player }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.position.set(position.x, position.y, position.z);
  });
  return (
    <group ref={group} rotation-y={position.yaw}>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.28, 0.8, 4, 8]} />
        <meshStandardMaterial color="#f2f2f2" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#d7a06b" />
      </mesh>
    </group>
  );
}

function World({ players, localId }: { players: Player[]; localId: string | null }) {
  return (
    <>
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
      {players.map((player) => (
        <LocalPlayer key={player.id} position={player} />
      ))}
    </>
  );
}

export default function App() {
  const socket = useMemo(() => new WebSocket(SERVER_URL), []);
  const [localId, setLocalId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const localPosition = useRef<Player>({ id: "", x: 0, y: 1.5, z: 0, yaw: 0 });

  useEffect(() => {
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "welcome") {
        setLocalId(message.id);
        localPosition.current.id = message.id;
      }
      if (message.type === "snapshot") setPlayers(message.players);
    };
    return () => socket.close();
  }, [socket]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const speed = 0.25;
      const p = localPosition.current;
      if (!p.id || socket.readyState !== WebSocket.OPEN) return;
      if (event.key === "w" || event.key === "ArrowUp") p.z -= speed;
      if (event.key === "s" || event.key === "ArrowDown") p.z += speed;
      if (event.key === "a" || event.key === "ArrowLeft") p.x -= speed;
      if (event.key === "d" || event.key === "ArrowRight") p.x += speed;
      socket.send(JSON.stringify({ type: "move", state: p }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [socket]);

  return (
    <main className="app">
      <header className="hud">
        <strong>OCENOID</strong>
        <span>LAN: {localId ? "Connected" : "Connecting..."} · Players: {players.length}/4 · WASD</span>
      </header>
      <section className="scene">
        <Canvas camera={{ position: [8, 7, 10], fov: 50 }}>
          <color attach="background" args={["#07141d"]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[5, 10, 5]} intensity={2} />
          <World players={players} localId={localId} />
          <OrbitControls />
        </Canvas>
      </section>
    </main>
  );
}
