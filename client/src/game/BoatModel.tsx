import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { Object3D, Mesh, Material } from "three";
import { MeshStandardMaterial } from "three";

const GLB_URL = "/boat.glb";

/**
 * Node name prefixes that belong to the boat / deck / rigging scene.
 * We exclude: Island_, Ocean_, Player_, PlayerSpawn_, Web_, Delivery_,
 * Fill_Light, Key_Sun, Ocenoid_Player_Rig, root, spine, neck, head,
 * upper_arm*, lower_arm*, thigh*, shin*.
 *
 * Everything else (Boat_, Hull_, Deck_, Mast_, Sail_, Anchor_, Barrel_,
 * Bow_, Bowsprit, Cargo_, Craft_, Crafting_, Gunwale_, Lantern*, Mast*,
 * Mooring_, Navigation_, Net_, Rack_, Rail*, Resource_, Rest_,
 * Rigging_, Stern_, Steering*, Starting_Boat_*, Tool*, Water_*,
 * Wheel_*, Workbench_*, Bedroll, Deck_Bench*, Deck_Seam*, Deck_Plank*,
 * Deck_Center_Walkway) is rendered.
 */
const EXCLUDE_PREFIXES = [
  "Island_", "Ocean_", "Player_", "PlayerSpawn_",
  "Delivery_", "Fill_Light", "Key_Sun",
  "Ocenoid_Player_Rig", "root", "spine", "neck", "head",
  "upper_arm", "lower_arm", "thigh", "shin",
  "BoatCollision_",
];

function shouldInclude(name: string): boolean {
  return !EXCLUDE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Clone a Three.js Object3D subtree keeping only nodes whose names pass the
 * include filter. Materials are kept as-is (the GLB bakes PBR base colours).
 */
function filterScene(scene: Object3D): Object3D {
  const clone = scene.clone(true);

  // Walk depth-first, detach excluded children
  const prune = (obj: Object3D) => {
    const toRemove: Object3D[] = [];
    for (const child of obj.children) {
      if (!shouldInclude(child.name)) {
        toRemove.push(child);
      } else {
        prune(child);
      }
    }
    for (const r of toRemove) obj.remove(r);
  };

  prune(clone);
  return clone;
}

/**
 * Renders the full GLB boat model, positioned so its centre sits at the
 * world origin where the procedural boat used to be.
 *
 * The GLB was exported from Blender in metres; the scene is at a sensible
 * scale already. Position / rotation props let the parent fine-tune
 * placement relative to the ocean plane.
 */
export function BoatModel({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  scale = 1,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const { scene } = useGLTF(GLB_URL);

  const boatScene = useMemo(() => filterScene(scene), [scene]);

  return (
    <primitive
      object={boatScene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

// Preload so the model is ready before the Canvas mounts
useGLTF.preload(GLB_URL);
