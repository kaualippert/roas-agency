export type ClientMindMapNode={
 id:string;
 parentId:string|null;
 text:string;
 color:string;
 x?:number;
 y?:number;
};

export type ClientMindMap={
 id:string;
 clientId:string;
 title:string;
 description:string;
 nodes:ClientMindMapNode[];
 createdAt:string;
 updatedAt:string;
};

export type PositionedMindMapNode=ClientMindMapNode&{x:number;y:number};

export const mindMapMinZoom=.2;
export const mindMapMaxZoom=2;

export function clampMindMapZoom(zoom:number){
 return Math.max(mindMapMinZoom,Math.min(mindMapMaxZoom,zoom));
}

export function mindMapZoomScroll(previousZoom:number,nextZoom:number,pointerX:number,pointerY:number,scrollLeft:number,scrollTop:number){
 const zoom=clampMindMapZoom(nextZoom),ratio=zoom/previousZoom;
 return {zoom,scrollLeft:(scrollLeft+pointerX)*ratio-pointerX,scrollTop:(scrollTop+pointerY)*ratio-pointerY};
}

export function fitMindMapZoom(viewportWidth:number,viewportHeight:number,width=1080,height=620,padding=36){
 if(viewportWidth<=0||viewportHeight<=0)return 1;
 return clampMindMapZoom(Math.min((viewportWidth-padding*2)/width,(viewportHeight-padding*2)/height,1));
}

export function clampMindMapPosition(x:number,y:number,width=1080,height=620){
 return {x:Math.max(112,Math.min(width-112,x)),y:Math.max(64,Math.min(height-64,y))};
}

export function fitMindMapView(nodes:PositionedMindMapNode[],viewportWidth:number,viewportHeight:number){
 if(!nodes.length)return {zoom:1,scrollLeft:0,scrollTop:0};
 const left=Math.max(0,Math.min(...nodes.map(node=>node.x))-115),right=Math.max(...nodes.map(node=>node.x))+115;
 const top=Math.max(0,Math.min(...nodes.map(node=>node.y))-65),bottom=Math.max(...nodes.map(node=>node.y))+65;
 const zoom=fitMindMapZoom(viewportWidth,viewportHeight,right-left,bottom-top,24);
 return {zoom,scrollLeft:Math.max(0,(left+right)/2*zoom-viewportWidth/2),scrollTop:Math.max(0,(top+bottom)/2*zoom-viewportHeight/2)};
}

export function availableMindMapPosition(nodes:PositionedMindMapNode[],x:number,y:number,width=1080,height=620){
 const target=clampMindMapPosition(x,y,width,height);
 const candidates=[target];
 for(let row=64;row<=height-64;row+=90)for(let column=112;column<=width-112;column+=200)candidates.push({x:column,y:row});
 return candidates.sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y)).find(candidate=>nodes.every(node=>Math.abs(node.x-candidate.x)>=200||Math.abs(node.y-candidate.y)>=85))||target;
}

export function mindMapRoot(nodes:ClientMindMapNode[]){
 return nodes.find(node=>node.parentId===null)||nodes[0];
}

export function mindMapDescendantIds(nodes:ClientMindMapNode[],nodeId:string){
 const result=new Set<string>(),visit=(parentId:string)=>nodes.filter(node=>node.parentId===parentId).forEach(node=>{if(!result.has(node.id)){result.add(node.id);visit(node.id)}});
 visit(nodeId);
 return result;
}

export function removeMindMapBranch(nodes:ClientMindMapNode[],nodeId:string){
 const root=mindMapRoot(nodes);
 if(!root||root.id===nodeId)return nodes;
 const removed=mindMapDescendantIds(nodes,nodeId);removed.add(nodeId);
 return nodes.filter(node=>!removed.has(node.id));
}

export function layoutMindMapNodes(nodes:ClientMindMapNode[],width=1080,height=620):PositionedMindMapNode[]{
 const root=mindMapRoot(nodes);
 if(!root)return [];
 const result:PositionedMindMapNode[]=[{...root,x:width/2,y:height/2}],visited=new Set([root.id]),children=nodes.filter(node=>node.parentId===root.id),radius=Math.min(width,height)*.3;
 const place=(node:ClientMindMapNode,parent:PositionedMindMapNode,angle:number,depth:number)=>{
  if(visited.has(node.id))return;visited.add(node.id);
  const distance=depth===1?radius:Math.max(125,180-depth*12),position={...node,x:parent.x+Math.cos(angle)*distance,y:parent.y+Math.sin(angle)*distance};
  result.push(position);
  const descendants=nodes.filter(item=>item.parentId===node.id),spread=Math.min(.9,.26*Math.max(1,descendants.length-1));
  descendants.forEach((child,index)=>place(child,position,angle+(index-(descendants.length-1)/2)*(descendants.length===1?0:spread/(descendants.length-1)),depth+1));
 };
 children.forEach((node,index)=>place(node,result[0],-Math.PI/2+index*Math.PI*2/Math.max(1,children.length),1));
 nodes.filter(node=>!visited.has(node.id)).forEach((node,index)=>result.push({...node,x:140+index%5*190,y:90+Math.floor(index/5)*110}));
 return result.map(node=>{
  const saved=nodes.find(item=>item.id===node.id);
  return {...node,...clampMindMapPosition(saved?.x??node.x,saved?.y??node.y,width,height)};
 });
}
