import type {NextFunction,Request,Response} from 'express';
import type {DecodedIdToken} from 'firebase-admin/auth';
import {getState} from './state.js';

export type AccessArea='general'|'marketing'|'finance'|'settings';

interface StoredMember{
 id:string;
 email:string;
 name?:string;
 firebaseUid?:string;
 role?:string;
 roles?:string[];
 accessAreas?:AccessArea[];
 clientIds?:string[];
 status:string;
}

export interface AccessContext{
 uid:string;
 email:string;
 member:StoredMember|null;
 isAdministrator:boolean;
 accessAreas:AccessArea[];
 clientIds:Set<string>|null;
}

const allAreas:AccessArea[]=['general','marketing','finance','settings'];
const keyAreas:Record<string,AccessArea>={
 activities:'general',clients:'general',notifications:'general',notification_preferences:'general',
 notification_sound_enabled:'general',onboarding:'general',projects:'general',prospects:'general',tasks:'general',
 campaigns:'marketing',ads:'marketing',creatives:'marketing',integrations:'marketing',marketing_integrations:'marketing',reports:'marketing',
 financial_entries:'finance',invoices:'finance',payments:'finance',
 agency_profile:'settings',general_settings:'settings',permissions:'settings',services:'settings',settings:'settings',team:'settings',team_invitations:'settings',
};
const administratorOnly=new Set(['agency_profile','general_settings','permissions','services','settings','team','team_invitations']);
const clientScopedKeys=new Set(['clients','documents','financial_entries','invoices','onboarding','payments','projects','reports','tasks']);

const normalizeEmail=(value:unknown)=>String(value||'').trim().toLowerCase();
const roles=(member:StoredMember)=>member.roles?.length?member.roles:member.role?[member.role]:[];
const isAdmin=(member:StoredMember)=>roles(member).some(role=>/administrador|propriet[aá]rio|owner/i.test(role));

export async function resolveAccessContext(user:DecodedIdToken):Promise<AccessContext|null>{
 const email=normalizeEmail(user.email);
 const team=await getState('team');
 const members=Array.isArray(team)?team as StoredMember[]:[];
 if(!members.length)return {uid:user.uid,email,member:null,isAdministrator:true,accessAreas:allAreas,clientIds:null};
 const member=members.find(item=>item.firebaseUid===user.uid)||members.find(item=>normalizeEmail(item.email)===email);
 if(!member||member.status!=='active')return null;
 const administrator=isAdmin(member);
 return {
  uid:user.uid,
  email,
  member,
  isAdministrator:administrator,
  accessAreas:administrator?allAreas:member.accessAreas?.length?member.accessAreas:allAreas,
  clientIds:administrator||member.clientIds===undefined?null:new Set(member.clientIds),
 };
}

export async function requireAgencyAccess(_request:Request,response:Response,next:NextFunction){
 const context=await resolveAccessContext(response.locals.user as DecodedIdToken);
 if(!context)return response.status(403).json({error:'Sua conta não possui um acesso ativo nesta agência.'});
 response.locals.access=context;
 next();
}

export function canAccessStateKey(context:AccessContext,key:string,write=false){
 if(context.isAdministrator)return true;
 if(write&&administratorOnly.has(key))return false;
 const area=key.startsWith('editorial_')?'general':keyAreas[key];
 return !area||context.accessAreas.includes(area);
}

function recordClientId(key:string,record:unknown){
 if(!record||typeof record!=='object')return '';
 const value=record as Record<string,unknown>;
 return key==='clients'?String(value.id||''):String(value.clientId||'');
}

function canAccessRecord(context:AccessContext,key:string,record:unknown){
 if(context.clientIds===null||!clientScopedKeys.has(key))return true;
 const clientId=recordClientId(key,record);
 return !clientId||context.clientIds.has(clientId);
}

export function filterStateValue(context:AccessContext,key:string,value:unknown){
 if(!canAccessStateKey(context,key))return undefined;
 return Array.isArray(value)?value.filter(record=>canAccessRecord(context,key,record)):value;
}

export function filterState(context:AccessContext,state:Record<string,unknown>){
 return Object.fromEntries(Object.entries(state).flatMap(([key,value])=>{
  const filtered=filterStateValue(context,key,value);
  return filtered===undefined?[]:[[key,filtered]];
 }));
}

export function scopeStateWrite(context:AccessContext,key:string,incoming:unknown,current:unknown){
 if(context.clientIds===null||!clientScopedKeys.has(key)||!Array.isArray(incoming))return incoming;
 const visible=incoming.filter(record=>canAccessRecord(context,key,record));
 const hidden=Array.isArray(current)?current.filter(record=>!canAccessRecord(context,key,record)):[];
 return [...hidden,...visible];
}

export function canAccessClient(context:AccessContext,clientId:string){
 return context.clientIds===null||context.clientIds.has(clientId);
}
