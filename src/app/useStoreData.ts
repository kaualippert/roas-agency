import {useEffect,useState} from 'react';
import {store} from '../storage';

export function useStoreData<T>(key:string,fallback:T){
 const [data,setData]=useState<T>(()=>store.get(key,fallback));
 useEffect(()=>{const refresh=()=>setData(store.get(key,fallback));window.addEventListener('roas-change',refresh);return()=>window.removeEventListener('roas-change',refresh)},[key]);
 const save=(value:T)=>{setData(value);store.set(key,value)};
 return [data,save] as const;
}
