<script lang="ts">
	/**
	 * CashFlowScene — Threlte 3D scene for category allocation.
	 *
	 * Renders an animated architectural bar visualization of expense categories:
	 * - Soft directional and key lighting
	 * - Subtle sine wave height oscillation
	 * - Smooth auto-rotating OrbitControls
	 * - Precision slate grid ground plane
	 */
	import { T, useTask } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';

	const categories = [
		{ label: 'Food', baseHeight: 2.8, color: '#2563eb', x: -3.75 },
		{ label: 'Shopping', baseHeight: 4.0, color: '#0284c7', x: -2.25 },
		{ label: 'Transport', baseHeight: 1.6, color: '#4f46e5', x: -0.75 },
		{ label: 'Housing', baseHeight: 4.5, color: '#06b6d4', x: 0.75 },
		{ label: 'Health', baseHeight: 2.1, color: '#10b981', x: 2.25 },
		{ label: 'Entertainment', baseHeight: 1.9, color: '#f59e0b', x: 3.75 },
	] as const;

	// Animation clock
	let elapsed = $state(0);

	useTask((delta) => {
		elapsed += delta;
	});

	// Reactive height per category (Svelte 5 rune)
	const heights = $derived(
		categories.map((cat, i) => cat.baseHeight + Math.sin(elapsed * 0.5 + i * 1.0) * 0.12)
	);
</script>

<!-- Camera -->
<T.PerspectiveCamera makeDefault position={[0, 5, 13]} fov={46} />

<!-- Auto-rotating controls — user can also drag -->
<OrbitControls
	enableZoom={false}
	enablePan={false}
	autoRotate={true}
	autoRotateSpeed={0.5}
	maxPolarAngle={Math.PI / 2.1}
	minPolarAngle={Math.PI / 5}
/>

<!-- Ambient & directional lighting -->
<T.AmbientLight intensity={0.35} />
<T.DirectionalLight position={[5, 12, 6]} intensity={0.9} color="#ffffff" />
<T.DirectionalLight position={[-4, 8, -4]} intensity={0.3} color="#94a3b8" />

<!-- Soft back fill light -->
<T.PointLight position={[0, 6, -5]} intensity={2.5} color="#3b82f6" distance={18} decay={2} />

<!-- Category bars -->
{#each categories as cat, i}
	{@const h = heights[i]}
	<T.Group position={[cat.x, 0, 0]}>
		<!-- Main bar: unit-height cylinder scaled on Y axis -->
		<T.Mesh position={[0, h / 2, 0]} scale={[1, h, 1]} castShadow>
			<T.CylinderGeometry args={[0.3, 0.3, 1, 32]} />
			<T.MeshStandardMaterial
				color={cat.color}
				emissive={cat.color}
				emissiveIntensity={0.12}
				metalness={0.2}
				roughness={0.35}
				transparent={true}
				opacity={0.95}
			/>
		</T.Mesh>

		<!-- Top cap disc -->
		<T.Mesh position={[0, h + 0.04, 0]}>
			<T.CylinderGeometry args={[0.32, 0.32, 0.08, 32]} />
			<T.MeshStandardMaterial
				color={cat.color}
				emissive={cat.color}
				emissiveIntensity={0.35}
				metalness={0.4}
				roughness={0.2}
			/>
		</T.Mesh>

		<!-- Base collar disc -->
		<T.Mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
			<T.CircleGeometry args={[0.48, 32]} />
			<T.MeshStandardMaterial
				color={cat.color}
				emissive={cat.color}
				emissiveIntensity={0.2}
				transparent={true}
				opacity={0.18}
			/>
		</T.Mesh>
	</T.Group>
{/each}

<!-- Ground grid using Three.js GridHelper -->
<T.GridHelper
	args={[26, 26, new THREE.Color('#242b3d'), new THREE.Color('#131722')]}
	position={[0, 0, 0]}
/>
