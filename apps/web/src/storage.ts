import {getIdToken} from './firebase';
import type {CurrentAccess} from './types';
import {cacheLoadingBrand} from './loading-brand';
import {draftStorageKey,parseDrafts,serializeDrafts,type PendingChange} from './save-drafts';

const apiUrl=(import.meta.env.VITE_API_URL||(import.meta.env.PROD?'/api':'http://127.0.0.1:3333/api')).replace(/\/$/,'');
let hydrated=false;
let state:Record<string,unknown>={};
let syncedState:Record<string,unknown>={};
let currentAccess:CurrentAccess|null=null;
const pending=new Map<string,PendingChange>(),inFlight=new Map<string,PendingChange>(),recovered=new Map<string,PendingChange>();
const draftSources=new Map<string,string>();
let flushTimer:number|undefined,flushing=false,retryDelay=1000,session=0,draftKey='',storageError='',saveError='';
export type SaveStatus={status:'saving'|'saved'|'error';pending:number;recoverable:number;message:string};
function emit(key:string){window.dispatchEvent(new CustomEvent('roas-change',{detail:key}))}
function notify(){window.dispatchEvent(new Event('roas-save-status'))}
function persistDrafts(){
 if(!draftKey)return;
 try{
  const entries=[...new Map([...recovered,...inFlight,...pending])].map(([key,change])=>({key,...change}));
  if(entries.length)localStorage.setItem(draftKey,serializeDrafts(entries));else{
   localStorage.removeItem(draftKey);
   // A second tab may have updated its journal since recovery began.
   for(const [key,raw] of draftSources)if(localStorage.getItem(key)===raw)localStorage.removeItem(key);
   draftSources.clear();
  }
  storageError='';
 }catch{storageError='Não foi possível guardar o rascunho neste navegador. Mantenha a página aberta até salvar.'}
 notify();
}
function schedule(delay=100){window.clearTimeout(flushTimer);flushTimer=window.setTimeout(()=>void flush(),delay)}
function discardRuntime(){pending.clear();inFlight.clear();recovered.clear();draftSources.clear();window.clearTimeout(flushTimer);flushTimer=undefined;flushing=false;retryDelay=1000;saveError='';storageError='';notify()}

export class ApiRequestError extends Error{constructor(message:string,public status:number){super(message)}}
export async function apiRequest(path:string,options?:RequestInit){
 const token=import.meta.env.VITE_E2E==='true'?'e2e-token':await getIdToken();
 if(!token)throw new Error('Sessão não autenticada.');
 const headers=new Headers(options?.headers);headers.set('authorization',`Bearer ${token}`);
 const response=await fetch(`${apiUrl}${path}`,{...options,headers});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw new ApiRequestError(body.error||`API request failed (${response.status})`,response.status)}
 if(response.status===204)return null;
 return response.json();
}

async function flush(){
 flushTimer=undefined;
 if(flushing||!hydrated||!pending.size)return;
 if(!navigator.onLine){saveError='Sem conexão. As alterações aguardam envio.';persistDrafts();return}
 const activeSession=session;
 flushing=true;
 const entries=[...pending];pending.clear();
 for(const [key,change] of entries)inFlight.set(key,change);
 persistDrafts();
 let failed=false;
 await Promise.all(entries.map(async([key,change])=>{
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),20000);
  try{
   const result=await apiRequest(`/state/${key}`,{method:'PUT',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({value:change.value,baseValue:change.baseMissing?null:change.baseValue,baseMissing:change.baseMissing})});
   if(session!==activeSession)return;
   syncedState[key]=structuredClone(result.value);
   const newer=pending.get(key);
   if(newer)pending.set(key,{...newer,baseValue:structuredClone(result.value),baseMissing:false});
   else{state[key]=result.value;emit(key)}
  }catch(error){
   if(session!==activeSession)return;
   if(error instanceof ApiRequestError&&[400,401,403,409,413].includes(error.status)){
    // Keep the original merge base. Recovery must never force an overwrite.
    recovered.set(key,pending.get(key)||change);pending.delete(key);
    saveError=error.status===409?'Há alterações em conflito. Seu rascunho foi preservado.':'O servidor recusou o salvamento. Seu rascunho foi preservado.';
    try{const latest=await apiRequest(`/state/${key}`,{signal:controller.signal});if(session!==activeSession)return;state[key]=latest.value;syncedState[key]=structuredClone(latest.value);emit(key)}catch{/* Keep the last visible state if refresh fails. */}
    if(error.status===409)window.dispatchEvent(new CustomEvent('roas-state-conflict',{detail:{key,message:`${error.message} Seu rascunho foi preservado no indicador de salvamento.`}}));
   }else{
    if(!pending.has(key))pending.set(key,change);
    failed=true;saveError='Falha ao salvar no servidor. Tentaremos novamente automaticamente.';emit('api-error');
   }
  }finally{
   window.clearTimeout(timeout);
   if(session===activeSession){inFlight.delete(key);persistDrafts()}
  }
 }));
 if(session!==activeSession)return;
 flushing=false;
 if(!pending.size&&!recovered.size)saveError='';
 if(pending.size){schedule(failed?retryDelay:100);retryDelay=failed?Math.min(retryDelay*2,30000):1000}
 notify();
}

function queueSync(key:string,value:unknown){
 const existing=pending.get(key)||inFlight.get(key);
 pending.set(key,{value:structuredClone(value),baseValue:existing?existing.baseValue:structuredClone(syncedState[key]),baseMissing:existing?existing.baseMissing:!(key in syncedState)});
 recovered.delete(key);saveError='';retryDelay=1000;persistDrafts();schedule();
}
function restoreDrafts(){
 if(!hydrated||flushing)return;
 for(const [key,change] of recovered)if(!pending.has(key))pending.set(key,change);
 recovered.clear();saveError='';persistDrafts();schedule(0);
 // Only show the recovered data after server permission and concurrency checks.
}
window.addEventListener('online',()=>{if(hydrated&&pending.size){saveError='';notify();schedule(0)}});
window.addEventListener('offline',()=>{if(pending.size||inFlight.size){saveError='Sem conexão. As alterações aguardam envio.';notify()}});
window.addEventListener('beforeunload',event=>{if(pending.size||inFlight.size){persistDrafts();event.preventDefault();event.returnValue=''}});

export const store={
 get<T>(key:string,fallback:T):T{return key in state?state[key] as T:fallback},
 access(){return currentAccess},
 saveStatus():SaveStatus{return {status:saveError||storageError||recovered.size?'error':pending.size||inFlight.size?'saving':'saved',pending:pending.size+inFlight.size,recoverable:recovered.size,message:storageError||saveError||(recovered.size?'Há alterações não enviadas de uma sessão anterior.':'')}},
 retrySave(){saveError='';notify();schedule(0)},
 recoverDrafts:restoreDrafts,
 downloadDrafts(){
  const entries=[...new Map([...recovered,...inFlight,...pending])].map(([key,change])=>({key,...change}));
  const url=URL.createObjectURL(new Blob([serializeDrafts(entries)],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download='flow-host-rascunho.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 },
 discardDrafts(){recovered.clear();if(!pending.size&&!inFlight.size)saveError='';persistDrafts()},
 set<T>(key:string,value:T){if(!hydrated)throw new Error('A API ainda não foi carregada.');state[key]=value;if(key==='general_settings')cacheLoadingBrand(value);emit(key);queueSync(key,value)},
 async remove(key:string){if(!hydrated)throw new Error('A API ainda não foi carregada.');if(inFlight.has(key)||pending.has(key))throw new Error('Aguarde o salvamento antes de excluir.');const activeSession=session;await apiRequest(`/state/${key}`,{method:'DELETE'});if(session!==activeSession)return;recovered.delete(key);delete state[key];delete syncedState[key];persistDrafts();emit(key)},
 async init(){
  if(hydrated)return;
  const activeSession=session;
  const [result,accessResult]=await Promise.all([apiRequest('/state'),apiRequest('/access/me')]);
  if(activeSession!==session||hydrated)return;
  state=result.state||{};syncedState=structuredClone(state);currentAccess=accessResult.access||null;
  const prefix=currentAccess?.uid?draftStorageKey(apiUrl,currentAccess.uid):'';
  // Each open page owns a journal; two tabs cannot erase each other's pending writes.
  draftKey=prefix?`${prefix}:${crypto.randomUUID()}`:'';
  if(prefix)try{
   const keys=Object.keys(localStorage).filter(key=>key===prefix||key.startsWith(`${prefix}:`));
   const journals=keys.map(key=>({key,raw:localStorage.getItem(key)!})).sort((a,b)=>{try{return JSON.parse(a.raw).savedAt-JSON.parse(b.raw).savedAt}catch{return 0}});
   for(const journal of journals){
    const entries=parseDrafts(journal.raw);
    if(!entries.length){localStorage.removeItem(journal.key);continue}
    draftSources.set(journal.key,journal.raw);
    for(const {key,...change} of entries)recovered.set(key,change);
   }
  }catch{storageError='Não foi possível acessar os rascunhos neste navegador.'}
  if(state.general_settings)cacheLoadingBrand(state.general_settings);
  hydrated=true;emit('hydrate');notify();
 },
 async reload(){
  if(pending.size||inFlight.size)throw new Error('Aguarde o salvamento antes de recarregar os dados.');
  const activeSession=session,result=await apiRequest('/state');if(session!==activeSession)return;
  state=result.state||{};syncedState=structuredClone(state);if(state.general_settings)cacheLoadingBrand(state.general_settings);emit('hydrate');
 },
 clearSession(){persistDrafts();session++;hydrated=false;state={};syncedState={};currentAccess=null;draftKey='';discardRuntime();emit('hydrate')},
 snapshot(){return structuredClone(state)},
 async replaceAll(next:Record<string,unknown>){
  if(pending.size||inFlight.size)throw new Error('Aguarde o salvamento antes de substituir os dados.');
  const activeSession=session,result=await apiRequest('/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({state:next})});if(session!==activeSession)return;
  discardRuntime();persistDrafts();state=result.state||{};syncedState=structuredClone(state);if(state.general_settings)cacheLoadingBrand(state.general_settings);hydrated=true;emit('hydrate');
 },
 async reset(){
  if(pending.size||inFlight.size)throw new Error('Aguarde o salvamento antes de redefinir os dados.');
  const activeSession=session;await apiRequest('/state',{method:'DELETE'});if(session!==activeSession)return;
  discardRuntime();persistDrafts();state={};syncedState={};hydrated=true;emit('hydrate');
 }
};
