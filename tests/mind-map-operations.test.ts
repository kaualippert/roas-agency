import assert from 'node:assert/strict';
import test from 'node:test';
import {layoutMindMapNodes,type ClientMindMapNode} from '../apps/web/src/client-mind-maps';
import {duplicateMindMapBranch,reparentMindMapNode,removeMindMapSelection,selectedMindMapBranchIds} from '../apps/web/src/mind-map-operations';

const nodes:ClientMindMapNode[]=[
 {id:'root',parentId:null,text:'Campanha',color:'#5b36f2',x:300,y:300},
 {id:'audience',parentId:'root',text:'Público',color:'#2563eb',x:540,y:180},
 {id:'persona',parentId:'audience',text:'Persona',color:'#059669',x:780,y:180},
 {id:'creative',parentId:'root',text:'Criativos',color:'#d97706',x:540,y:420},
 {id:'free',parentId:null,text:'Ideia livre',color:'#dc2626',x:1100,y:900},
];

test('seleção inclui descendentes uma única vez e ignora IDs inexistentes',()=>{
 assert.deepEqual([...selectedMindMapBranchIds(nodes,['audience','persona','missing'])],['audience','persona']);
 assert.deepEqual([...selectedMindMapBranchIds(nodes,'free')],['free']);
 assert.deepEqual([...selectedMindMapBranchIds(nodes,[])],[]);
 const cyclic:ClientMindMapNode[]=[{...nodes[1],parentId:'persona'},nodes[2]];
 assert.deepEqual([...selectedMindMapBranchIds(cyclic,'audience')],['audience','persona']);
});

test('duplica toda a ramificação preservando o pai e deslocando sua forma',()=>{
 const original=structuredClone(nodes);let index=0;
 const result=duplicateMindMapBranch(nodes,'audience',()=>`copy-${++index}`);
 assert.equal(result.rootId,'copy-1');
 assert.deepEqual(result.nodes.slice(0,nodes.length),nodes);
 assert.deepEqual(result.nodes.slice(nodes.length),[
  {...nodes[1],id:'copy-1',parentId:'root',x:600,y:260},
  {...nodes[2],id:'copy-2',parentId:'copy-1',x:840,y:260},
 ]);
 assert.deepEqual(nodes,original);
 assert.notEqual(result.nodes[nodes.length],nodes[1]);
});

test('duplicar o tópico principal cria uma árvore livre com todas as conexões remapeadas',()=>{
 let index=0;
 const result=duplicateMindMapBranch(nodes,'root',()=>`copy-${++index}`),copies=result.nodes.slice(nodes.length);
 assert.equal(result.rootId,'copy-1');
 assert.equal(copies.length,4);
 assert.equal(copies[0].parentId,null);
 assert.equal(copies[1].parentId,'copy-1');
 assert.equal(copies[2].parentId,'copy-2');
 assert.equal(copies[3].parentId,'copy-1');
 assert.ok(!copies.some(node=>node.text==='Ideia livre'));
});

test('duplica tópicos livres sem limitar coordenadas ao tamanho padrão da grade',()=>{
 const result=duplicateMindMapBranch(nodes,'free',()=> 'free-copy');
 assert.deepEqual(result.nodes.at(-1),{...nodes[4],id:'free-copy',x:1160,y:980});
});

test('calcula posições para tópicos legados sem coordenadas',()=>{
 const legacy=nodes.slice(0,3).map(({x,y,...node})=>node),positioned=layoutMindMapNodes(legacy);let index=0;
 const result=duplicateMindMapBranch(legacy,'audience',()=>`copy-${++index}`);
 assert.equal(result.nodes[3].x,positioned[1].x+60);
 assert.equal(result.nodes[3].y,positioned[1].y+80);
 assert.equal(result.nodes[4].x,positioned[2].x+60);
 assert.equal(result.nodes[4].y,positioned[2].y+80);
});

test('IDs de cópias continuam únicos mesmo quando o gerador colide',()=>{
 const result=duplicateMindMapBranch(nodes,'audience',()=> 'root');
 assert.equal(new Set(result.nodes.map(node=>node.id)).size,result.nodes.length);
 assert.equal(result.rootId,'audience-copy-1');
 assert.equal(result.nodes.at(-1)?.parentId,result.rootId);
});

test('duplicar um tópico ausente ou com ancestralidade cíclica não altera o mapa',()=>{
 const missing=duplicateMindMapBranch(nodes,'missing');
 assert.equal(missing.nodes,nodes);
 assert.equal(missing.rootId,'missing');
 const cyclic:ClientMindMapNode[]=[nodes[0],{...nodes[1],parentId:'persona'},nodes[2]];
 assert.equal(duplicateMindMapBranch(cyclic,'audience').nodes,cyclic);
});

test('reconecta uma ramificação mantendo posições e todos os seus descendentes',()=>{
 const result=reparentMindMapNode(nodes,'audience','creative');
 assert.deepEqual(result[1],{...nodes[1],parentId:'creative'});
 assert.equal(result[2],nodes[2]);
 assert.equal(result[0],nodes[0]);
 assert.equal(nodes[1].parentId,'root');
 assert.deepEqual(reparentMindMapNode(nodes,'audience',null)[1],{...nodes[1],parentId:null});
 assert.equal(reparentMindMapNode(nodes,'free','creative')[4].parentId,'creative');
});

test('reconexão rejeita raiz principal, pai ausente, o próprio tópico e seus descendentes',()=>{
 for(const [id,parent] of [['root','creative'],['audience','missing'],['missing','root'],['audience','audience'],['audience','persona'],['audience','root']] as const){
  assert.equal(reparentMindMapNode(nodes,id,parent),nodes);
 }
 assert.equal(reparentMindMapNode(nodes,'root',null),nodes);
 const cyclic:ClientMindMapNode[]=[...nodes,{id:'cycle',parentId:'cycle',text:'Ciclo',color:'#dc2626'}];
 assert.equal(reparentMindMapNode(cyclic,'audience','cycle'),cyclic);
});

test('exclusão múltipla remove ramificações completas e protege o tópico principal',()=>{
 assert.deepEqual(removeMindMapSelection(nodes,['audience','persona','free']).map(node=>node.id),['root','creative']);
 assert.deepEqual(removeMindMapSelection(nodes,['root','audience']).map(node=>node.id),['root','creative','free']);
 assert.equal(removeMindMapSelection(nodes,['root']),nodes);
 assert.equal(removeMindMapSelection(nodes,['missing']),nodes);
 assert.equal(removeMindMapSelection(nodes,[]),nodes);
 assert.equal(nodes.length,5);
});

test('operações vazias são seguras',()=>{
 const empty:ClientMindMapNode[]=[];
 assert.equal(duplicateMindMapBranch(empty,'missing').nodes,empty);
 assert.equal(reparentMindMapNode(empty,'missing',null),empty);
 assert.equal(removeMindMapSelection(empty,['missing']),empty);
 assert.equal(selectedMindMapBranchIds(empty,'missing').size,0);
});
