import {layoutMindMapNodes,mindMapRoot,type ClientMindMapNode} from './client-mind-maps';

/** Selected topics and their descendants, visited once even if stored data contains a cycle. */
export function selectedMindMapBranchIds(nodes:ClientMindMapNode[],nodeIds:string|readonly string[]){
 const existing=new Set(nodes.map(node=>node.id)),children=new Map<string,ClientMindMapNode[]>();
 for(const node of nodes){
  if(node.parentId===null)continue;
  const siblings=children.get(node.parentId)||[];
  siblings.push(node);children.set(node.parentId,siblings);
 }
 const pending=typeof nodeIds==='string'?[nodeIds]:[...nodeIds],selected=new Set<string>();
 for(let index=0;index<pending.length;index++){
  const id=pending[index];
  if(!existing.has(id)||selected.has(id))continue;
  selected.add(id);
  for(const child of children.get(id)||[])pending.push(child.id);
 }
 return selected;
}

function validAncestry(nodes:ClientMindMapNode[],nodeId:string,forbiddenId?:string){
 const indexed=new Map(nodes.map(node=>[node.id,node])),visited=new Set<string>();
 let current:string|null=nodeId;
 while(current!==null){
  if(current===forbiddenId||visited.has(current))return false;
  const node=indexed.get(current);
  if(!node)return false;
  visited.add(current);current=node.parentId;
 }
 return true;
}

/** Copies a whole branch while preserving its shape, content and original parent. */
export function duplicateMindMapBranch(nodes:ClientMindMapNode[],nodeId:string,idFactory:()=>string=()=>crypto.randomUUID()):{nodes:ClientMindMapNode[];rootId:string}{
 const source=nodes.find(node=>node.id===nodeId);
 if(!source||!validAncestry(nodes,nodeId))return {nodes,rootId:nodeId};
 const selected=selectedMindMapBranchIds(nodes,nodeId),occupied=new Set(nodes.map(node=>node.id)),ids=new Map<string,string>();
 for(const node of nodes){
  if(!selected.has(node.id))continue;
  let id=idFactory(),attempts=0;
  while((!id||occupied.has(id))&&attempts<20){id=idFactory();attempts++;}
  if(!id||occupied.has(id)){
   let suffix=1;
   while(occupied.has(`${node.id}-copy-${suffix}`))suffix++;
   id=`${node.id}-copy-${suffix}`;
  }
  occupied.add(id);ids.set(node.id,id);
 }
 const positions=new Map(layoutMindMapNodes(nodes).map(node=>[node.id,node])),primaryRoot=mindMapRoot(nodes);
 const copies=nodes.filter(node=>selected.has(node.id)).map(node=>({
  ...node,
  id:ids.get(node.id)!,
  parentId:node.id===nodeId?(node.id===primaryRoot?.id?null:node.parentId):(node.parentId===null?null:ids.get(node.parentId)!),
  x:(Number.isFinite(node.x)?node.x!:positions.get(node.id)!.x)+60,
  y:(Number.isFinite(node.y)?node.y!:positions.get(node.id)!.y)+80,
 }));
 return {nodes:[...nodes,...copies],rootId:ids.get(nodeId)!};
}

/** Reconnects a topic without allowing the primary topic or cyclic connections to move. */
export function reparentMindMapNode(nodes:ClientMindMapNode[],nodeId:string,parentId:string|null){
 const node=nodes.find(item=>item.id===nodeId);
 if(!node||mindMapRoot(nodes)?.id===nodeId||node.parentId===parentId)return nodes;
 if(parentId!==null&&!validAncestry(nodes,parentId,nodeId))return nodes;
 return nodes.map(item=>item.id===nodeId?{...item,parentId}:item);
}

/** Removes selected branches, never deleting the primary topic or its unselected branches. */
export function removeMindMapSelection(nodes:ClientMindMapNode[],ids:readonly string[]){
 const root=mindMapRoot(nodes),selection=ids.filter(id=>id!==root?.id);
 const removed=selectedMindMapBranchIds(nodes,selection);
 if(root)removed.delete(root.id);
 if(!removed.size)return nodes;
 return nodes.filter(node=>!removed.has(node.id));
}
