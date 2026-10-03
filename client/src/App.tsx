import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Player = { id: string; x: number; y: number; z: number; yaw: number };
type ServerMessage =
  | { type: "welcome"; id: string; tickRate: number }
  | { type: "snapshot"; serverTick: number; players: Player[] };

type TargetMap = Map<string, Player>;
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? `ws://${window.location.hostname}:8787`;
const MOVE_SPEED = 4;

function PlayerMesh({ target, local }: { target: Player; local: boolean }) {
  const group = useRef<THREE.Group>(null);
  const current = useRef(new THREE.Vector3(target.x, target.y, target.z));

  useFrame((_, delta) => {
    if (!group.current) return;
    const desired = new THREE.Vector3(target.x, target.y, target.z);
    current.current.lerp(desired, 1 - Math.exp(-12 * delta));
    group.current.position.copy(current.current);
    group.current.rotation.y = target.yaw;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.28, 0.8, 4, 8]} />
        <meshStandardMaterial color={local ? "#ffffff" : "#55b9d2"} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#d7a06b" />
      </mesh>
    </group>
  );
}

function World({ players, localId }: { players: TargetMap; localId: string | null }) {
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
      {[...players.values()].map((player) => (
        <PlayerMesh key={player.id} target={player} local={player.id === localId} />
      ))}
    </>
  );
}

export default function App() {
  const [localId, setLocalId] = useState<string | null>(null);
  const [tickRate, setTickRate] = useState(20);
  const [players, setPlayers] = useState<TargetMap>(new Map());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const input = useRef({ forward: 0, right: 0, yaw: 0, sequence: 0 });
  const keys = useRef(new Set<string>());
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(SERVER_URL);
    socketRef.current = socket;

    socket.onopen = () => setConnectionError(null);
    socket.onerror = () => setConnectionError(`Cannot connect to ${SERVER_URL}`);
    socket.onclose = (event) => {
      if (event.code === 1008) setConnectionError("Room is full. Maximum 4 players.");
      else if (!localId) setConnectionError(`Connection closed. Check ${SERVER_URL}.`);
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "welcome") {
        setLocalId(message.id);
        setTickRate(message.tickRate);
      } else if (message.type === "snapshot") {
        setPlayers(new Map(message.players.map((player) => [player.id, player])));
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !localId) return;
      const k = keys.current;
      const forward = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
      const right = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
      input.current = { forward, right, yaw: input.current.yaw, sequence: input.current.sequence + 1 };
      socket.send(JSON.stringify({ type: "input", input: input.current }));
    }, 1000 / tickRate);
    return () => window.clearInterval(interval);
  }, [localId, tickRate]);

  return (
    <main className="app">
      <header className="hud">
        <strong>OCENOID</strong>
        <span>LAN: {localId ? "Connected" : "Connecting..."} · Players: {players.size}/4 · Server: {tickRate}Hz · WASD</span>
        {connectionError && <span> · {connectionError}</span>}
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
