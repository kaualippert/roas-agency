export type ClientMindMapNode={
 id:string;
 parentId:string|null;
 text:string;
 color:string;
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
 const result:PositionedMindMapNode[]=[{...root,x:width/2,y:height/2}],children=nodes.filter(node=>node.parentId===root.id),radius=Math.min(width,height)*.3;
 const place=(node:ClientMindMapNode,parent:PositionedMindMapNode,angle:number,depth:number)=>{
  const distance=depth===1?radius:Math.max(125,180-depth*12),position={...node,x:parent.x+Math.cos(angle)*distance,y:parent.y+Math.sin(angle)*distance};
  result.push(position);
  const descendants=nodes.filter(item=>item.parentId===node.id),spread=Math.min(.9,.26*Math.max(1,descendants.length-1));
  descendants.forEach((child,index)=>place(child,position,angle+(index-(descendants.length-1)/2)*(descendants.length===1?0:spread/(descendants.length-1)),depth+1));
 };
 children.forEach((node,index)=>place(node,result[0],-Math.PI/2+index*Math.PI*2/Math.max(1,children.length),1));
 return result.map(node=>({...node,x:Math.max(90,Math.min(width-90,node.x)),y:Math.max(48,Math.min(height-48,node.y))}));
}
