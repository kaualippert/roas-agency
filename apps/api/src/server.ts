import mongoose from 'mongoose';
import {config} from './config.js';
import {createApp} from './app.js';
import {connectDatabase} from './database.js';

const server=createApp().listen(config.port,'127.0.0.1',()=>{
  console.log(`ROAS API listening on http://127.0.0.1:${config.port}`);
});

void connectDatabase().then(()=>console.log('MongoDB Atlas connected')).catch(error=>{
  console.error('MongoDB Atlas unavailable.',error instanceof Error?error.message:error);
});

async function shutdown(){
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
