import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://127.0.0.1:8081' }, fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/storage/**', '**/backend/**'] }, watch: { usePolling: true, interval: 500, ignored: ['**/storage/**'] } } });
