import assert from 'node:assert/strict';
import test from 'node:test';
import {clampMindMapPosition,clampMindMapZoom,fitMindMapZoom,layoutMindMapNodes,mindMapDescendantIds,mindMapZoomScroll,removeMindMapBranch,type ClientMindMapNode} from '../apps/web/src/client-mind-maps';

const nodes:ClientMindMapNode[]=[
 {id:'root',parentId:null,text:'Campanha',color:'#5b36f2'},
 {id:'audience',parentId:'root',text:'Público',color:'#2563eb'},
 {id:'persona',parentId:'audience',text:'Persona',color:'#059669'},
 {id:'creative',parentId:'root',text:'Criativos',color:'#d97706'},
];

test('posiciona o tópico central e todas as ramificações',()=>{
 const positioned=layoutMindMapNodes(nodes,1000,600);
 assert.equal(positioned.length,4);
 assert.deepEqual(positioned.find(node=>node.id==='root'),{...nodes[0],x:500,y:300});
 assert.notDeepEqual(positioned.find(node=>node.id==='audience'),positioned.find(node=>node.id==='creative'));
});

test('remove uma ramificação com todos os seus descendentes sem excluir a raiz',()=>{
 assert.deepEqual([...mindMapDescendantIds(nodes,'audience')],['persona']);
 assert.deepEqual(removeMindMapBranch(nodes,'audience').map(node=>node.id),['root','creative']);
 assert.deepEqual(removeMindMapBranch(nodes,'root'),nodes);
});

test('preserva posições livres e limita nós às bordas da grade',()=>{
 const free:ClientMindMapNode={id:'free',parentId:null,text:'Ideia livre',color:'#dc2626',x:820,y:510};
 const positioned=layoutMindMapNodes([...nodes,free],1000,600);
 assert.deepEqual(positioned.find(node=>node.id==='free'),{...free,x:820,y:510});
 assert.deepEqual(clampMindMapPosition(-20,900,1000,600),{x:90,y:552});
});

test('limita o zoom e mantém o ponto do cursor estável',()=>{
 assert.equal(clampMindMapZoom(.1),.45);
 assert.equal(clampMindMapZoom(3),2);
 assert.deepEqual(mindMapZoomScroll(1,1.5,200,120,300,80),{zoom:1.5,scrollLeft:550,scrollTop:180});
});

test('calcula a melhor escala para enquadrar o mapa na área disponível',()=>{
 assert.equal(fitMindMapZoom(1152,692),1);
 assert.equal(fitMindMapZoom(612,382),.5);
 assert.equal(fitMindMapZoom(200,100),.45);
});
