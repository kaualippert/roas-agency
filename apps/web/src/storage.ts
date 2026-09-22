import {getIdToken} from './firebase';
import type {CurrentAccess} from './types';
import {cacheLoadingBrand} from './loading-brand';

const apiUrl=(import.meta.env.VITE_API_URL||(import.meta.env.PROD?'/api':'http://127.0.0.1:3333/api')).replace(/\/$/,'');

let hydrated=false;
let state:Record<string,unknown>={};
let syncedState:Record<string,unknown>={};
let currentAccess:CurrentAccess|null=null;
type PendingChange={value:unknown;baseValue:unknown;baseMissing:boolean};
const pending=new Map<string,PendingChange>();
let flushTimer:number|undefined;
let retryDelay=1000;

function emit(key:string){window.dispatchEvent(new CustomEvent('roas-change',{detail:key}))}

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
 const entries=[...pending.entries()];pending.clear();
 let failed=false;
 await Promise.all(entries.map(async([key,change])=>{
  try{
   const result=await apiRequest(`/state/${key}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({value:change.value,baseValue:change.baseMissing?null:change.baseValue,baseMissing:change.baseMissing})});
   syncedState[key]=structuredClone(result.value);
   const newer=pending.get(key);
   if(newer)pending.set(key,{...newer,baseValue:structuredClone(result.value),baseMissing:false});
   else{state[key]=result.value;emit(key)}
  }
  catch(error){
   if(error instanceof ApiRequestError&&error.status===409){
    pending.delete(key);
    try{const latest=await apiRequest(`/state/${key}`);state[key]=latest.value;syncedState[key]=structuredClone(latest.value);emit(key)}catch{delete state[key];delete syncedState[key];emit(key)}
    window.dispatchEvent(new CustomEvent('roas-state-conflict',{detail:{key,message:error.message}}));
   }else{
    if(!pending.has(key))pending.set(key,change);
    failed=true;console.error(`Não foi possível salvar ${key} na API.`,error);emit('api-error');
   }
  }
 }));
 if(pending.size&&flushTimer===undefined){flushTimer=window.setTimeout(()=>void flush(),failed?retryDelay:100);if(failed)retryDelay=Math.min(retryDelay*2,30000)}else if(!failed)retryDelay=1000;
}

function queueSync(key:string,value:unknown){const existing=pending.get(key);pending.set(key,{value,baseValue:existing?existing.baseValue:structuredClone(syncedState[key]),baseMissing:existing?existing.baseMissing:!(key in syncedState)});retryDelay=1000;window.clearTimeout(flushTimer);flushTimer=window.setTimeout(()=>void flush(),100)}
function clearPending(){pending.clear();window.clearTimeout(flushTimer);flushTimer=undefined;retryDelay=1000}

export const store={
 get<T>(key:string,fallback:T):T{return key in state?state[key] as T:fallback},
 access(){return currentAccess},
 set<T>(key:string,value:T){if(!hydrated)throw new Error('A API ainda não foi carregada.');state[key]=value;if(key==='general_settings')cacheLoadingBrand(value);emit(key);queueSync(key,value)},
 async remove(key:string){if(!hydrated)throw new Error('A API ainda não foi carregada.');pending.delete(key);await apiRequest(`/state/${key}`,{method:'DELETE'});delete state[key];emit(key)},
 async init(){if(hydrated)return;const [result,accessResult]=await Promise.all([apiRequest('/state'),apiRequest('/access/me')]);state=result.state||{};syncedState=structuredClone(state);if(state.general_settings)cacheLoadingBrand(state.general_settings);currentAccess=accessResult.access||null;hydrated=true;emit('hydrate')},
 async reload(){clearPending();const result=await apiRequest('/state');state=result.state||{};syncedState=structuredClone(state);if(state.general_settings)cacheLoadingBrand(state.general_settings);emit('hydrate')},
 clearSession(){hydrated=false;state={};syncedState={};currentAccess=null;clearPending();emit('hydrate')},
 snapshot(){return structuredClone(state)},
 async replaceAll(next:Record<string,unknown>){clearPending();const result=await apiRequest('/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({state:next})});state=result.state||{};syncedState=structuredClone(state);if(state.general_settings)cacheLoadingBrand(state.general_settings);hydrated=true;emit('hydrate')},
 async reset(){clearPending();await apiRequest('/state',{method:'DELETE'});state={};syncedState={};hydrated=true;emit('hydrate')}
};
