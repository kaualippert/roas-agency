import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {pinoHttp} from 'pino-http';
import mongoose from 'mongoose';
import {z} from 'zod';
import {config} from './config.js';
import {allState,deleteState,isAllowedKey,replaceAllState,replaceState,State} from './state.js';
import {requireFirebaseAuth} from './auth.js';

const valueSchema=z.object({value:z.unknown()});
const bulkSchema=z.object({state:z.record(z.unknown())});

export function createApp(){
  const app=express();
  app.use(helmet());
  app.use((request,response,next)=>{
    const origin=request.get('origin');
    let sameHost=false;
    try{sameHost=Boolean(origin&&new URL(origin).host===request.get('host'))}catch{sameHost=false}
    const allowed=!origin||sameHost||config.corsOrigins.includes(origin);
    cors({origin:allowed?origin||false:false})(request,response,next);
  });
  app.use(express.json({limit:'5mb'}));
  app.use(pinoHttp());

  app.get('/api/health',(_request,response)=>response.json({
    ok:true,
    service:'roas-agency-api',
    database:mongoose.connection.readyState===1?'connected':'disconnected',
    timestamp:new Date().toISOString(),
  }));

  app.use('/api/state',requireFirebaseAuth);

  app.use('/api/state',(_request,response,next)=>{
    if(mongoose.connection.readyState!==1)return response.status(503).json({error:'MongoDB is not connected'});
    next();
  });

  app.get('/api/state',async(_request,response,next)=>{
    try{response.json({state:await allState()})}catch(error){next(error)}
  });

  app.put('/api/state',async(request,response,next)=>{
    try{
      const {state}=bulkSchema.parse(request.body);
      response.json({state:await replaceAllState(state)});
    }catch(error){next(error)}
  });

  app.delete('/api/state',async(_request,response,next)=>{
    try{response.json({state:await replaceAllState({})})}catch(error){next(error)}
  });

  app.get('/api/state/:key',async(request,response,next)=>{
    try{
      if(!isAllowedKey(request.params.key))return response.status(404).json({error:'Unknown state key'});
      const document=await State.findOne({key:request.params.key}).lean();
      if(!document)return response.status(404).json({error:'State not found'});
      response.json({value:document.value});
    }catch(error){next(error)}
  });

  app.put('/api/state/:key',async(request,response,next)=>{
    try{
      if(!isAllowedKey(request.params.key))return response.status(404).json({error:'Unknown state key'});
      const {value}=valueSchema.parse(request.body);
      response.json({value:await replaceState(request.params.key,value)});
    }catch(error){next(error)}
  });

  app.delete('/api/state/:key',async(request,response,next)=>{
    try{
      if(!isAllowedKey(request.params.key))return response.status(404).json({error:'Unknown state key'});
      await deleteState(request.params.key);
      response.status(204).end();
    }catch(error){next(error)}
  });

  app.use((_request,response)=>response.status(404).json({error:'Route not found'}));
  app.use((error:unknown,_request:express.Request,response:express.Response,_next:express.NextFunction)=>{
    const message=error instanceof z.ZodError?'Invalid request body':error instanceof Error?error.message:'Internal server error';
    response.status(error instanceof z.ZodError?400:500).json({error:message});
  });
  return app;
}
