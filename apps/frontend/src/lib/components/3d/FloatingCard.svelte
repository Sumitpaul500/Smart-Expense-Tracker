<script lang="ts">
	/**
	 * FloatingCard — A decorative 3D credit-card mesh that bobs and tilts.
	 * Used as an ambient 3D decoration on the auth/landing pages.
	 */
	import { T, useTask } from '@threlte/core';

	let elapsed = $state(0);
	useTask((delta) => {
		elapsed += delta;
	});

	// Reactive transforms driven by sinusoidal animation
	const posY = $derived(Math.sin(elapsed * 0.8) * 0.25);
	const rotX = $derived(Math.sin(elapsed * 0.5) * 0.08);
	const rotY = $derived(elapsed * 0.15);
	const rotZ = $derived(Math.sin(elapsed * 0.6) * 0.04);
</script>

<T.Group position={[0, posY, 0]} rotation={[rotX, rotY, rotZ]}>
	<!-- Card body -->
	<T.Mesh castShadow>
		<T.BoxGeometry args={[3.4, 2.0, 0.06]} />
		<T.MeshStandardMaterial
			color="#0f1120"
			metalness={0.85}
			roughness={0.15}
			transparent={true}
			opacity={0.92}
		/>
	</T.Mesh>

	<!-- Primary stripe -->
	<T.Mesh position={[0, 0.45, 0.035]}>
		<T.PlaneGeometry args={[2.8, 0.04]} />
		<T.MeshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={3} />
	</T.Mesh>

	<!-- Chip outline -->
	<T.Mesh position={[-1.1, 0.3, 0.035]}>
		<T.BoxGeometry args={[0.44, 0.34, 0.01]} />
		<T.MeshStandardMaterial
			color="#f59e0b"
			emissive="#f59e0b"
			emissiveIntensity={0.4}
			metalness={0.9}
			roughness={0.1}
		/>
	</T.Mesh>

	<!-- Glow light above the card -->
	<T.PointLight position={[0, 1.2, 1]} color="#7c3aed" intensity={3} distance={5} decay={2} />
</T.Group>
