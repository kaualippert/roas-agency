import type {Request,Response} from 'express';
import {createApp} from '../apps/api/src/app.js';
import {connectDatabase} from '../apps/api/src/database.js';

const app=createApp();

export function resolveApiUrl(params:Request['query']){
  const path=Array.isArray(params.path)?params.path.join('/'):String(params.path||'');
  const searchParams=new URLSearchParams();
  Object.entries(params).forEach(([key,value])=>{
    if(key==='path')return;
    if(Array.isArray(value))value.forEach(item=>searchParams.append(key,String(item)));
    else if(value!==undefined)searchParams.set(key,String(value));
  });
  return `/api/${path}${searchParams.size?`?${searchParams}`:''}`;
}

export default async function handler(request:Request,response:Response){
  request.url=resolveApiUrl(request.query);
  await connectDatabase().catch(error=>console.error('MongoDB connection failed',error instanceof Error?error.message:error));
  return app(request,response);
}
