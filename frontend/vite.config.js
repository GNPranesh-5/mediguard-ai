import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config: the React plugin enables JSX + fast refresh.
export default defineConfig({ plugins: [react()] });
