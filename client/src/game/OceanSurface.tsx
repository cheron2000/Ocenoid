import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Vertex shader ────────────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  uniform float uTime;

  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying float vWaveCrest;

  void main() {
    vec3 pos = position;

    // Two sine-wave octaves in world XZ
    float wave1 = sin(pos.x * 0.35 + uTime * 1.1) * cos(pos.z * 0.28 + uTime * 0.8) * 0.22;
    float wave2 = sin(pos.x * 0.72 + uTime * 1.7 + 1.3) * cos(pos.z * 0.55 + uTime * 1.3) * 0.10;
    float wave3 = sin(pos.x * 1.40 + uTime * 2.2 + 2.7) * cos(pos.z * 1.10 + uTime * 1.9) * 0.04;

    pos.y += wave1 + wave2 + wave3;

    // Approx normal via finite differences (offset 0.1 m)
    float dxW = cos(pos.x * 0.35 + uTime * 1.1) * cos(pos.z * 0.28 + uTime * 0.8) * 0.35 * 0.22
              + cos(pos.x * 0.72 + uTime * 1.7 + 1.3) * cos(pos.z * 0.55 + uTime * 1.3) * 0.72 * 0.10
              + cos(pos.x * 1.40 + uTime * 2.2 + 2.7) * cos(pos.z * 1.10 + uTime * 1.9) * 1.40 * 0.04;
    float dzW = sin(pos.x * 0.35 + uTime * 1.1) * (-sin(pos.z * 0.28 + uTime * 0.8)) * 0.28 * 0.22
              + sin(pos.x * 0.72 + uTime * 1.7 + 1.3) * (-sin(pos.z * 0.55 + uTime * 1.3)) * 0.55 * 0.10
              + sin(pos.x * 1.40 + uTime * 2.2 + 2.7) * (-sin(pos.z * 1.10 + uTime * 1.9)) * 1.10 * 0.04;

    vNormal    = normalize(vec3(-dxW, 1.0, -dzW));
    vWaveCrest = clamp((wave1 + wave2 + wave3 + 0.33) / 0.66, 0.0, 1.0);
    vWorldPos  = (modelMatrix * vec4(pos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// ─── Fragment shader ──────────────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  uniform vec3  uCameraPos;

  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying float vWaveCrest;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);

    // Fresnel rim (more opaque at glancing angles)
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);

    // Base deep-ocean colour
    vec3 deepColor    = vec3(0.02, 0.12, 0.20);
    vec3 shallowColor = vec3(0.05, 0.28, 0.38);
    vec3 baseColor    = mix(deepColor, shallowColor, fresnel * 0.6);

    // Foam / crest highlight
    vec3  foamColor = vec3(0.88, 0.94, 0.98);
    float foam      = smoothstep(0.72, 0.92, vWaveCrest);
    baseColor       = mix(baseColor, foamColor, foam * 0.55);

    // Specular highlight from a sun direction
    vec3  sunDir  = normalize(vec3(0.6, 0.9, 0.4));
    float spec    = pow(max(dot(reflect(-sunDir, N), V), 0.0), 80.0) * 0.65;
    baseColor    += vec3(spec);

    // Slight fresnel rim brightening
    baseColor += vec3(0.12, 0.18, 0.22) * fresnel;

    gl_FragColor = vec4(baseColor, 0.88);
  }
`;

/**
 * Animated ocean surface — 200×200 units, 128×128 vertex grid.
 * Wave displacement runs on the GPU; no JS per-frame computation.
 * The material is semi-transparent so objects below the waterline show through.
 */
export function OceanSurface() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock, camera }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value      = clock.getElapsedTime();
    matRef.current.uniforms.uCameraPos.value = camera.position;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      {/* 200×200 m plane, 128 segments each axis for smooth waves */}
      <planeGeometry args={[200, 200, 128, 128]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime:      { value: 0 },
          uCameraPos: { value: new THREE.Vector3() },
        }}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
