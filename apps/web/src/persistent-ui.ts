import {useEffect,useState} from 'react';

export function readPersistentValue<T>(key:string,fallback:T):T{
 try{const saved=localStorage.getItem(key);return saved===null?fallback:JSON.parse(saved) as T}catch{return fallback}
}

export function usePersistentState<T>(key:string,fallback:T){
 const [value,setValue]=useState<T>(()=>readPersistentValue(key,fallback));
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{/* Preferências de interface não impedem o uso do sistema. */}},[key,value]);
 return [value,setValue] as const;
}

export type KanbanDensity='comfortable'|'compact';
export const normalizedKanbanDensity=(value:unknown):KanbanDensity=>value==='compact'?'compact':'comfortable';

export function useKanbanDensity(key:string){
 const [stored,setStored]=usePersistentState<unknown>(key,'comfortable');
 const density=normalizedKanbanDensity(stored);
 return {density,compact:density==='compact',toggleDensity:()=>setStored((current:unknown)=>normalizedKanbanDensity(current)==='compact'?'comfortable':'compact')};
}
