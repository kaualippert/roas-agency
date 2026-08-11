import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const appVersion=process.env.VITE_APP_VERSION||(process.env.VERCEL_ENV==='production'?process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,8):'')||'';

export default defineConfig({
 plugins:[react(),tailwindcss()],
 define:{__APP_VERSION__:JSON.stringify(appVersion)},
});
