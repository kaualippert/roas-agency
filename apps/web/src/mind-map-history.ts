import type {ClientMindMap} from './client-mind-maps';

const historyLimit=50;
const pendingLimit=128;

function cloneMap(map:ClientMindMap):ClientMindMap{
 return {...map,nodes:map.nodes.map(node=>({...node}))};
}

function stableValue(value:unknown):unknown{
 if(Array.isArray(value))return value.map(stableValue);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stableValue(item)]));
 return value;
}

export function mindMapContentKey(map:ClientMindMap){
 return JSON.stringify(stableValue({id:map.id,clientId:map.clientId,title:map.title,description:map.description,nodes:map.nodes}));
}

/** Own save acknowledgments must not look like another editor's changes. */
export class MindMapHistory{
 private current:ClientMindMap|undefined;
 private past:ClientMindMap[]=[];
 private future:ClientMindMap[]=[];
 private pending:string[]=[];
 private observedKey:string|undefined;

 constructor(map:ClientMindMap|undefined){this.reset(map)}

 get mapId(){return this.current?.id}
 get canUndo(){return this.past.length>0}
 get canRedo(){return this.future.length>0}

 private reset(map:ClientMindMap|undefined){
  this.current=map?cloneMap(map):undefined;
  this.past=[];this.future=[];this.pending=[];
  this.observedKey=map?mindMapContentKey(map):undefined;
 }

 observe(map:ClientMindMap|undefined){
  if(map?.id!==this.current?.id){this.reset(map);return true}
  if(!map)return false;
  const key=mindMapContentKey(map);
  // A local state render may still carry the last observed props while saving.
  if(key===this.observedKey)return false;
  this.observedKey=key;
  const acknowledged=this.pending.indexOf(key);
  if(acknowledged>=0){this.pending=this.pending.slice(acknowledged+1);return false}
  if(this.current&&key===mindMapContentKey(this.current))return false;
  // Never undo across an unrecognized remote edit or a server rollback.
  this.reset(map);return true;
 }

 private save(next:ClientMindMap,now:string){
  this.current={...cloneMap(next),updatedAt:now};
  this.pending=[...this.pending,mindMapContentKey(this.current)].slice(-pendingLimit);
  return cloneMap(this.current);
 }

 commit(next:ClientMindMap,now=new Date().toISOString()){
  if(!this.current||next.id!==this.current.id||mindMapContentKey(next)===mindMapContentKey(this.current))return undefined;
  this.past=[...this.past,cloneMap(this.current)].slice(-historyLimit);
  this.future=[];
  return this.save(next,now);
 }

 undo(now=new Date().toISOString()){
  if(!this.current||!this.past.length)return undefined;
  const previous=this.past[this.past.length-1];
  this.past=this.past.slice(0,-1);
  this.future=[...this.future,cloneMap(this.current)].slice(-historyLimit);
  return this.save(previous,now);
 }

 redo(now=new Date().toISOString()){
  if(!this.current||!this.future.length)return undefined;
  const next=this.future[this.future.length-1];
  this.future=this.future.slice(0,-1);
  this.past=[...this.past,cloneMap(this.current)].slice(-historyLimit);
  return this.save(next,now);
 }
}
