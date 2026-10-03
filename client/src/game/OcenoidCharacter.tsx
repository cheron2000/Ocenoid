import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Target = { x: number; y: number; z: number; yaw: number };

// ─── Appearance preset ────────────────────────────────────────────────────────

export type CharacterAppearance = {
  /** Base jacket / shirt colour */
  jacketColor: string;
  /** Secondary / pattern colour on the jacket */
  jacketAccent: string;
  /** Pattern style painted onto the jacket */
  jacketPattern: "stripe" | "camo" | "dots" | "plaid";
  /** Trouser colour */
  pantsColor: string;
  /** Skin tone hex */
  skinColor: string;
  /** Hair colour hex */
  hairColor: string;
  /** Eye colour hex */
  eyeColor: string;
  /** Shoe colour hex */
  shoeColor: string;
  /** Sole / trim colour on shoes */
  shoeAccent: string;
  /** Belt buckle colour */
  buckleColor: string;
};

/**
 * Four visually distinct presets — one per player slot.
 * Slot assignment is deterministic from the player UUID (see App.tsx).
 */
export const CHARACTER_PRESETS: CharacterAppearance[] = [
  // ── Slot 0  – "Coral Diver"  (warm orange outfit, light skin, blond hair) ──
  {
    jacketColor:   "#e8622a",
    jacketAccent:  "#f4a261",
    jacketPattern: "stripe",
    pantsColor:    "#1e3a5f",
    skinColor:     "#f5c49a",
    hairColor:     "#c8922a",
    eyeColor:      "#2563eb",
    shoeColor:     "#1e293b",
    shoeAccent:    "#f97316",
    buckleColor:   "#fbbf24",
  },
  // ── Slot 1  – "Kelp Ranger"  (deep green outfit, medium brown skin, dark hair) ──
  {
    jacketColor:   "#2d6a4f",
    jacketAccent:  "#95d5b2",
    jacketPattern: "camo",
    pantsColor:    "#3d2b1f",
    skinColor:     "#c68642",
    hairColor:     "#1a0a00",
    eyeColor:      "#16a34a",
    shoeColor:     "#3d2b1f",
    shoeAccent:    "#6b7280",
    buckleColor:   "#6b7280",
  },
  // ── Slot 2  – "Abyss Scout"  (deep purple outfit, dark skin, black hair) ──
  {
    jacketColor:   "#4c1d95",
    jacketAccent:  "#a78bfa",
    jacketPattern: "dots",
    pantsColor:    "#0f172a",
    skinColor:     "#8d5524",
    hairColor:     "#0f0a07",
    eyeColor:      "#7c3aed",
    shoeColor:     "#0f172a",
    shoeAccent:    "#a78bfa",
    buckleColor:   "#a78bfa",
  },
  // ── Slot 3  – "Frost Captain" (icy cyan outfit, pale skin, silver hair) ──
  {
    jacketColor:   "#0891b2",
    jacketAccent:  "#e0f2fe",
    jacketPattern: "plaid",
    pantsColor:    "#334155",
    skinColor:     "#fde8d8",
    hairColor:     "#cbd5e1",
    eyeColor:      "#0ea5e9",
    shoeColor:     "#1e293b",
    shoeAccent:    "#e0f2fe",
    buckleColor:   "#e0f2fe",
  },
];

// ─── Texture generators ───────────────────────────────────────────────────────

function mkStripeTexture(base: string, accent: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = accent;
  for (let x = 0; x < size; x += 32) {
    ctx.fillRect(x, 0, 12, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 3);
  return t;
}

function mkCamoTexture(base: string, accent: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // deterministic blobs using a seeded position sequence
  const positions = [
    [30, 40, 38, 22], [90, 20, 45, 28], [160, 60, 40, 25],
    [20, 110, 50, 30], [110, 90, 42, 20], [200, 100, 38, 24],
    [60, 170, 44, 26], [150, 160, 40, 22], [220, 180, 36, 20],
    [80, 220, 48, 28], [180, 220, 42, 24], [240, 40, 36, 18],
  ];
  ctx.fillStyle = accent;
  for (const [x, y, rx, ry] of positions) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // darken layer
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (const [x, y, rx, ry] of positions.slice(0, 6)) {
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 15, rx * 0.6, ry * 0.6, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

function mkDotsTexture(base: string, accent: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = accent;
  const gap = 28;
  for (let row = 0; row < size / gap + 1; row++) {
    for (let col = 0; col < size / gap + 1; col++) {
      const ox = row % 2 === 0 ? 0 : gap / 2;
      ctx.beginPath();
      ctx.arc(col * gap + ox, row * gap, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

function mkPlaidTexture(base: string, accent: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // horizontal bands
  ctx.fillStyle = accent + "88";  // semi-transparent
  for (let y = 0; y < size; y += 32) {
    ctx.fillRect(0, y, size, 10);
  }
  // vertical bands
  for (let x = 0; x < size; x += 32) {
    ctx.fillRect(x, 0, 10, size);
  }
  // bright cross-hatch at intersections
  ctx.fillStyle = accent;
  for (let y = 0; y < size; y += 32) {
    for (let x = 0; x < size; x += 32) {
      ctx.fillRect(x, y, 10, 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 3);
  return t;
}

function mkJacketTexture(a: CharacterAppearance): THREE.CanvasTexture {
  switch (a.jacketPattern) {
    case "stripe": return mkStripeTexture(a.jacketColor, a.jacketAccent);
    case "camo":   return mkCamoTexture(a.jacketColor, a.jacketAccent);
    case "dots":   return mkDotsTexture(a.jacketColor, a.jacketAccent);
    case "plaid":  return mkPlaidTexture(a.jacketColor, a.jacketAccent);
  }
}

function mkFlatTexture(hex: string, noise = true): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);
  if (noise) {
    // deterministic subtle noise — same pixel grid every call for same hex
    const seed = parseInt(hex.replace("#", "0x"), 16);
    let s = seed;
    for (let i = 0; i < 4000; i++) {
      // lcg
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const px = ((s >>> 16) & 0xff) % size;
      const py = ((s >>> 8)  & 0xff) % size;
      const bright = (s & 1) ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
      ctx.fillStyle = bright;
      ctx.fillRect(px, py, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  target: Target;
  /** Full appearance preset. Defaults to slot 0. */
  appearance?: CharacterAppearance;
  /** Ref callback so the parent can attach the camera to this group. */
  onRef?: (group: THREE.Group | null) => void;
};

/**
 * Procedural humanoid character — each of the 4 player slots has a unique
 * skin tone, hair colour/style, outfit colour, pattern, and shoe colour.
 */
export function OcenoidCharacter({ target, appearance = CHARACTER_PRESETS[0], onRef }: Props) {
  const root = useRef<THREE.Group>(null);
  const current = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const prev    = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const phase   = useRef(0);

  const bodyRef     = useRef<THREE.Group>(null);
  const leftArmRef  = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef  = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  // All textures are memoised per appearance instance so they're generated once.
  const jacketTex = useMemo(() => mkJacketTexture(appearance), [appearance]);
  const pantsTex  = useMemo(() => mkFlatTexture(appearance.pantsColor),  [appearance.pantsColor]);
  const skinTex   = useMemo(() => mkFlatTexture(appearance.skinColor),   [appearance.skinColor]);
  const hairTex   = useMemo(() => mkFlatTexture(appearance.hairColor),   [appearance.hairColor]);

  useFrame((_, delta) => {
    if (!root.current) return;
    const next = new THREE.Vector3(target.x, target.y, target.z);
    prev.current.copy(current.current);
    current.current.lerp(next, 1 - Math.exp(-12 * delta));
    root.current.position.copy(current.current);
    root.current.rotation.y = target.yaw;

    const speed  = prev.current.distanceTo(current.current) / Math.max(delta, 0.001);
    const moving = speed > 0.15;
    phase.current += moving ? delta * 10 : delta * 1.5;

    const swing = moving ? Math.sin(phase.current) * 0.6 : 0;
    const bob   = moving
      ? Math.abs(Math.sin(phase.current)) * 0.06
      : Math.sin(phase.current) * 0.02;

    if (bodyRef.current)     bodyRef.current.position.y = bob;
    if (leftArmRef.current)  leftArmRef.current.rotation.x  =  swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current)  leftLegRef.current.rotation.x  = -swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x =  swing;
  });

  const a = appearance;

  return (
    <group ref={(g) => { (root as React.MutableRefObject<THREE.Group | null>).current = g; onRef?.(g); }}>
      <group ref={bodyRef}>

        {/* ── HEAD ── */}
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshStandardMaterial map={skinTex} roughness={0.6} />
        </mesh>

        {/* Hair — top block */}
        <mesh position={[0, 1.78, -0.02]}>
          <boxGeometry args={[0.38, 0.12, 0.4]} />
          <meshStandardMaterial map={hairTex} roughness={0.9} />
        </mesh>
        {/* Hair — back curtain */}
        <mesh position={[0, 1.68, -0.20]}>
          <boxGeometry args={[0.38, 0.25, 0.10]} />
          <meshStandardMaterial map={hairTex} roughness={0.9} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.08, 1.65, 0.18]}>
          <boxGeometry args={[0.06, 0.06, 0.02]} />
          <meshStandardMaterial color={a.eyeColor} />
        </mesh>
        <mesh position={[0.08, 1.65, 0.18]}>
          <boxGeometry args={[0.06, 0.06, 0.02]} />
          <meshStandardMaterial color={a.eyeColor} />
        </mesh>

        {/* ── TORSO ── */}
        <mesh position={[0, 1.20, 0]}>
          <boxGeometry args={[0.42, 0.55, 0.25]} />
          <meshStandardMaterial map={jacketTex} roughness={0.8} />
        </mesh>
        {/* Undershirt */}
        <mesh position={[0, 1.46, 0.10]}>
          <boxGeometry args={[0.15, 0.05, 0.15]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Belt */}
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[0.44, 0.06, 0.27]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Belt buckle */}
        <mesh position={[0, 0.92, 0.14]}>
          <boxGeometry args={[0.10, 0.08, 0.05]} />
          <meshStandardMaterial color={a.buckleColor} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* ── LEFT ARM ── */}
        <group position={[-0.28, 1.38, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.20, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial map={jacketTex} roughness={0.8} />
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.10, 0.10, 0.10]} />
              <meshStandardMaterial map={skinTex} />
            </mesh>
          </mesh>
        </group>

        {/* ── RIGHT ARM ── */}
        <group position={[0.28, 1.38, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.20, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial map={jacketTex} roughness={0.8} />
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.10, 0.10, 0.10]} />
              <meshStandardMaterial map={skinTex} />
            </mesh>
          </mesh>
        </group>

        {/* ── LEFT LEG ── */}
        <group position={[-0.12, 0.88, 0]}>
          <mesh ref={leftLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.08, 0.40, 4, 8]} />
            <meshStandardMaterial map={pantsTex} roughness={0.9} />
            {/* Shoe */}
            <mesh position={[0, -0.28, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
              <meshStandardMaterial color={a.shoeColor} roughness={0.4} />
            </mesh>
            {/* Sole */}
            <mesh position={[0, -0.34, 0.04]}>
              <boxGeometry args={[0.16, 0.04, 0.24]} />
              <meshStandardMaterial color={a.shoeAccent} roughness={0.2} />
            </mesh>
          </mesh>
        </group>

        {/* ── RIGHT LEG ── */}
        <group position={[0.12, 0.88, 0]}>
          <mesh ref={rightLegRef} position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.08, 0.40, 4, 8]} />
            <meshStandardMaterial map={pantsTex} roughness={0.9} />
            {/* Shoe */}
            <mesh position={[0, -0.28, 0.04]}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
              <meshStandardMaterial color={a.shoeColor} roughness={0.4} />
            </mesh>
            {/* Sole */}
            <mesh position={[0, -0.34, 0.04]}>
              <boxGeometry args={[0.16, 0.04, 0.24]} />
              <meshStandardMaterial color={a.shoeAccent} roughness={0.2} />
            </mesh>
          </mesh>
        </group>

      </group>
    </group>
  );
}
