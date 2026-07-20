import {clients,projects,tasks,team,genericSeeds} from './data';
import {defaultServices,ensureLegacyServices,migrateServiceCapabilities,migrateServiceRecords} from './service-links';
const prefix='roas_';
const apiUrl=(import.meta.env.VITE_API_URL||'http://127.0.0.1:3333/api').replace(/\/$/,'');
let hydrated=false;
const pending=new Map<string,unknown>();
let flushTimer:number|undefined;

async function flush(){
 const entries=[...pending.entries()];pending.clear();
 await Promise.all(entries.map(async([key,value])=>{
  try{await fetch(`${apiUrl}/state/${key}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({value})})}
  catch{pending.set(key,value)}
 }));
}
function queueSync(key:string,value:unknown){
 if(!hydrated)return;pending.set(key,value);window.clearTimeout(flushTimer);flushTimer=window.setTimeout(()=>void flush(),150);
}

export const store={
 get<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(prefix+key); return raw?JSON.parse(raw):fallback}catch{return fallback}},
 set<T>(key:string,data:T){let value:any=data;if((key==='clients'||key==='projects')&&Array.isArray(data)){const currentCatalog=this.get('services',defaultServices),catalog=migrateServiceCapabilities(ensureLegacyServices(currentCatalog,data as any[]));if(JSON.stringify(catalog)!==JSON.stringify(currentCatalog)){localStorage.setItem(prefix+'services',JSON.stringify(catalog));queueSync('services',catalog)}value=migrateServiceRecords(data as any[],catalog)}localStorage.setItem(prefix+key,JSON.stringify(value));queueSync(key,value);window.dispatchEvent(new CustomEvent('roas-change',{detail:key}))},
 async init(){if(hydrated)return;const seeds:any={clients,projects,tasks,team,services:defaultServices,...genericSeeds};Object.entries(seeds).forEach(([k,v])=>{if(!localStorage.getItem(prefix+k))localStorage.setItem(prefix+k,JSON.stringify(v))});try{const localState=Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith(prefix)).map(key=>[key.slice(prefix.length),JSON.parse(localStorage.getItem(key)!)]));const response=await fetch(`${apiUrl}/state/bootstrap`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state:localState})});if(!response.ok)throw new Error('API unavailable');const remote=(await response.json()).state as Record<string,unknown>;Object.entries(remote).forEach(([key,value])=>localStorage.setItem(prefix+key,JSON.stringify(value)))}catch(error){console.warn('ROAS API offline; using local cache.',error)}hydrated=true;const linkedKeys=['clients','projects'],records=linkedKeys.flatMap(key=>this.get<any[]>(key,[])),currentCatalog=this.get('services',defaultServices),catalog=migrateServiceCapabilities(ensureLegacyServices(currentCatalog,records));if(JSON.stringify(catalog)!==JSON.stringify(currentCatalog))this.set('services',catalog);linkedKeys.forEach(key=>{const items=this.get<any[]>(key,[]);if(items.some(item=>item.services||!item.serviceIds))this.set(key,migrateServiceRecords(items,catalog))});this.set('app_version','1.2.0');window.dispatchEvent(new CustomEvent('roas-change',{detail:'hydrate'}))},
 reset(){Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k));this.init()}
};
