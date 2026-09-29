import {isDeepStrictEqual} from 'node:util';
import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import type {AccessContext,AccessArea} from './access.js';

type AuditedKey='clients'|'tasks'|'team'|'financial_entries';
type AuditAction='created'|'updated'|'deleted';
type AuditField={key:string;label:string;before:unknown;after:unknown};
export interface AuditEvent{
 eventId:string;
 entityType:AuditedKey;
 entityId:string;
 entityLabel:string;
 action:AuditAction;
 areas:AccessArea[];
 clientId?:string;
 clientIds?:string[];
 actorId:string;
 actorName:string;
 actorEmail:string;
 occurredAt:string;
 changes:AuditField[];
 before:Record<string,unknown>|null;
 after:Record<string,unknown>|null;
}

const auditedFields:Record<AuditedKey,Array<[string,string]>>={
 clients:[['companyName','Nome do cliente'],['contactName','Contato principal'],['email','E-mail'],['phone','Telefone'],['instagram','Instagram'],['segment','Segmento'],['city','Cidade'],['cnpj','CNPJ'],['status','Situação'],['managerId','Gestor'],['responsibleIds','Responsáveis'],['monthlyRevenue','Receita mensal'],['serviceIds','Serviços'],['startDate','Início do contrato'],['paymentDay','Dia de pagamento'],['notes','Observações']],
 tasks:[['title','Título'],['description','Descrição'],['clientId','Cliente'],['projectId','Projeto'],['responsibleId','Responsável'],['responsibleIds','Responsáveis'],['status','Status'],['priority','Prioridade'],['dueDate','Prazo'],['tags','Marcadores'],['attachmentsCount','Arquivos anexados']],
 team:[['name','Nome'],['email','E-mail'],['role','Função principal'],['roles','Funções'],['department','Departamento'],['status','Situação'],['accessAreas','Áreas permitidas'],['clientIds','Clientes permitidos']],
 financial_entries:[['description','Descrição'],['clientId','Cliente'],['projectId','Projeto'],['serviceId','Serviço'],['kind','Tipo de cobrança'],['value','Valor'],['dueDate','Vencimento'],['status','Situação'],['receivedAt','Data do recebimento'],['notes','Observações']],
};
const areaByKey:Record<AuditedKey,AccessArea[]>={clients:['general','marketing','finance'],tasks:['general'],team:['settings'],financial_entries:['finance']};
const entityLabels:Record<AuditedKey,string>={clients:'Cliente',tasks:'Tarefa',team:'Membro da equipe',financial_entries:'Lançamento financeiro'};
const asRecords=(value:unknown)=>Array.isArray(value)?value.filter((item):item is Record<string,unknown>=>Boolean(item&&typeof item==='object'&&!Array.isArray(item))):[];
const recordId=(item:Record<string,unknown>)=>String(item.id||'').trim();
function indexRecords(value:unknown){
 const indexed=new Map<string,Record<string,unknown>>();
 for(const item of asRecords(value)){const id=recordId(item);if(id)indexed.set(id,item)}
 return indexed;
}

function snapshotFor(key:AuditedKey,item?:Record<string,unknown>):Record<string,unknown>|null{
 if(!item)return null;
 return Object.fromEntries(auditedFields[key].flatMap(([field])=>field in item?[[field,safeAuditValue(item[field])]]:[]));
}

function safeLabel(value:unknown,fallback:string){return String(value||fallback).replace(/[\r\n\t]/g,' ').slice(0,180)}
function safeAuditValue(value:unknown):unknown{
 if(value===null||typeof value==='number'||typeof value==='boolean')return value;
 if(typeof value==='string')return value.length>3000?`${value.slice(0,3000)}… [conteúdo reduzido]`:value;
 if(Array.isArray(value))return value.slice(0,40).map(safeAuditValue);
 if(value&&typeof value==='object'){
  try{const serialized=JSON.stringify(value);return serialized.length>2000?`${serialized.slice(0,2000)}… [conteúdo reduzido]`:JSON.parse(serialized)}catch{return '[valor não exibível]'}
 }
 return value===undefined?null:String(value);
}

export function buildAuditEvents(key:string,before:unknown,after:unknown,actor:AccessContext,occurredAt=new Date().toISOString()):AuditEvent[]{
 if(!(key in auditedFields))return [];
 const auditedKey=key as AuditedKey,previous=indexRecords(before),next=indexRecords(after);
 const events:AuditEvent[]=[];
 for(const id of new Set([...previous.keys(),...next.keys()])){
  const oldValue=previous.get(id),newValue=next.get(id),oldSnapshot=snapshotFor(auditedKey,oldValue),newSnapshot=snapshotFor(auditedKey,newValue);
  if(isDeepStrictEqual(oldSnapshot,newSnapshot))continue;
  const changes=auditedFields[auditedKey].flatMap(([field,label])=>{
   const oldPresent=Boolean(oldSnapshot&&field in oldSnapshot),newPresent=Boolean(newSnapshot&&field in newSnapshot),oldField=oldSnapshot?.[field],newField=newSnapshot?.[field];
   return oldPresent===newPresent&&isDeepStrictEqual(oldField,newField)?[]:[{key:field,label,before:oldPresent?structuredClone(oldField):null,after:newPresent?structuredClone(newField):null}];
  });
  if(!changes.length)continue;
  const automatedOverdueStatus=auditedKey==='tasks'&&changes.length===1&&changes[0].key==='status'&&oldValue?.dueDate===newValue?.dueDate&&(newValue?.status==='overdue'||(oldValue?.status==='overdue'&&newValue?.status==='pending'));
  const entity=newValue||oldValue!,clientId=auditedKey==='clients'?id:String(entity.clientId||'')||undefined;
  const affectedClients=new Set<string>([...(Array.isArray(oldValue?.clientIds)?oldValue!.clientIds as unknown[]:[]),...(Array.isArray(newValue?.clientIds)?newValue!.clientIds as unknown[]:[])].map(String).filter(Boolean));
  if(clientId)affectedClients.add(clientId);
  events.push({
   eventId:randomUUID(),entityType:auditedKey,entityId:id,entityLabel:safeLabel(entity.companyName||entity.title||entity.description||entity.name,`${entityLabels[auditedKey]} sem nome`),
   action:!oldValue?'created':!newValue?'deleted':'updated',areas:areaByKey[auditedKey],...(clientId?{clientId}:{}),...(affectedClients.size?{clientIds:[...affectedClients]}:{}),
   actorId:automatedOverdueStatus?'system':actor.uid,actorName:automatedOverdueStatus?'Sistema':safeLabel(actor.member?.name||actor.email||'Usuário', 'Usuário'),actorEmail:automatedOverdueStatus?'Automação de prazos':safeLabel(actor.email,'—'),occurredAt,changes,before:oldSnapshot,after:newSnapshot,
  });
 }
 return events;
}

export function auditVisibilityFilter(access:AccessContext){
 const areas:AccessArea[]=access.isAdministrator?['general','marketing','finance','settings']:access.accessAreas;
 const filter:Record<string,unknown>={areas:{$in:areas}};
 if(access.clientIds!==null){
  const clientIds=[...access.clientIds];
  filter.$or=clientIds.length?[
   {clientId:{$in:clientIds}},
   {clientIds:{$in:clientIds}},
   {clientId:{$exists:false},clientIds:{$exists:false}},
  ]:[{clientId:{$exists:false},clientIds:{$exists:false}}];
 }
 return filter;
}

export function redactAuditEvent(event:AuditEvent,access:AccessContext):AuditEvent{
 const safe=structuredClone(event);
 if(access.clientIds===null)return safe;
 const allowed=access.clientIds;
 if(safe.clientIds)safe.clientIds=safe.clientIds.filter(id=>allowed.has(id));
 for(const version of [safe.before,safe.after])if(version&&Array.isArray(version.clientIds))version.clientIds=version.clientIds.filter(id=>allowed.has(String(id)));
 safe.changes=safe.changes.map(change=>change.key==='clientIds'?{...change,before:Array.isArray(change.before)?change.before.filter(id=>allowed.has(String(id))):change.before,after:Array.isArray(change.after)?change.after.filter(id=>allowed.has(String(id))):change.after}:change);
 return safe;
}

let indexesReady:Promise<void>|undefined;
function auditCollection(){
 const database=mongoose.connection.db;
 if(!database)throw new Error('MongoDB is not connected');
 return database.collection<AuditEvent&{_id?:unknown}>('audit_events');
}

export async function appendAuditEvents(events:AuditEvent[]){
 if(!events.length)return;
 const collection=auditCollection();
 indexesReady??=Promise.all([
  collection.createIndex({occurredAt:-1,_id:-1}),
  collection.createIndex({areas:1,clientId:1,occurredAt:-1}),
  collection.createIndex({areas:1,clientIds:1,occurredAt:-1}),
 ]).then(()=>undefined).catch(error=>{indexesReady=undefined;throw error});
 await indexesReady;
 await collection.insertMany(events);
}

export async function listAuditEvents(input:{access:AccessContext;page:number;limit:number;entityType?:string;action?:string;clientId?:string;search?:string}){
 const collection=auditCollection(),filter=auditVisibilityFilter(input.access) as Record<string,unknown>;
 if(input.entityType&&['clients','tasks','team','financial_entries'].includes(input.entityType))filter.entityType=input.entityType;
 if(input.action&&['created','updated','deleted'].includes(input.action))filter.action=input.action;
 const search=input.search?.trim().slice(0,100);
 if(search){const escaped=search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),regex=new RegExp(escaped,'i');filter.$and=[...(Array.isArray(filter.$and)?filter.$and:[]),{$or:[{entityLabel:regex},{actorName:regex},{actorEmail:regex},{'changes.label':regex}]}]}
 if(input.clientId){
  const requested=input.clientId;
  if(input.access.clientIds!==null&&!input.access.clientIds.has(requested))return {items:[],hasMore:false,page:input.page};
  filter.$and=[...(Array.isArray(filter.$and)?filter.$and:[]),{$or:[{clientId:requested},{clientIds:requested}]}];
 }
 const documents=await collection.find(filter).sort({occurredAt:-1,_id:-1}).skip((input.page-1)*input.limit).limit(input.limit+1).toArray();
 const hasMore=documents.length>input.limit;
 const items=documents.slice(0,input.limit).map(({_id,...stored})=>({...redactAuditEvent(stored as AuditEvent,input.access),id:String(_id)}));
 return {items,hasMore,page:input.page};
}
