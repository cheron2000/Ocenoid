import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { OcenoidCharacter, CHARACTER_PRESETS } from "./game/OcenoidCharacter";
import { BoatModel } from "./game/BoatModel";
import { OceanSurface } from "./game/OceanSurface";

type Player = { id: string; x: number; y: number; z: number; yaw: number; name: string };
type ServerMessage =
  | { type: "welcome"; id: string; tickRate: number; spawnIndex: number; name: string }
  | { type: "snapshot"; serverTick: number; players: Player[] };
type TargetMap = Map<string, Player>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? `ws://${window.location.hostname}:8787`;

// ─── Boat placement ───────────────────────────────────────────────────────────
// GLB hull Y range: ~0 to 1.25 world units, deck surface at ~y=1.15.
// We offset the boat down by 1 so the keel sits below the ocean plane (y=0)
// and the deck surface lands at roughly y=0.15 above the water.
const SHIP_CONFIG = {
  position: [0, -1, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  scale: 1,
};

// ─── UUID → appearance slot ──────────────────────────────────────────────────
function uuidToSlot(id: string): number {
  const hex = id.replace(/-/g, "").slice(0, 8);
  let sum = 0;
  for (const ch of hex) sum += parseInt(ch, 16);
  return sum % CHARACTER_PRESETS.length;
}

// ─── Shared raycaster (module-level singletons, never recreated) ─────────────
const _ray    = new THREE.Raycaster();
const _down   = new THREE.Vector3(0, -1, 0);
const _origin = new THREE.Vector3();

function snapToFloor(position: THREE.Vector3, scene: THREE.Scene): number {
  _origin.set(position.x, position.y + 2, position.z);
  _ray.set(_origin, _down);
  _ray.far = 10;
  const hits = _ray.intersectObjects(scene.children, true);
  for (const hit of hits) {
    const name = hit.object.name ?? "";
    if (name.startsWith("Ocean") || name.startsWith("Water") || name === "") continue;
    return hit.point.y;
  }
  return 0; // ocean surface fallback
}

// ─── Third-person camera with collision ──────────────────────────────────────
function ThirdPersonCamera({ target, onYaw }: { target: THREE.Object3D | null; onYaw: (yaw: number) => void }) {
  const { camera, gl, scene } = useThree();
  const yaw      = useRef(0);
  const pitch    = useRef(0.28);
  const distance = useRef(7.5);
  const dragging = useRef(false);
  const current  = useRef(new THREE.Vector3(0, 4.2, 7.5));
  const look     = useRef(new THREE.Vector3());

  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: PointerEvent) => {
      if (e.button === 2) { dragging.current = true; canvas.setPointerCapture(e.pointerId); }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= e.movementX * 0.006;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.005, -0.15, 1.05);
      onYaw(yaw.current);
    };
    const onUp = (e: PointerEvent) => {
      if (e.button === 2) dragging.current = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distance.current = THREE.MathUtils.clamp(distance.current + e.deltaY * 0.008, 3, 12);
    };
    const onContext = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener("pointerdown",  onDown);
    canvas.addEventListener("pointermove",  onMove);
    canvas.addEventListener("pointerup",    onUp);
    canvas.addEventListener("wheel",        onWheel, { passive: false });
    canvas.addEventListener("contextmenu",  onContext);
    return () => {
      canvas.removeEventListener("pointerdown",  onDown);
      canvas.removeEventListener("pointermove",  onMove);
      canvas.removeEventListener("pointerup",    onUp);
      canvas.removeEventListener("wheel",        onWheel);
      canvas.removeEventListener("contextmenu",  onContext);
    };
  }, [gl, onYaw]);

  useFrame((_, delta) => {
    if (!target) return;
    const pivot  = target.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const offset = new THREE.Vector3(0, 0, distance.current)
      .applyEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
    const desired = pivot.clone().add(offset);

    // Camera collision — pull back if hull is in the way
    const dir = offset.clone().normalize();
    _ray.set(pivot, dir);
    _ray.far = distance.current;
    const hits = _ray.intersectObjects(scene.children, true);
    let safeDist = distance.current;
    for (const hit of hits) {
      const name = hit.object.name ?? "";
      if (name.startsWith("Ocean") || name.startsWith("Water")) continue;
      safeDist = Math.max(1.0, hit.distance - 0.3);
      break;
    }
    const safeDesired = pivot.clone().add(dir.multiplyScalar(safeDist));

    current.current.lerp(safeDesired, 1 - Math.exp(-10 * delta));
    camera.position.copy(current.current);
    const lookAt = target.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    look.current.lerp(lookAt, 1 - Math.exp(-12 * delta));
    camera.lookAt(look.current);
  });

  return null;
}

// ─── Player mesh with deck snap + name label ─────────────────────────────────
function PlayerMesh({
  target, local, onRef, onPosUpdate,
}: {
  target: Player;
  local: boolean;
  onRef?: (g: THREE.Group | null) => void;
  onPosUpdate?: (pos: THREE.Vector3) => void;
}) {
  const group      = useRef<THREE.Group>(null);
  const { scene }  = useThree();
  const appearance = CHARACTER_PRESETS[uuidToSlot(target.id)];
  const snappedY   = useRef(target.y);

  useEffect(() => {
    if (local && onRef) onRef(group.current);
    return () => { if (local && onRef) onRef(null); };
  }, [local, onRef]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const pos = new THREE.Vector3(target.x, target.y, target.z);
    if (local) {
      const floor = snapToFloor(pos, scene);
      snappedY.current = THREE.MathUtils.lerp(snappedY.current, floor, 1 - Math.exp(-20 * delta));
      pos.y = snappedY.current;
      onPosUpdate?.(pos);
    }
    group.current.position.lerp(pos, 1 - Math.exp(-12 * delta));
  });

  return (
    <group ref={group}>
      <OcenoidCharacter target={target} appearance={appearance} />
      <Html
        position={[0, 2.2, 0]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          color: local ? "#ffffff" : "#7dd3fc",
          fontSize: "13px",
          fontFamily: "monospace",
          fontWeight: "bold",
          textShadow: "0 1px 4px rgba(0,0,0,0.9)",
          whiteSpace: "nowrap",
        }}
      >
        {target.name}{local ? " ★" : ""}
      </Html>
    </group>
  );
}

// ─── Interaction prompts ──────────────────────────────────────────────────────
type InteractionTarget = {
  id: string;
  label: string;
  position: [number, number, number];
  radius: number;
};

const INTERACTION_TARGETS: InteractionTarget[] = [
  { id: "steering", label: "Steer",        position: [2.8,  1.6, -0.9], radius: 1.4 },
  { id: "craft",    label: "Craft",         position: [-1.2, 1.5,  0.8], radius: 1.4 },
  { id: "storage",  label: "Open Storage",  position: [ 0.5, 1.5,  0.9], radius: 1.2 },
];

function InteractionPrompts({ playerPos }: { playerPos: THREE.Vector3 | null }) {
  if (!playerPos) return null;
  const closest = INTERACTION_TARGETS.reduce<InteractionTarget | null>((best, t) => {
    const dx = t.position[0] - playerPos.x;
    const dz = t.position[2] - playerPos.z;
    const d  = Math.sqrt(dx * dx + dz * dz);
    if (d < t.radius && (!best || d < Math.sqrt((best.position[0] - playerPos.x) ** 2 + (best.position[2] - playerPos.z) ** 2)))
      return t;
    return best;
  }, null);

  if (!closest) return null;

  return (
    <Html position={closest.position} center distanceFactor={6} style={{ pointerEvents: "none" }}>
      <div style={{
        color: "#fef08a",
        fontFamily: "monospace",
        fontSize: "13px",
        fontWeight: "bold",
        textShadow: "0 1px 6px rgba(0,0,0,0.95)",
        background: "rgba(0,0,0,0.45)",
        padding: "3px 8px",
        borderRadius: "4px",
        border: "1px solid rgba(254,240,138,0.4)",
        whiteSpace: "nowrap",
      }}>
        [E] {closest.label}
      </div>
    </Html>
  );
}

// ─── World ────────────────────────────────────────────────────────────────────
function World({
  players, localId, onLocalRef, onLocalPosUpdate,
}: {
  players: TargetMap;
  localId: string | null;
  onLocalRef: (g: THREE.Group | null) => void;
  onLocalPosUpdate: (pos: THREE.Vector3) => void;
}) {
  const localPosRef = useRef<THREE.Vector3 | null>(null);
  const [localPos, setLocalPos] = useState<THREE.Vector3 | null>(null);

  const handlePosUpdate = (pos: THREE.Vector3) => {
    localPosRef.current = pos.clone();
    setLocalPos(pos.clone());
    onLocalPosUpdate(pos);
  };

  return (
    <>
      {/* Ocean surface */}
      <OceanSurface />

      {/* GLB boat */}
      <BoatModel
        position={SHIP_CONFIG.position}
        rotation={SHIP_CONFIG.rotation}
        scale={SHIP_CONFIG.scale}
      />

      {/* Island placeholder */}
      <mesh position={[12, 0.35, 0]}>
        <cylinderGeometry args={[4, 4, 1.2, 32]} />
        <meshStandardMaterial color="#4d7022" />
      </mesh>
      <mesh position={[12, 0.96, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 0.3, 32]} />
        <meshStandardMaterial color="#aa8b4c" />
      </mesh>

      {/* Players */}
      {[...players.values()].map((player) => (
        <PlayerMesh
          key={player.id}
          target={player}
          local={player.id === localId}
          onRef={player.id === localId ? onLocalRef : undefined}
          onPosUpdate={player.id === localId ? handlePosUpdate : undefined}
        />
      ))}

      {/* Interaction prompts */}
      <InteractionPrompts playerPos={localPos} />
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [localId,        setLocalId]        = useState<string | null>(null);
  const [tickRate,       setTickRate]        = useState(20);
  const [players,        setPlayers]         = useState<TargetMap>(new Map());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [cameraTarget,   setCameraTarget]    = useState<THREE.Object3D | null>(null);

  const keys        = useRef(new Set<string>());
  const socketRef   = useRef<WebSocket | null>(null);
  const cameraYaw   = useRef(0);
  const input       = useRef({ forward: 0, right: 0, yaw: 0, sequence: 0 });
  const setCameraYaw = (y: number) => { cameraYaw.current = y; };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _localPosRef = useRef<THREE.Vector3 | null>(null); // reserved for future E-key handler

  useEffect(() => {
    const socket = new WebSocket(SERVER_URL);
    socketRef.current = socket;
    socket.onopen  = () => setConnectionError(null);
    socket.onerror = () => setConnectionError(`Cannot connect to ${SERVER_URL}`);
    socket.onclose = (e) => { if (e.code === 1008) setConnectionError("Room is full. Maximum 4 players."); };
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      if (msg.type === "welcome") { setLocalId(msg.id); setTickRate(msg.tickRate); }
      else setPlayers(new Map(msg.players.map((p) => [p.id, p])));
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up   = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !localId) return;
      const k = keys.current;
      const forward = (k.has("w") || k.has("arrowup")    ? 1 : 0) - (k.has("s") || k.has("arrowdown")  ? 1 : 0);
      const right   = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft")  ? 1 : 0);
      input.current = { forward, right, yaw: cameraYaw.current, sequence: input.current.sequence + 1 };
      socket.send(JSON.stringify({ type: "input", input: input.current }));
    }, 1000 / tickRate);
    return () => window.clearInterval(interval);
  }, [localId, tickRate]);

  return (
    <main className="app">
      <header className="hud">
        <strong>OCENOID</strong>
        <span>
          LAN: {localId ? "Connected" : "Connecting..."} · Players: {players.size}/4 · {tickRate}Hz · WASD · RMB Camera · Wheel Zoom
        </span>
        {connectionError && <span> · {connectionError}</span>}
      </header>
      <section className="scene">
        <Canvas camera={{ position: [0, 4.2, 7.5], fov: 55 }}>
          <color attach="background" args={["#07141d"]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[5, 10, 5]} intensity={2} />
          <World
            players={players}
            localId={localId}
            onLocalRef={setCameraTarget}
            onLocalPosUpdate={(pos) => { _localPosRef.current = pos; }}
          />
          <ThirdPersonCamera target={cameraTarget} onYaw={setCameraYaw} />
        </Canvas>
      </section>
    </main>
  );
}
