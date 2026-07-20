import type {NextFunction,Request,Response} from 'express';
import {getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {config} from './config.js';

const firebaseApp=getApps()[0]||initializeApp({projectId:config.firebaseProjectId});

export async function requireFirebaseAuth(request:Request,response:Response,next:NextFunction){
 const token=getBearerToken(request.get('authorization'));
 if(!token)return response.status(401).json({error:'Authentication required'});
 try{
  response.locals.user=await getAuth(firebaseApp).verifyIdToken(token);
  next();
 }catch{
  response.status(401).json({error:'Invalid or expired authentication token'});
 }
}

export function getBearerToken(authorization?:string){return authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1]||null}
