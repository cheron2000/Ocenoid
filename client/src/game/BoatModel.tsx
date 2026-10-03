import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- Procedural Texture Generators ---

function mkWoodTexture(baseColor = "#6b4c3a", accentColor = "#4a3020"): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  for(let i = 0; i < size; i += 32) {
    ctx.fillRect(0, i, size, 2);
  }
  
  const seed = parseInt(baseColor.replace("#", "0x"), 16) || 12345;
  let s = seed;
  for (let i = 0; i < 30000; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const px = ((s >>> 16) & 0x1ff);
    const py = ((s >>> 8)  & 0x1ff);
    const bright = (s & 1) ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
    ctx.fillStyle = bright;
    ctx.fillRect(px, py, 16, 1); 
  }
  
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

function mkSailTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  
  ctx.fillStyle = "#fcf9f2";
  ctx.fillRect(0, 0, size, size);
  
  let s = 9999;
  for (let i = 0; i < 20000; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const px = ((s >>> 16) & 0xff);
    const py = ((s >>> 8)  & 0xff);
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    ctx.fillRect(px, py, 2, 2); 
  }
  
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for(let i = 0; i < size; i += 64) {
    ctx.fillRect(i, 0, 1, size);
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

// Custom curved path for the boat's top railing
class BoatRailingCurve extends THREE.Curve<THREE.Vector3> {
  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    const angle = 2 * Math.PI * t;
    // X radius = 5.8, Z radius = 14
    return optionalTarget.set(5.8 * Math.cos(angle), 0, 14 * Math.sin(angle));
  }
}

// --- Boat Component ---

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

  // Generate textures once
  const woodDarkTex = useMemo(() => mkWoodTexture("#4f3322", "#2e1c10"), []);
  const woodLightTex = useMemo(() => mkWoodTexture("#9c7255", "#6b4c3a"), []);
  const sailTex = useMemo(() => mkSailTexture(), []);
  
  // Railing path
  const railingPath = useMemo(() => new BoatRailingCurve(), []);
  
  // Spoke positions for the railing
  const spokes = useMemo(() => {
    return Array.from({ length: 32 }).map((_, i) => {
      const angle = (i / 32) * Math.PI * 2;
      return [5.8 * Math.cos(angle), 1.9, 14 * Math.sin(angle)] as [number, number, number];
    });
  }, []);

  useFrame((state) => {
    if (!boatRef.current) return;
    const t = state.clock.elapsedTime;
    boatRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.08;
    boatRef.current.rotation.z = Math.sin(t * 0.5) * 0.01;
    boatRef.current.rotation.x = Math.sin(t * 0.3) * 0.015;
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group ref={boatRef}>
        
        {/* --- HULL (Smooth, curved hemisphere) --- */}
        {/* thetaStart = Math.PI/2 makes a flat top bowl shape */}
        <mesh position={[0, 1.45, 0]} scale={[5.8, 3.5, 14]}>
          <sphereGeometry args={[1, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>

        {/* --- DECK (Elliptical floor exactly matching the hull opening) --- */}
        <mesh position={[0, 1.45, 0]} scale={[5.8, 1, 14]}>
          <cylinderGeometry args={[1, 1, 0.1, 64]} />
          <meshStandardMaterial map={woodLightTex} />
        </mesh>

        {/* --- CURVED RAILING AROUND THE DECK --- */}
        <mesh position={[0, 2.3, 0]}>
          <tubeGeometry args={[railingPath, 64, 0.15, 8, true]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>
        
        {/* Vertical wooden posts supporting the railing */}
        {spokes.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <cylinderGeometry args={[0.06, 0.06, 0.9]} />
            <meshStandardMaterial map={woodDarkTex} />
          </mesh>
        ))}

        {/* --- MASTS --- */}
        {/* Foremast (Front) */}
        <mesh position={[0, 6.75, -8]}>
          <cylinderGeometry args={[0.2, 0.35, 10.5, 16]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>
        {/* Foremast Sails */}
        {/* We curve the sails slightly by making them cylinder slices */}
        <mesh position={[0, 4.5, -7.8]} rotation={[0, -0.1, 0]}>
          <cylinderGeometry args={[4.5, 4.5, 4, 32, 1, false, -0.5, 1.0]} />
          <meshStandardMaterial map={sailTex} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 8.5, -7.85]} rotation={[0, -0.15, 0]}>
          <cylinderGeometry args={[3, 3, 3, 32, 1, false, -0.5, 1.0]} />
          <meshStandardMaterial map={sailTex} side={THREE.DoubleSide} />
        </mesh>

        {/* Mainmast (Center) */}
        <mesh position={[0, 8.25, 0]}>
          <cylinderGeometry args={[0.25, 0.45, 13.5, 16]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>
        {/* Mainmast Sails */}
        <mesh position={[0, 5.0, 0.2]} rotation={[0, -0.1, 0]}>
          <cylinderGeometry args={[5.5, 5.5, 4.5, 32, 1, false, -0.5, 1.0]} />
          <meshStandardMaterial map={sailTex} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 9.5, 0.15]} rotation={[0, -0.15, 0]}>
          <cylinderGeometry args={[4, 4, 3.5, 32, 1, false, -0.5, 1.0]} />
          <meshStandardMaterial map={sailTex} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 13.0, 0.1]} rotation={[0, -0.2, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 2.5, 32, 1, false, -0.5, 1.0]} />
          <meshStandardMaterial map={sailTex} side={THREE.DoubleSide} />
        </mesh>

        {/* Mizzenmast (Back) */}
        <mesh position={[0, 5.75, 8]}>
          <cylinderGeometry args={[0.15, 0.25, 8.5, 16]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>
        {/* Mizzenmast Sail */}
        <mesh position={[0, 6.0, 8.1]} rotation={[0, -0.1, 0]}>
          <cylinderGeometry args={[3.5, 3.5, 4, 32, 1, false, -0.5, 1.0]} />
          <meshStandardMaterial map={sailTex} side={THREE.DoubleSide} />
        </mesh>

        {/* --- DETAILS --- */}
        {/* Bowsprit (Pole pointing front) */}
        <mesh position={[0, 2.0, -14]} rotation={[Math.PI / 2 + 0.3, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.2, 8, 8]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>

        {/* Captain's Wheel Pedestal */}
        <mesh position={[0, 2.0, 11]}>
          <cylinderGeometry args={[0.3, 0.4, 1.0, 8]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>
        {/* Wheel */}
        <mesh position={[0, 2.5, 10.8]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.08, 8, 16]} />
          <meshStandardMaterial map={woodDarkTex} />
        </mesh>
        
      </group>
    </group>
  );
}
