import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/ocenoid-character.glb";

type Target = { x: number; y: number; z: number; yaw: number };

export function OcenoidCharacter({ target }: { target: Target }) {
  const root = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const current = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const { scene, animations } = useGLTF(MODEL_PATH);
  const model = useMemo(() => scene.clone(true), [scene]);
  const actions = useMemo(() => {
    const map = new Map<string, THREE.AnimationAction>();
    const m = new THREE.AnimationMixer(model);
    mixer.current = m;
    for (const clip of animations) map.set(clip.name, m.clipAction(clip));
    return map;
  }, [animations, model]);

  useEffect(() => {
    const idle = actions.get("Ocenoid_Idle") ?? actions.get("Idle");
    idle?.reset().fadeIn(0.15).play();
    return () => {
      for (const action of actions.values()) action.stop();
      mixer.current?.stopAllAction();
    };
  }, [actions]);

  useFrame((_, delta) => {
    if (!root.current) return;
    const next = new THREE.Vector3(target.x, target.y, target.z);
    const moving = current.current.distanceTo(next) > 0.002;
    current.current.lerp(next, 1 - Math.exp(-12 * delta));
    root.current.position.copy(current.current);
    root.current.rotation.y = target.yaw;
    mixer.current?.update(delta);

    const idle = actions.get("Ocenoid_Idle") ?? actions.get("Idle");
    const walk = actions.get("Ocenoid_Walk") ?? actions.get("Walk");
    if (moving && walk && !walk.isRunning()) {
      idle?.fadeOut(0.15);
      walk.reset().fadeIn(0.15).play();
    } else if (!moving && idle && !idle.isRunning()) {
      walk?.fadeOut(0.15);
      idle.reset().fadeIn(0.15).play();
    }
  });

  return <group ref={root}><primitive object={model} /></group>;
}

useGLTF.preload(MODEL_PATH);
