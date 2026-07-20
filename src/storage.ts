import {clients,projects,tasks,team,genericSeeds} from './data';
const prefix='roas_'; export const store={
 get<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(prefix+key); return raw?JSON.parse(raw):fallback}catch{return fallback}},
 set<T>(key:string,data:T){localStorage.setItem(prefix+key,JSON.stringify(data)); window.dispatchEvent(new CustomEvent('roas-change',{detail:key}))},
 init(){const seeds:any={clients,projects,tasks,team,...genericSeeds}; Object.entries(seeds).forEach(([k,v])=>{if(!localStorage.getItem(prefix+k))this.set(k,v)}); if(!localStorage.getItem(prefix+'app_version'))this.set('app_version','1.0.0')},
 reset(){Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k));this.init()}
};
