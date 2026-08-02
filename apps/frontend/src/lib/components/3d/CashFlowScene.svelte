<script lang="ts">
	/**
	 * CashFlowScene — Threlte 3D scene replacing the React Three Fiber placeholder.
	 *
	 * Renders an animated bar chart of expense categories in 3D with:
	 * - Per-category glowing point lights
	 * - Sine-wave height animation via useTask
	 * - Auto-rotating OrbitControls
	 * - Three.js GridHelper ground plane
	 */
	import { T, useTask } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import * as THREE from 'three';

	const categories = [
		{ label: 'Food', baseHeight: 2.8, color: '#7c3aed', x: -3.75 },
		{ label: 'Shopping', baseHeight: 4.0, color: '#8b5cf6', x: -2.25 },
		{ label: 'Transport', baseHeight: 1.6, color: '#6366f1', x: -0.75 },
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
		categories.map((cat, i) => cat.baseHeight + Math.sin(elapsed * 0.7 + i * 1.1) * 0.22)
	);
</script>

<!-- Camera -->
<T.PerspectiveCamera makeDefault position={[0, 6, 14]} fov={48} />

<!-- Auto-rotating controls — user can also drag -->
<OrbitControls
	enableZoom={false}
	enablePan={false}
	autoRotate={true}
	autoRotateSpeed={0.7}
	maxPolarAngle={Math.PI / 2.05}
	minPolarAngle={Math.PI / 6}
/>

<!-- Ambient & directional lighting -->
<T.AmbientLight intensity={0.12} />
<T.DirectionalLight position={[6, 14, 6]} intensity={0.7} color="#ffffff" />

<!-- Background purple glow from behind the bars -->
<T.PointLight position={[0, 8, -6]} intensity={12} color="#7c3aed" distance={22} decay={2} />

<!-- Category bars -->
{#each categories as cat, i}
	{@const h = heights[i]}
	<T.Group position={[cat.x, 0, 0]}>
		<!-- Per-bar glow light that tracks the animated height -->
		<T.PointLight
			position={[0, h + 0.6, 0]}
			color={cat.color}
			intensity={4}
			distance={5}
			decay={2}
		/>

		<!-- Main bar: unit-height cylinder scaled on Y axis -->
		<T.Mesh position={[0, h / 2, 0]} scale={[1, h, 1]} castShadow>
			<T.CylinderGeometry args={[0.32, 0.32, 1, 32]} />
			<T.MeshStandardMaterial
				color={cat.color}
				emissive={cat.color}
				emissiveIntensity={0.28}
				metalness={0.3}
				roughness={0.4}
				transparent={true}
				opacity={0.96}
			/>
		</T.Mesh>

		<!-- Bright glowing top cap sphere -->
		<T.Mesh position={[0, h + 0.08, 0]}>
			<T.SphereGeometry args={[0.2, 20, 20]} />
			<T.MeshStandardMaterial
				color={cat.color}
				emissive={cat.color}
				emissiveIntensity={2.0}
				metalness={0.6}
				roughness={0.05}
			/>
		</T.Mesh>

		<!-- Base halo disc -->
		<T.Mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
			<T.CircleGeometry args={[0.55, 32]} />
			<T.MeshStandardMaterial
				color={cat.color}
				emissive={cat.color}
				emissiveIntensity={0.4}
				transparent={true}
				opacity={0.25}
			/>
		</T.Mesh>
	</T.Group>
{/each}

<!-- Ground grid using Three.js GridHelper -->
<T.GridHelper
	args={[30, 30, new THREE.Color('#2d3460'), new THREE.Color('#1a1f3a')]}
	position={[0, 0, 0]}
/>
