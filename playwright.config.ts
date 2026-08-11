import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',
 fullyParallel:true,
 forbidOnly:Boolean(process.env.CI),
 retries:process.env.CI?2:0,
 workers:process.env.CI?1:undefined,
 reporter:process.env.CI?[['html',{open:'never'}],['list']]:'list',
 use:{
  baseURL:'http://127.0.0.1:4173',
  trace:'on-first-retry',
  screenshot:'only-on-failure',
  video:'retain-on-failure',
 },
 projects:[
  {name:'desktop-chromium',testIgnore:/mobile\.spec\.ts/,use:{...devices['Desktop Chrome']}},
  {name:'mobile-chromium',testMatch:/mobile\.spec\.ts/,use:{...devices['Pixel 7']}},
 ],
 webServer:{
  command:'node ./node_modules/vite/bin/vite.js apps/web --host 127.0.0.1 --port 4173',
  url:'http://127.0.0.1:4173',
  reuseExistingServer:!process.env.CI,
  timeout:120_000,
  env:{...process.env,VITE_E2E:'true',VITE_API_URL:'/api',VITE_APP_VERSION:'e2e-2026.08.04'},
 },
});
