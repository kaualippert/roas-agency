const apiUrl=(import.meta.env.VITE_API_URL||(import.meta.env.PROD?'/api':'http://127.0.0.1:3333/api')).replace(/\/$/,'');

let hydrated=false;
let state:Record<string,unknown>={};
const pending=new Map<string,unknown>();
let flushTimer:number|undefined;

function emit(key:string){window.dispatchEvent(new CustomEvent('roas-change',{detail:key}))}

async function request(path:string,options?:RequestInit){
 const response=await fetch(`${apiUrl}${path}`,options);
 if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`API request failed (${response.status})`)}
 return response.json();
}

async function flush(){
 const entries=[...pending.entries()];pending.clear();
 await Promise.all(entries.map(async([key,value])=>{
  try{const result=await request(`/state/${key}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({value})});state[key]=result.value;emit(key)}
  catch(error){pending.set(key,value);console.error(`Não foi possível salvar ${key} na API.`,error);emit('api-error')}
 }));
}

function queueSync(key:string,value:unknown){pending.set(key,value);window.clearTimeout(flushTimer);flushTimer=window.setTimeout(()=>void flush(),100)}

export const store={
 get<T>(key:string,fallback:T):T{return key in state?state[key] as T:fallback},
 set<T>(key:string,value:T){if(!hydrated)throw new Error('A API ainda não foi carregada.');queueSync(key,value)},
 async init(){if(hydrated)return;const result=await request('/state');state=result.state||{};hydrated=true;emit('hydrate')},
 snapshot(){return structuredClone(state)},
 async replaceAll(next:Record<string,unknown>){const result=await request('/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({state:next})});state=result.state||{};emit('hydrate')},
 async reset(){await request('/state',{method:'DELETE'});state={};emit('hydrate')}
};
