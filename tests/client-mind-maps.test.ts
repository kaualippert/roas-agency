import assert from 'node:assert/strict';
import test from 'node:test';
import {availableMindMapPosition,clampMindMapPosition,clampMindMapZoom,fitMindMapView,fitMindMapZoom,layoutMindMapNodes,mindMapDescendantIds,mindMapZoomScroll,removeMindMapBranch,type ClientMindMapNode} from '../apps/web/src/client-mind-maps';

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
 assert.deepEqual(clampMindMapPosition(-20,900,1000,600),{x:112,y:536});
});

test('limita o zoom e mantém o ponto do cursor estável',()=>{
 assert.equal(clampMindMapZoom(.1),.2);
 assert.equal(clampMindMapZoom(3),2);
 assert.deepEqual(mindMapZoomScroll(1,1.5,200,120,300,80),{zoom:1.5,scrollLeft:550,scrollTop:180});
});

test('calcula a melhor escala para enquadrar o mapa na área disponível',()=>{
 assert.equal(fitMindMapZoom(1152,692),1);
 assert.equal(fitMindMapZoom(612,382),.5);
 assert.equal(fitMindMapZoom(200,100),.2);
});

test('enquadra apenas os tópicos visíveis e permite ver mapas amplos no celular',()=>{
 const positioned=layoutMindMapNodes([{...nodes[0],x:130,y:90},{...nodes[1],x:940,y:530}]);
 const view=fitMindMapView(positioned,320,390);
 assert.ok(view.zoom<.45);
 assert.ok((940-130+230)*view.zoom<=320-48);
 assert.deepEqual(fitMindMapView([],320,390),{zoom:1,scrollLeft:0,scrollTop:0});
 assert.equal(fitMindMapView([positioned[0]],800,450).zoom,1);
});

test('cria tópicos na posição solicitada quando livre e evita sobrepor tópicos existentes',()=>{
 const positioned=layoutMindMapNodes([{...nodes[0],x:540,y:310}]);
 assert.deepEqual(availableMindMapPosition(positioned,750,310),{x:750,y:310});
 const next=availableMindMapPosition(positioned,540,310);
 assert.ok(Math.abs(next.x-540)>=200||Math.abs(next.y-310)>=85);
 assert.deepEqual(availableMindMapPosition([],2000,-40),{x:968,y:64});
});
