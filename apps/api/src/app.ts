import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {pinoHttp} from 'pino-http';
import mongoose from 'mongoose';
import {GridFSBucket,ObjectId} from 'mongodb';
import {z} from 'zod';
import {config} from './config.js';
import {allState,deleteState,getState,isAllowedKey,replaceAllState,replaceState} from './state.js';
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
  app.use(pinoHttp());

  app.get('/api/health',(_request,response)=>response.json({
    ok:true,
    service:'roas-agency-api',
    database:mongoose.connection.readyState===1?'connected':'disconnected',
    timestamp:new Date().toISOString(),
  }));

  app.use('/api/files',requireFirebaseAuth);
  app.use('/api/files',(_request,response,next)=>{
    if(mongoose.connection.readyState!==1)return response.status(503).json({error:'MongoDB is not connected'});
    next();
  });
  app.post('/api/files/:clientId',express.raw({type:['application/pdf','image/jpeg','image/png','image/webp'],limit:'4mb'}),async(request,response,next)=>{
    try{
      const mimeType=String(request.query.type||request.get('content-type')||'');
      const allowed=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
      if(!allowed.has(mimeType))return response.status(415).json({error:'Envie um arquivo PDF, JPG, PNG ou WebP.'});
      if(!Buffer.isBuffer(request.body)||!request.body.length)return response.status(400).json({error:'O arquivo está vazio.'});
      const originalName=String(request.query.name||'arquivo').slice(0,180).replace(/[\r\n]/g,'');
      const bucket=new GridFSBucket(mongoose.connection.db!,{bucketName:'client_files'});
      const upload=bucket.openUploadStream(originalName,{contentType:mimeType,metadata:{clientId:request.params.clientId}});
      upload.end(request.body);
      await new Promise<void>((resolve,reject)=>{upload.once('finish',()=>resolve());upload.once('error',reject)});
      response.status(201).json({fileId:String(upload.id),name:originalName,mimeType,size:request.body.length});
    }catch(error){next(error)}
  });
  app.get('/api/files/:fileId',async(request,response,next)=>{
    try{
      if(!ObjectId.isValid(request.params.fileId))return response.status(404).json({error:'Arquivo não encontrado.'});
      const bucket=new GridFSBucket(mongoose.connection.db!,{bucketName:'client_files'}),id=new ObjectId(request.params.fileId);
      const file=await mongoose.connection.db!.collection('client_files.files').findOne({_id:id});
      if(!file)return response.status(404).json({error:'Arquivo não encontrado.'});
      response.setHeader('content-type',file.contentType||'application/octet-stream');
      response.setHeader('content-length',String(file.length));
      response.setHeader('content-disposition',`inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
      response.setHeader('x-file-name',encodeURIComponent(file.filename));
      bucket.openDownloadStream(id).on('error',next).pipe(response);
    }catch(error){next(error)}
  });
  app.delete('/api/files/:fileId',async(request,response,next)=>{
    try{
      if(!ObjectId.isValid(request.params.fileId))return response.status(404).json({error:'Arquivo não encontrado.'});
      await new GridFSBucket(mongoose.connection.db!,{bucketName:'client_files'}).delete(new ObjectId(request.params.fileId));
      response.status(204).end();
    }catch(error){next(error)}
  });

  app.use(express.json({limit:'5mb'}));

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
      const value=await getState(request.params.key);
      if(value===undefined)return response.status(404).json({error:'State not found'});
      response.json({value});
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
