import mongoose from 'mongoose';
import {config} from './config.js';
import {createApp} from './app.js';

const server=createApp().listen(config.port,'127.0.0.1',()=>{
  console.log(`ROAS API listening on http://127.0.0.1:${config.port}`);
});

async function connectDatabase(){
  if(mongoose.connection.readyState!==0)return;
  try{
    await mongoose.connect(config.mongoUri,{dbName:'roas_agency',serverSelectionTimeoutMS:8000,bufferCommands:false});
    console.log('MongoDB Atlas connected');
  }catch(error){
    console.error('MongoDB Atlas unavailable; retrying in 30 seconds.',error instanceof Error?error.message:error);
    await mongoose.disconnect().catch(()=>undefined);
    setTimeout(connectDatabase,30_000);
  }
}
void connectDatabase();

async function shutdown(){
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
