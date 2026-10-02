import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({mode})=>({
  base: process.env.GITHUB_REPOSITORY ? (process.env.GITHUB_REPOSITORY.split('/')[1].endsWith('.github.io') ? '/' : `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`) : '/',
  plugins:[react()],
  build:{assetsDir:''},
  resolve:{alias:{'@':path.resolve(import.meta.dirname)}},
}));
