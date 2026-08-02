import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	// @ts-ignore - Monorepo vite version conflict
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5173,
	},
});
