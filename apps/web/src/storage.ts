import {getIdToken} from './firebase';

const apiUrl=(import.meta.env.VITE_API_URL||(import.meta.env.PROD?'/api':'http://127.0.0.1:3333/api')).replace(/\/$/,'');

let hydrated=false;
let state:Record<string,unknown>={};
const pending=new Map<string,unknown>();
let flushTimer:number|undefined;
let retryDelay=1000;

function emit(key:string){window.dispatchEvent(new CustomEvent('roas-change',{detail:key}))}

async function request(path:string,options?:RequestInit){
 const token=await getIdToken();
 if(!token)throw new Error('Sessão não autenticada.');
 const headers=new Headers(options?.headers);headers.set('authorization',`Bearer ${token}`);
 const response=await fetch(`${apiUrl}${path}`,{...options,headers});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API request failed (${response.status})`)}
 if(response.status===204)return null;
 return response.json();
}

async function flush(){
 flushTimer=undefined;
 const entries=[...pending.entries()];pending.clear();
 let failed=false;
 await Promise.all(entries.map(async([key,value])=>{
  try{const result=await request(`/state/${key}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({value})});if(!pending.has(key)){state[key]=result.value;emit(key)}}
  catch(error){if(!pending.has(key))pending.set(key,value);failed=true;console.error(`Não foi possível salvar ${key} na API.`,error);emit('api-error')}
 }));
 if(failed&&pending.size&&flushTimer===undefined){flushTimer=window.setTimeout(()=>void flush(),retryDelay);retryDelay=Math.min(retryDelay*2,30000)}else if(!failed)retryDelay=1000;
}

function queueSync(key:string,value:unknown){pending.set(key,value);retryDelay=1000;window.clearTimeout(flushTimer);flushTimer=window.setTimeout(()=>void flush(),100)}
function clearPending(){pending.clear();window.clearTimeout(flushTimer);flushTimer=undefined;retryDelay=1000}

export const store={
 get<T>(key:string,fallback:T):T{return key in state?state[key] as T:fallback},
 set<T>(key:string,value:T){if(!hydrated)throw new Error('A API ainda não foi carregada.');state[key]=value;emit(key);queueSync(key,value)},
 async remove(key:string){if(!hydrated)throw new Error('A API ainda não foi carregada.');pending.delete(key);await request(`/state/${key}`,{method:'DELETE'});delete state[key];emit(key)},
 async init(){if(hydrated)return;const result=await request('/state');state=result.state||{};hydrated=true;emit('hydrate')},
 clearSession(){hydrated=false;state={};clearPending();emit('hydrate')},
 snapshot(){return structuredClone(state)},
 async replaceAll(next:Record<string,unknown>){clearPending();const result=await request('/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({state:next})});state=result.state||{};hydrated=true;emit('hydrate')},
 async reset(){clearPending();await request('/state',{method:'DELETE'});state={};hydrated=true;emit('hydrate')}
};
