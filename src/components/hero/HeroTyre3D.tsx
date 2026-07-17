import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  rotationSpeed?: number;
  enableInteraction?: boolean;
  onFirstInteraction?: () => void;
};

/**
 * Procedural premium tyre + alloy wheel. No external GLB required.
 * Keeps polycount low, uses simple PBR materials for a photoreal-ish look.
 */
function TyreAssembly({
  rotationSpeed = 0.15,
  paused,
  onInteractStart,
}: {
  rotationSpeed: number;
  paused: boolean;
  onInteractStart: () => void;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!group.current || paused) return;
    group.current.rotation.y += dt * rotationSpeed;
  });

  const rubber = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0e0e0e", roughness: 0.85, metalness: 0.05 }),
    [],
  );
  const alloy = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a8f95", roughness: 0.28, metalness: 0.95 }),
    [],
  );
  const alloyDark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2a2d31", roughness: 0.5, metalness: 0.7 }),
    [],
  );

  // Tread pattern: subtle blocks around the circumference
  const treadBlocks = useMemo(() => {
    const arr: { rot: number }[] = [];
    const count = 48;
    for (let i = 0; i < count; i++) arr.push({ rot: (i / count) * Math.PI * 2 });
    return arr;
  }, []);

  const spokeCount = 5;

  return (
    <group
      ref={group}
      rotation={[0.15, -0.6, 0]}
      onPointerDown={onInteractStart}
    >
      {/* Sidewall / tyre body — torus rotated so axle is along Z */}
      <mesh material={rubber} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[1.15, 0.42, 32, 96]} />
      </mesh>
      {/* Inner sidewall darkening */}
      <mesh material={rubber} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.36, 24, 64]} />
      </mesh>

      {/* Tread blocks */}
      {treadBlocks.map((b, i) => (
        <mesh
          key={i}
          material={rubber}
          position={[Math.cos(b.rot) * 1.53, Math.sin(b.rot) * 1.53, 0]}
          rotation={[0, 0, b.rot + Math.PI / 2]}
        >
          <boxGeometry args={[0.08, 0.05, 0.62]} />
        </mesh>
      ))}

      {/* Rim outer lip */}
      <mesh material={alloy} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.06, 16, 64]} />
      </mesh>

      {/* Rim inner disc */}
      <mesh material={alloyDark} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.35, 64]} />
      </mesh>

      {/* Hub */}
      <mesh material={alloy} position={[0, 0, 0.19]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 32]} />
      </mesh>
      <mesh material={alloyDark} position={[0, 0, 0.24]}>
        <cylinderGeometry args={[0.09, 0.09, 0.04, 24]} />
      </mesh>

      {/* Spokes */}
      {Array.from({ length: spokeCount }).map((_, i) => {
        const a = (i / spokeCount) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, 0, a]} position={[0, 0, 0.14]}>
            <mesh material={alloy} position={[0.45, 0, 0]}>
              <boxGeometry args={[0.7, 0.22, 0.12]} />
            </mesh>
            <mesh material={alloy} position={[0.78, 0, 0]}>
              <boxGeometry args={[0.12, 0.16, 0.14]} />
            </mesh>
          </group>
        );
      })}

      {/* Lug nuts */}
      {Array.from({ length: spokeCount }).map((_, i) => {
        const a = (i / spokeCount) * Math.PI * 2 + Math.PI / spokeCount;
        return (
          <mesh
            key={`lug-${i}`}
            material={alloyDark}
            position={[Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0.22]}
          >
            <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function HeroTyre3D({
  rotationSpeed = 0.15,
  enableInteraction = true,
  onFirstInteraction,
}: Props) {
  const [paused, setPaused] = useState(false);

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      camera={{ position: [0, 0.2, 4.2], fov: 32 }}
      shadows
    >
      {/* Studio lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} color="#ffffff" />
      {/* Subtle orange rim light */}
      <pointLight position={[-3, 0.5, 1.5]} intensity={2.2} color="#F47A20" distance={9} decay={2} />

      <Suspense fallback={null}>
        <Environment preset="studio" />
        <TyreAssembly
          rotationSpeed={rotationSpeed}
          paused={paused}
          onInteractStart={() => {
            setPaused(true);
            onFirstInteraction?.();
          }}
        />
        <ContactShadows position={[0, -1.6, 0]} opacity={0.55} scale={6} blur={2.4} far={3} />
      </Suspense>

      {enableInteraction && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2 - 0.6}
          maxPolarAngle={Math.PI / 2 + 0.4}
          rotateSpeed={0.6}
          onStart={() => {
            setPaused(true);
            onFirstInteraction?.();
          }}
        />
      )}
    </Canvas>
  );
}
