<script lang="ts">
	/**
	 * FloatingCard — A decorative 3D credit-card mesh that tilts smoothly.
	 */
	import { T, useTask } from '@threlte/core';

	let elapsed = $state(0);
	useTask((delta) => {
		elapsed += delta;
	});

	// Reactive transforms driven by sinusoidal animation
	const posY = $derived(Math.sin(elapsed * 0.6) * 0.15);
	const rotX = $derived(Math.sin(elapsed * 0.4) * 0.05);
	const rotY = $derived(elapsed * 0.1);
	const rotZ = $derived(Math.sin(elapsed * 0.5) * 0.03);
</script>

<T.Group position={[0, posY, 0]} rotation={[rotX, rotY, rotZ]}>
	<!-- Card body -->
	<T.Mesh castShadow>
		<T.BoxGeometry args={[3.4, 2.0, 0.06]} />
		<T.MeshStandardMaterial
			color="#0f121a"
			metalness={0.7}
			roughness={0.25}
			transparent={true}
			opacity={0.96}
		/>
	</T.Mesh>

	<!-- Primary stripe -->
	<T.Mesh position={[0, 0.45, 0.035]}>
		<T.PlaneGeometry args={[2.8, 0.04]} />
		<T.MeshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.8} />
	</T.Mesh>

	<!-- Chip outline -->
	<T.Mesh position={[-1.1, 0.3, 0.035]}>
		<T.BoxGeometry args={[0.44, 0.34, 0.01]} />
		<T.MeshStandardMaterial
			color="#d97706"
			emissive="#d97706"
			emissiveIntensity={0.2}
			metalness={0.8}
			roughness={0.2}
		/>
	</T.Mesh>
</T.Group>
