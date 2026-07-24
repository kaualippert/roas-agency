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
import {canAccessClient,canAccessStateKey,filterState,filterStateValue,requireAgencyAccess,scopeStateWrite,type AccessContext} from './access.js';
import {invitationRouter} from './invitations.js';

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

  app.use('/api/access',requireFirebaseAuth);
  app.use('/api/access',(_request,response,next)=>{
    if(mongoose.connection.readyState!==1)return response.status(503).json({error:'MongoDB is not connected'});
    next();
  });
  app.use('/api/access',requireAgencyAccess);
  app.get('/api/access/me',(_request,response)=>{
    const access=response.locals.access as AccessContext;
    response.json({access:{
      uid:access.uid,
      email:access.email,
      member:access.member,
      isAdministrator:access.isAdministrator,
      accessAreas:access.accessAreas,
      clientIds:access.clientIds===null?null:[...access.clientIds],
    }});
  });

  app.use('/api/files',requireFirebaseAuth);
  app.use('/api/files',(_request,response,next)=>{
    if(mongoose.connection.readyState!==1)return response.status(503).json({error:'MongoDB is not connected'});
    next();
  });
  app.use('/api/files',requireAgencyAccess);
  app.post('/api/files/:clientId',express.raw({type:['application/pdf','image/jpeg','image/png','image/webp'],limit:'4mb'}),async(request,response,next)=>{
    try{
      if(!canAccessClient(response.locals.access as AccessContext,request.params.clientId))return response.status(403).json({error:'Você não possui acesso a este cliente.'});
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
      if(!canAccessClient(response.locals.access as AccessContext,String(file.metadata?.clientId||'')))return response.status(403).json({error:'Você não possui acesso a este cliente.'});
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
      const id=new ObjectId(request.params.fileId);
      const file=await mongoose.connection.db!.collection('client_files.files').findOne({_id:id});
      if(!file)return response.status(404).json({error:'Arquivo não encontrado.'});
      if(!canAccessClient(response.locals.access as AccessContext,String(file.metadata?.clientId||'')))return response.status(403).json({error:'Você não possui acesso a este cliente.'});
      await new GridFSBucket(mongoose.connection.db!,{bucketName:'client_files'}).delete(id);
      response.status(204).end();
    }catch(error){next(error)}
  });

  app.use(express.json({limit:'5mb'}));

  app.use('/api/invitations',(_request,response,next)=>{
    if(mongoose.connection.readyState!==1)return response.status(503).json({error:'MongoDB is not connected'});
    next();
  },invitationRouter());

  app.use('/api/state',requireFirebaseAuth);

  app.use('/api/state',(_request,response,next)=>{
    if(mongoose.connection.readyState!==1)return response.status(503).json({error:'MongoDB is not connected'});
    next();
  });
  app.use('/api/state',requireAgencyAccess);

  app.get('/api/state',async(_request,response,next)=>{
    try{response.json({state:filterState(response.locals.access as AccessContext,await allState())})}catch(error){next(error)}
  });

  app.put('/api/state',async(request,response,next)=>{
    try{
      if(!(response.locals.access as AccessContext).isAdministrator)return response.status(403).json({error:'Somente administradores podem substituir todos os dados.'});
      const {state}=bulkSchema.parse(request.body);
      response.json({state:await replaceAllState(state)});
    }catch(error){next(error)}
  });

  app.delete('/api/state',async(_request,response,next)=>{
    try{
      if(!(response.locals.access as AccessContext).isAdministrator)return response.status(403).json({error:'Somente administradores podem redefinir os dados.'});
      response.json({state:await replaceAllState({})});
    }catch(error){next(error)}
  });

  app.get('/api/state/:key',async(request,response,next)=>{
    try{
      if(!isAllowedKey(request.params.key))return response.status(404).json({error:'Unknown state key'});
      const access=response.locals.access as AccessContext;
      if(!canAccessStateKey(access,request.params.key))return response.status(403).json({error:'Você não possui acesso a esta área.'});
      const value=await getState(request.params.key);
      if(value===undefined)return response.status(404).json({error:'State not found'});
      response.json({value:filterStateValue(access,request.params.key,value)});
    }catch(error){next(error)}
  });

  app.put('/api/state/:key',async(request,response,next)=>{
    try{
      if(!isAllowedKey(request.params.key))return response.status(404).json({error:'Unknown state key'});
      const access=response.locals.access as AccessContext;
      if(!canAccessStateKey(access,request.params.key,true))return response.status(403).json({error:'Você não possui permissão para alterar esta área.'});
      const {value}=valueSchema.parse(request.body);
      const current=await getState(request.params.key);
      const saved=await replaceState(request.params.key,scopeStateWrite(access,request.params.key,value,current));
      response.json({value:filterStateValue(access,request.params.key,saved)});
    }catch(error){next(error)}
  });

  app.delete('/api/state/:key',async(request,response,next)=>{
    try{
      if(!isAllowedKey(request.params.key))return response.status(404).json({error:'Unknown state key'});
      if(!(response.locals.access as AccessContext).isAdministrator)return response.status(403).json({error:'Somente administradores podem excluir uma coleção inteira.'});
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
