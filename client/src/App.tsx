import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OcenoidCharacter, CHARACTER_PRESETS } from "./game/OcenoidCharacter";
import { SailingShip } from "./game/SailingShipModel";

type Player = { id: string; x: number; y: number; z: number; yaw: number };
type ServerMessage =
  | { type: "welcome"; id: string; tickRate: number }
  | { type: "snapshot"; serverTick: number; players: Player[] };
type TargetMap = Map<string, Player>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? `ws://${window.location.hostname}:8787`;

/**
 * Derive a stable 0-3 slot index from a UUID string.
 * Sums the first 8 hex chars so the result is deterministic across all
 * clients without needing any server-side slot tracking.
 */
function uuidToSlot(id: string): number {
  const hex = id.replace(/-/g, "").slice(0, 8);
  let sum = 0;
  for (const ch of hex) sum += parseInt(ch, 16);
  return sum % CHARACTER_PRESETS.length;
}

function ThirdPersonCamera({ target, onYaw }: { target: THREE.Object3D | null; onYaw: (yaw: number) => void }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0.28);
  const distance = useRef(7.5);
  const dragging = useRef(false);
  const current = useRef(new THREE.Vector3(0, 4.2, 7.5));
  const look = useRef(new THREE.Vector3());

  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: PointerEvent) => { if (e.button === 2) { dragging.current = true; canvas.setPointerCapture(e.pointerId); } };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= e.movementX * 0.006;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.005, -0.15, 1.05);
      onYaw(yaw.current);
    };
    const onUp = (e: PointerEvent) => { if (e.button === 2) dragging.current = false; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); distance.current = THREE.MathUtils.clamp(distance.current + e.deltaY * 0.008, 3, 12); };
    const onContext = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false }); canvas.addEventListener("contextmenu", onContext);
    return () => {
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel); canvas.removeEventListener("contextmenu", onContext);
    };
  }, [gl, onYaw]);

  useFrame((_, delta) => {
    if (!target) return;
    const offset = new THREE.Vector3(0, 0, distance.current).applyEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
    const desired = target.position.clone().add(new THREE.Vector3(0, 1.4, 0)).add(offset);
    current.current.lerp(desired, 1 - Math.exp(-10 * delta));
    camera.position.copy(current.current);
    const targetLook = target.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    look.current.lerp(targetLook, 1 - Math.exp(-12 * delta));
    camera.lookAt(look.current);
  });
  return null;
}

function PlayerMesh({ target, local, onRef }: { target: Player; local: boolean; onRef?: (object: THREE.Group | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const appearance = CHARACTER_PRESETS[uuidToSlot(target.id)];
  useEffect(() => { if (local && onRef) onRef(group.current); return () => { if (local && onRef) onRef(null); }; }, [local, onRef]);
  useFrame((_, delta) => {
    if (!group.current) return;
    // Smoothly interpolate the wrapper group's position for the camera to follow
    group.current.position.lerp(new THREE.Vector3(target.x, target.y, target.z), 1 - Math.exp(-12 * delta));
  });
  return <group ref={group}><OcenoidCharacter target={target} appearance={appearance} /></group>;
}

function World({ players, localId, onLocalRef }: { players: TargetMap; localId: string | null; onLocalRef: (object: THREE.Group | null) => void }) {
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4000, 4000]} /><meshStandardMaterial color="#0b6f8a" roughness={0.3} /></mesh>
    {/* Imported ship model from zip */}
    <SailingShip position={[0, -1, 0]} rotation={[0, 0, 0]} scale={1} />
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
  const cameraYaw = useRef(0);
  const input = useRef({ forward: 0, right: 0, yaw: 0, sequence: 0 });
  const setCameraYaw = (yaw: number) => { cameraYaw.current = yaw; };

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
      input.current = { forward, right, yaw: cameraYaw.current, sequence: input.current.sequence + 1 };
      socket.send(JSON.stringify({ type: "input", input: input.current }));
    }, 1000 / tickRate);
    return () => window.clearInterval(interval);
  }, [localId, tickRate]);

  return <main className="app">
    <header className="hud"><strong>OCENOID</strong><span>LAN: {localId ? "Connected" : "Connecting..."} · Players: {players.size}/4 · {tickRate}Hz · WASD · RMB Camera · Wheel Zoom</span>{connectionError && <span> · {connectionError}</span>}</header>
    <section className="scene"><Canvas camera={{ position: [0, 4.2, 7.5], fov: 55 }}>
      <color attach="background" args={["#07141d"]} /><ambientLight intensity={1.5} /><directionalLight position={[5, 10, 5]} intensity={2} />
      <World players={players} localId={localId} onLocalRef={setCameraTarget} />
      <ThirdPersonCamera target={cameraTarget} onYaw={setCameraYaw} />
    </Canvas></section>
  </main>;
}
