import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRef } from "react";

export function ThirdPersonCamera({ target }: { target: THREE.Object3D | null }) {
  const { camera } = useThree();
  const position = useRef(new THREE.Vector3(0, 5, 8));
  const lookAt = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!target) return;
    const desired = new THREE.Vector3(0, 4.2, 7.5).applyQuaternion(target.quaternion).add(target.position);
    position.current.lerp(desired, 1 - Math.exp(-7 * delta));
    camera.position.copy(position.current);
    lookAt.current.lerp(new THREE.Vector3(target.position.x, target.position.y + 1.1, target.position.z), 1 - Math.exp(-10 * delta));
    camera.lookAt(lookAt.current);
  });

  return null;
}
