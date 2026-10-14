import {useCallback,useLayoutEffect,useReducer,useRef} from 'react';
import type {ClientMindMap} from './client-mind-maps';
import {MindMapHistory} from './mind-map-history';

export function useMindMapHistory(map:ClientMindMap|undefined,onChange:(map:ClientMindMap)=>void){
 const history=useRef<MindMapHistory|null>(null);
 if(!history.current)history.current=new MindMapHistory(map);
 const onChangeRef=useRef(onChange);
 const [,render]=useReducer((version:number)=>version+1,0);

 useLayoutEffect(()=>{
  onChangeRef.current=onChange;
  if(history.current!.observe(map))render();
 },[map,onChange]);

 const publish=useCallback((next:ClientMindMap|undefined)=>{
  if(!next)return;
  render();
  onChangeRef.current(next);
 },[]);
 const commit=useCallback((next:ClientMindMap)=>publish(history.current!.commit(next)),[publish]);
 const undo=useCallback(()=>publish(history.current!.undo()),[publish]);
 const redo=useCallback(()=>publish(history.current!.redo()),[publish]);
 const selected=map?.id===history.current.mapId;

 return {commit,undo,redo,canUndo:selected&&history.current.canUndo,canRedo:selected&&history.current.canRedo};
}
