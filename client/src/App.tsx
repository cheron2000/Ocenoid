import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Player = { id: string; x: number; y: number; z: number; yaw: number };
type ServerMessage =
  | { type: "welcome"; id: string; tickRate: number }
  | { type: "snapshot"; serverTick: number; players: Player[] };
type TargetMap = Map<string, Player>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? `ws://${window.location.hostname}:8787`;

function ThirdPersonCamera({ target }: { target: THREE.Object3D | null }) {
  const { camera } = useThree();
  const current = useRef(new THREE.Vector3(0, 4.2, 7.5));
  const look = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    if (!target) return;
    const desired = new THREE.Vector3(0, 4.2, 7.5).applyQuaternion(target.quaternion).add(target.position);
    current.current.lerp(desired, 1 - Math.exp(-7 * delta));
    camera.position.copy(current.current);
    look.current.lerp(new THREE.Vector3(target.position.x, target.position.y + 1.1, target.position.z), 1 - Math.exp(-10 * delta));
    camera.lookAt(look.current);
  });
  return null;
}

function PlayerMesh({ target, local, onRef }: { target: Player; local: boolean; onRef?: (object: THREE.Group | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const current = useRef(new THREE.Vector3(target.x, target.y, target.z));
  useEffect(() => {
    if (local && onRef) onRef(group.current);
    return () => { if (local && onRef) onRef(null); };
  }, [local, onRef]);
  useFrame((_, delta) => {
    if (!group.current) return;
    current.current.lerp(new THREE.Vector3(target.x, target.y, target.z), 1 - Math.exp(-12 * delta));
    group.current.position.copy(current.current);
    group.current.rotation.y = target.yaw;
  });
  return <group ref={group}>
    <mesh position={[0, 0.9, 0]}><capsuleGeometry args={[0.28, 0.8, 4, 8]} /><meshStandardMaterial color={local ? "#ffffff" : "#55b9d2"} /></mesh>
    <mesh position={[0, 1.55, 0]}><sphereGeometry args={[0.32, 16, 12]} /><meshStandardMaterial color="#d7a06b" /></mesh>
  </group>;
}

function World({ players, localId, onLocalRef }: { players: TargetMap; localId: string | null; onLocalRef: (object: THREE.Group | null) => void }) {
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#0b6f8a" roughness={0.3} /></mesh>
    <mesh position={[0, 0.6, 0]}><boxGeometry args={[4.8, 0.7, 2.5]} /><meshStandardMaterial color="#6b3512" /></mesh>
    <mesh position={[0, 1.05, 0]}><boxGeometry args={[4.4, 0.24, 2.3]} /><meshStandardMaterial color="#a05a20" /></mesh>
    <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[0.08, 0.08, 2.8, 16]} /><meshStandardMaterial color="#8a541f" /></mesh>
    <mesh position={[12, 0.35, 0]}><cylinderGeometry args={[4, 4, 1.2, 32]} /><meshStandardMaterial color="#4d7022" /></mesh>
    <mesh position={[12, 0.96, 0]}><cylinderGeometry args={[3.5, 3.5, 0.3, 32]} /><meshStandardMaterial color="#aa8b4c" /></mesh>
    {[...players.values()].map((player) => <PlayerMesh key={player.id} target={player} local={player.id === localId} onRef={player.id === localId ? onLocalRef : undefined} />)}
  </>;
}

export default function App() {
  const [localId, setLocalId] = useState<string | null>(null);
  const [tickRate, setTickRate] = useState(20);
  const [players, setPlayers] = useState<TargetMap>(new Map());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<THREE.Object3D | null>(null);
  const keys = useRef(new Set<string>());
  const socketRef = useRef<WebSocket | null>(null);
  const input = useRef({ forward: 0, right: 0, yaw: 0, sequence: 0 });

  useEffect(() => {
    const socket = new WebSocket(SERVER_URL);
    socketRef.current = socket;
    socket.onopen = () => setConnectionError(null);
    socket.onerror = () => setConnectionError(`Cannot connect to ${SERVER_URL}`);
    socket.onclose = (event) => { if (event.code === 1008) setConnectionError("Room is full. Maximum 4 players."); };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "welcome") { setLocalId(message.id); setTickRate(message.tickRate); }
      else setPlayers(new Map(message.players.map((p) => [p.id, p])));
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !localId) return;
      const k = keys.current;
      const forward = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
      const right = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
      if (forward || right) input.current.yaw = Math.atan2(right, forward);
      input.current = { ...input.current, forward, right, sequence: input.current.sequence + 1 };
      socket.send(JSON.stringify({ type: "input", input: input.current }));
    }, 1000 / tickRate);
    return () => window.clearInterval(interval);
  }, [localId, tickRate]);

  return <main className="app">
    <header className="hud"><strong>OCENOID</strong><span>LAN: {localId ? "Connected" : "Connecting..."} · Players: {players.size}/4 · {tickRate}Hz · WASD</span>{connectionError && <span> · {connectionError}</span>}</header>
    <section className="scene"><Canvas camera={{ position: [0, 4.2, 7.5], fov: 55 }}>
      <color attach="background" args={["#07141d"]} /><ambientLight intensity={1.5} /><directionalLight position={[5, 10, 5]} intensity={2} />
      <World players={players} localId={localId} onLocalRef={setCameraTarget} />
      <ThirdPersonCamera target={cameraTarget} />
    </Canvas></section>
  </main>;
}
