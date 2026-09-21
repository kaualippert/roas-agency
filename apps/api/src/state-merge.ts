import {isDeepStrictEqual} from 'node:util';

export class StateConflictError extends Error{
  status=409;
  constructor(path:string){super(`Os dados foram alterados por outra pessoa em ${path||'este registro'}. Recarregue e tente novamente.`)}
}

const isObject=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const hasRecordIds=(value:unknown[]):value is Array<Record<string,unknown>&{id:string}>=>value.every(item=>isObject(item)&&typeof item.id==='string')&&new Set(value.map(item=>(item as {id:string}).id)).size===value.length;

function mergeSlot(basePresent:boolean,base:unknown,currentPresent:boolean,current:unknown,incomingPresent:boolean,incoming:unknown,path:string):{present:boolean;value?:unknown}{
  if(basePresent===incomingPresent&&(!basePresent||isDeepStrictEqual(base,incoming)))return currentPresent?{present:true,value:current}:{present:false};
  if(basePresent===currentPresent&&(!basePresent||isDeepStrictEqual(base,current)))return incomingPresent?{present:true,value:incoming}:{present:false};
  if(currentPresent===incomingPresent&&(!currentPresent||isDeepStrictEqual(current,incoming)))return currentPresent?{present:true,value:current}:{present:false};
  if(basePresent&&currentPresent&&incomingPresent)return {present:true,value:mergeConcurrentState(base,current,incoming,path)};
  throw new StateConflictError(path);
}

function mergeRecordArray(base:unknown[],current:unknown[],incoming:unknown[],path:string){
  if(!hasRecordIds(base)||!hasRecordIds(current)||!hasRecordIds(incoming))throw new StateConflictError(path);
  const baseMap=new Map(base.map(item=>[item.id,item])),currentMap=new Map(current.map(item=>[item.id,item])),incomingMap=new Map(incoming.map(item=>[item.id,item]));
  const ids=new Set([...incoming.map(item=>item.id),...current.map(item=>item.id),...base.map(item=>item.id)]),merged=new Map<string,unknown>();
  for(const id of ids){
    const result=mergeSlot(baseMap.has(id),baseMap.get(id),currentMap.has(id),currentMap.get(id),incomingMap.has(id),incomingMap.get(id),`${path}[${id}]`);
    if(result.present)merged.set(id,result.value);
  }
  const order=[...incoming.map(item=>item.id),...current.map(item=>item.id).filter(id=>!incomingMap.has(id))];
  return order.filter((id,index)=>order.indexOf(id)===index&&merged.has(id)).map(id=>merged.get(id));
}

export function mergeConcurrentState(base:unknown,current:unknown,incoming:unknown,path='state'):unknown{
  if(isDeepStrictEqual(incoming,base))return current;
  if(isDeepStrictEqual(current,base)||isDeepStrictEqual(current,incoming))return incoming;
  if(Array.isArray(base)&&Array.isArray(current)&&Array.isArray(incoming))return mergeRecordArray(base,current,incoming,path);
  if(isObject(base)&&isObject(current)&&isObject(incoming)){
    const result:Record<string,unknown>={};
    for(const key of new Set([...Object.keys(base),...Object.keys(current),...Object.keys(incoming)])){
      const merged=mergeSlot(key in base,base[key],key in current,current[key],key in incoming,incoming[key],`${path}.${key}`);
      if(merged.present)result[key]=merged.value;
    }
    return result;
  }
  throw new StateConflictError(path);
}
