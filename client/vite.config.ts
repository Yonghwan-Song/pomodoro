import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), svgr(), tsconfigPaths()],
  server: {
    port: 3000,
    open: true,
    host: true, // 로컬 네트워크 외부 IP에서 접속을 허용합니다 (0.0.0.0)
  },
  build: {
    outDir: 'dist',
  },
});
