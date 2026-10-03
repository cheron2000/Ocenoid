/*
 * SailingShipModel — loads sailingship.glb.
 * Fixed from the original gltfjsx output to use correct drei/fiber types.
 */

import { useGLTF } from "@react-three/drei";
import type * as THREE from "three";

export function SailingShip(props: React.ComponentProps<"group"> & { ref?: React.Ref<THREE.Group> }) {
  const { scene } = useGLTF("/sailingship.glb");
  return <primitive object={scene} {...props} />;
}

useGLTF.preload("/sailingship.glb");
