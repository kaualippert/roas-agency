import mongoose from 'mongoose';
import {config} from './config.js';

let connectionPromise:Promise<typeof mongoose>|null=null;

export async function connectDatabase(){
  if(mongoose.connection.readyState===1)return mongoose;
  if(connectionPromise)return connectionPromise;
  connectionPromise=mongoose.connect(config.mongoUri(),{
    dbName:'roas_agency',
    serverSelectionTimeoutMS:8000,
    bufferCommands:false,
    maxPoolSize:10,
    minPoolSize:0,
  }).finally(()=>{connectionPromise=null});
  return connectionPromise;
}
