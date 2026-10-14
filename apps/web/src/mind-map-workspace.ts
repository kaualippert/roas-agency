import {mindMapDescendantIds,type PositionedMindMapNode} from './client-mind-maps';

export function mindMapWorldBounds(nodes:PositionedMindMapNode[]){
 const left=Math.min(-2048,Math.floor((Math.min(0,...nodes.map(node=>node.x))-512)/1024)*1024);
 const top=Math.min(-2048,Math.floor((Math.min(0,...nodes.map(node=>node.y))-512)/1024)*1024);
 const right=Math.max(3072,Math.ceil((Math.max(0,...nodes.map(node=>node.x))+512)/1024)*1024);
 const bottom=Math.max(2048,Math.ceil((Math.max(0,...nodes.map(node=>node.y))+512)/1024)*1024);
 return {left,top,right,bottom,width:right-left,height:bottom-top,originX:-left,originY:-top};
}
export function visibleMindMapNodes(nodes:PositionedMindMapNode[],collapsed:string[]){
 const hidden=new Set<string>();
 for(const id of collapsed)for(const child of mindMapDescendantIds(nodes,id))hidden.add(child);
 return nodes.filter(node=>!hidden.has(node.id));
}
export function freeMindMapPosition(nodes:PositionedMindMapNode[],x:number,y:number){
 for(let radius=0;radius<20;radius++){
  const positions=radius===0?[{x,y}]:[{x:x+radius*210,y},{x,y:y+radius*100},{x,y:y-radius*100},{x:x-radius*210,y}];
  const found=positions.find(candidate=>nodes.every(node=>Math.abs(node.x-candidate.x)>=190||Math.abs(node.y-candidate.y)>=90));
  if(found)return found;
 }
 // Dense maps can occupy every nearby candidate; move beyond all existing topics.
 return {x:Math.max(x,...nodes.map(node=>node.x))+210,y};
}
