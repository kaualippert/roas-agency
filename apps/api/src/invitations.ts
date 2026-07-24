import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {Router} from 'express';
import type {Request,Response} from 'express';
import type {DecodedIdToken} from 'firebase-admin/auth';
import {z} from 'zod';
import type {AccessContext} from './access.js';
import {requireAgencyAccess} from './access.js';
import {config} from './config.js';
import {requireFirebaseAuth} from './auth.js';
import {getState,replaceState} from './state.js';

type InvitationStatus='pending'|'accepted'|'expired'|'revoked';
interface Invitation{
 id:string;
 email:string;
 name:string;
 roles:string[];
 accessAreas:string[];
 clientIds:string[];
 department:string;
 status:InvitationStatus;
 tokenHash:string;
 invitedByUid:string;
 acceptedByUid?:string;
 expiresAt:string;
 createdAt:string;
 updatedAt:string;
 acceptedAt?:string;
}
interface Member{
 id:string;
 name:string;
 email:string;
 firebaseUid?:string;
 role:string;
 roles:string[];
 accessAreas:string[];
 clientIds:string[];
 department:string;
 status:string;
 color:string;
 createdAt:string;
 updatedAt:string;
}

const invitationSchema=z.object({
 email:z.string().trim().email(),
 name:z.string().trim().min(2).max(100),
 roles:z.array(z.string().trim().min(1).max(60)).min(1).max(8),
 accessAreas:z.array(z.enum(['general','marketing','finance','settings'])).min(1).max(4),
 clientIds:z.array(z.string().min(1).max(100)).max(500).default([]),
 department:z.string().trim().min(1).max(60),
});
const acceptSchema=z.object({token:z.string().min(32).max(200)});
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const normalizeEmail=(email:string)=>email.trim().toLowerCase();
const invitationList=async()=>{const value=await getState('team_invitations');return Array.isArray(value)?value as Invitation[]:[]};
const memberList=async()=>{const value=await getState('team');return Array.isArray(value)?value as Member[]:[]};
const publicInvitation=({tokenHash:_,...invitation}:Invitation)=>invitation;
const issueToken=()=>{const token=randomBytes(32).toString('base64url');return {token,tokenHash:hash(token)}};
const invitationUrl=(request:Request,token:string)=>`${String(request.get('origin')||config.appOrigin).replace(/\/$/,'')}/accept-invite?token=${encodeURIComponent(token)}`;
const activePending=(invitation:Invitation)=>invitation.status==='pending'&&new Date(invitation.expiresAt).getTime()>Date.now();
const requireAdmin=(response:Response)=>{
 const access=response.locals.access as AccessContext;
 if(!access.isAdministrator){response.status(403).json({error:'Somente administradores podem gerenciar convites.'});return false}
 return true;
};

export function invitationRouter(){
 const router=Router();
 router.use(requireFirebaseAuth);

 router.post('/accept',async(request,response,next)=>{
  try{
   const {token}=acceptSchema.parse(request.body);
   const user=response.locals.user as DecodedIdToken;
   const email=normalizeEmail(String(user.email||''));
   if(!email||user.email_verified!==true)return response.status(403).json({error:'Confirme seu e-mail no Firebase antes de aceitar o convite.'});
   const invitations=await invitationList();
   const index=invitations.findIndex(invitation=>invitation.tokenHash===hash(token));
   if(index<0)return response.status(404).json({error:'Convite inválido ou substituído por um novo link.'});
   const invitation=invitations[index];
   if(invitation.status!=='pending')return response.status(409).json({error:'Este convite já foi utilizado ou cancelado.'});
   if(new Date(invitation.expiresAt).getTime()<=Date.now()){
    invitations[index]={...invitation,status:'expired',updatedAt:new Date().toISOString()};
    await replaceState('team_invitations',invitations);
    return response.status(410).json({error:'Este convite expirou. Solicite um novo envio.'});
   }
   if(normalizeEmail(invitation.email)!==email)return response.status(403).json({error:'Entre com o mesmo e-mail que recebeu o convite.'});
   const now=new Date().toISOString();
   const members=await memberList();
   const existingIndex=members.findIndex(member=>normalizeEmail(member.email)===email);
   const member:Member={
    id:existingIndex>=0?members[existingIndex].id:randomUUID(),
    name:invitation.name,
    email,
    firebaseUid:user.uid,
    role:invitation.roles[0],
    roles:invitation.roles,
    accessAreas:invitation.accessAreas,
    clientIds:invitation.clientIds,
    department:invitation.department,
    status:'active',
    color:existingIndex>=0?members[existingIndex].color:'#5b36f2',
    createdAt:existingIndex>=0?members[existingIndex].createdAt:now,
    updatedAt:now,
   };
   if(existingIndex>=0)members[existingIndex]=member;else members.unshift(member);
   invitations[index]={...invitation,status:'accepted',acceptedByUid:user.uid,acceptedAt:now,updatedAt:now};
   await replaceState('team',members);
   await replaceState('team_invitations',invitations);
   response.json({member});
  }catch(error){next(error)}
 });

 router.use(requireAgencyAccess);
 router.get('/',async(_request,response,next)=>{
  try{
   if(!requireAdmin(response))return;
   const invitations=(await invitationList()).map(invitation=>{
    if(invitation.status==='pending'&&new Date(invitation.expiresAt).getTime()<=Date.now())return {...invitation,status:'expired' as const};
    return invitation;
   });
   response.json({invitations:invitations.map(publicInvitation)});
  }catch(error){next(error)}
 });
 router.post('/',async(request,response,next)=>{
  try{
   if(!requireAdmin(response))return;
   const input=invitationSchema.parse(request.body),email=normalizeEmail(input.email);
   const members=await memberList(),invitations=await invitationList();
   if(members.some(member=>normalizeEmail(member.email)===email&&member.status==='active'))return response.status(409).json({error:'Este e-mail já pertence a um membro ativo.'});
   if(invitations.some(invitation=>normalizeEmail(invitation.email)===email&&activePending(invitation)))return response.status(409).json({error:'Já existe um convite pendente para este e-mail.'});
   const now=new Date(),issued=issueToken(),access=response.locals.access as AccessContext;
   if(!members.length&&access.member===null){
     const ownerEmail=normalizeEmail(String((response.locals.user as DecodedIdToken).email||''));
    if(!ownerEmail)return response.status(400).json({error:'A conta administradora precisa possuir um e-mail.'});
    members.push({
     id:randomUUID(),name:String((response.locals.user as DecodedIdToken).name||ownerEmail.split('@')[0]),email:ownerEmail,
     firebaseUid:access.uid,role:'Administrador',roles:['Administrador'],accessAreas:['general','marketing','finance','settings'],
     clientIds:[],department:'Gestão',status:'active',color:'#5b36f2',createdAt:now.toISOString(),updatedAt:now.toISOString(),
    });
    await replaceState('team',members);
   }
   const invitation:Invitation={id:randomUUID(),...input,email,status:'pending',tokenHash:issued.tokenHash,invitedByUid:access.uid,expiresAt:new Date(now.getTime()+7*24*60*60*1000).toISOString(),createdAt:now.toISOString(),updatedAt:now.toISOString()};
   await replaceState('team_invitations',[invitation,...invitations]);
   response.status(201).json({invitation:publicInvitation(invitation),inviteUrl:invitationUrl(request,issued.token)});
  }catch(error){next(error)}
 });
 router.post('/:id/resend',async(request,response,next)=>{
  try{
   if(!requireAdmin(response))return;
   const invitations=await invitationList(),index=invitations.findIndex(invitation=>invitation.id===request.params.id);
   if(index<0)return response.status(404).json({error:'Convite não encontrado.'});
   if(invitations[index].status==='accepted')return response.status(409).json({error:'Este convite já foi aceito.'});
   const issued=issueToken(),now=new Date();
   invitations[index]={...invitations[index],status:'pending',tokenHash:issued.tokenHash,expiresAt:new Date(now.getTime()+7*24*60*60*1000).toISOString(),updatedAt:now.toISOString()};
   await replaceState('team_invitations',invitations);
   response.json({invitation:publicInvitation(invitations[index]),inviteUrl:invitationUrl(request,issued.token)});
  }catch(error){next(error)}
 });
 router.delete('/:id',async(request,response,next)=>{
  try{
   if(!requireAdmin(response))return;
   const invitations=await invitationList(),index=invitations.findIndex(invitation=>invitation.id===request.params.id);
   if(index<0)return response.status(404).json({error:'Convite não encontrado.'});
   if(invitations[index].status==='accepted')return response.status(409).json({error:'Um convite aceito não pode ser cancelado.'});
   invitations[index]={...invitations[index],status:'revoked',updatedAt:new Date().toISOString()};
   await replaceState('team_invitations',invitations);
   response.status(204).end();
  }catch(error){next(error)}
 });
 return router;
}
