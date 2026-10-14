import assert from 'node:assert/strict';
import test from 'node:test';
import {layoutMindMapNodes,type ClientMindMapNode,type PositionedMindMapNode} from '../apps/web/src/client-mind-maps';
import {freeMindMapPosition,mindMapWorldBounds,visibleMindMapNodes} from '../apps/web/src/mind-map-workspace';

const topic=(id:string,x:number,y:number,parentId:string|null=null):PositionedMindMapNode=>({id,parentId,text:id,color:'#5b36f2',x,y});
const doesNotOverlap=(nodes:PositionedMindMapNode[],position:{x:number;y:number})=>nodes.every(node=>Math.abs(node.x-position.x)>=190||Math.abs(node.y-position.y)>=90);

test('a área de trabalho vazia tem limites finitos e espaço inicial ao redor da origem',()=>{
 assert.deepEqual(mindMapWorldBounds([]),{left:-2048,top:-2048,right:3072,bottom:2048,width:5120,height:4096,originX:2048,originY:2048});
});

test('os limites incluem tópicos muito afastados, coordenadas negativas e margem de segurança',()=>{
 const nodes=[topic('negative',-5000,-7200),topic('positive',10000,10300)],bounds=mindMapWorldBounds(nodes);
 assert.deepEqual(bounds,{left:-6144,top:-8192,right:11264,bottom:11264,width:17408,height:19456,originX:6144,originY:8192});
 for(const node of nodes){
  assert.ok(node.x-bounds.left>=512);
  assert.ok(bounds.right-node.x>=512);
  assert.ok(node.y-bounds.top>=512);
  assert.ok(bounds.bottom-node.y>=512);
  assert.ok(node.x+bounds.originX>=0&&node.x+bounds.originX<=bounds.width);
  assert.ok(node.y+bounds.originY>=0&&node.y+bounds.originY<=bounds.height);
 }
});

test('a área cresce em blocos estáveis de 1024 em vez de mudar a cada pixel',()=>{
 const original=mindMapWorldBounds([]),inside=mindMapWorldBounds([topic('inside',2560,1536),topic('negative',-1536,-1536)]);
 assert.deepEqual(inside,original);
 const outside=mindMapWorldBounds([topic('outside',2561,1537),topic('negative',-1537,-1537)]);
 assert.equal(outside.left,-3072);
 assert.equal(outside.top,-3072);
 assert.equal(outside.right,4096);
 assert.equal(outside.bottom,3072);
 for(const value of [outside.left,outside.top,outside.right,outside.bottom,outside.width,outside.height])assert.equal(value%1024===0,true);
 assert.deepEqual(mindMapWorldBounds([topic('outside',2570,1540),topic('negative',-1540,-1540)]),outside);
});

test('minimizar uma ramificação oculta apenas descendentes e mantém o tópico, irmãos e árvores livres',()=>{
 const nodes=[topic('root',0,0),topic('branch',200,0,'root'),topic('child',400,0,'branch'),topic('grandchild',600,0,'child'),topic('sibling',200,200,'root'),topic('free',-200,200),topic('free-child',-400,200,'free')];
 const original=structuredClone(nodes);
 assert.deepEqual(visibleMindMapNodes(nodes,['branch']).map(node=>node.id),['root','branch','sibling','free','free-child']);
 assert.deepEqual(visibleMindMapNodes(nodes,['branch','child','branch']).map(node=>node.id),['root','branch','sibling','free','free-child']);
 assert.deepEqual(visibleMindMapNodes(nodes,['root']).map(node=>node.id),['root','free','free-child']);
 assert.deepEqual(visibleMindMapNodes(nodes,['branch','free']).map(node=>node.id),['root','branch','sibling','free']);
 assert.deepEqual(visibleMindMapNodes(nodes,['missing']),nodes);
 assert.deepEqual(visibleMindMapNodes(nodes,[]),nodes);
 assert.deepEqual(nodes,original);
});

test('minimizar tópicos sem filhos e mapas vazios é seguro',()=>{
 const leaf=topic('leaf',100,100);
 assert.deepEqual(visibleMindMapNodes([leaf],['leaf']),[leaf]);
 assert.deepEqual(visibleMindMapNodes([],['missing']),[]);
});

test('a criação livre preserva o ponto solicitado quando disponível, inclusive fora dos limites legados',()=>{
 assert.deepEqual(freeMindMapPosition([],2500,-400),{x:2500,y:-400});
 assert.deepEqual(freeMindMapPosition([topic('root',0,0)],-800,1300),{x:-800,y:1300});
 assert.deepEqual(freeMindMapPosition([topic('root',0,0)],190,0),{x:190,y:0});
 assert.deepEqual(freeMindMapPosition([topic('root',0,0)],0,90),{x:0,y:90});
});

test('a criação livre procura uma posição próxima sem sobrepor tópicos existentes',()=>{
 const nodes=[topic('root',0,0)];
 assert.deepEqual(freeMindMapPosition(nodes,0,0),{x:210,y:0});
 nodes.push(topic('right',210,0));
 assert.deepEqual(freeMindMapPosition(nodes,0,0),{x:0,y:100});
 nodes.push(topic('bottom',0,100),topic('top',0,-100));
 assert.deepEqual(freeMindMapPosition(nodes,0,0),{x:-210,y:0});
 assert.ok(doesNotOverlap(nodes,freeMindMapPosition(nodes,0,0)));
});

test('mapas densos nunca recebem um tópico sobre outro quando todas as posições próximas estão ocupadas',()=>{
 const nodes:PositionedMindMapNode[]=[topic('root',0,0)];
 for(let radius=1;radius<20;radius++){
  nodes.push(topic(`right-${radius}`,radius*210,0),topic(`bottom-${radius}`,0,radius*100),topic(`top-${radius}`,0,-radius*100),topic(`left-${radius}`,-radius*210,0));
 }
 nodes.push(topic('old-fallback',210,100));
 const position=freeMindMapPosition(nodes,0,0);
 assert.ok(doesNotOverlap(nodes,position));
 assert.equal(nodes.length,78);
});

test('o layout livre preserva coordenadas negativas e grandes, enquanto o modo legado continua limitado',()=>{
 const nodes:ClientMindMapNode[]=[topic('root',-340,-120),topic('branch',2500,1600,'root')];
 const free=layoutMindMapNodes(nodes,1080,620,true),legacy=layoutMindMapNodes(nodes);
 assert.deepEqual(free,nodes);
 assert.deepEqual(legacy,[{...nodes[0],x:112,y:64},{...nodes[1],x:968,y:556}]);
 assert.deepEqual(layoutMindMapNodes(nodes,1080,620,false),legacy);
 assert.equal(nodes[0].x,-340);
 assert.equal(nodes[1].y,1600);
});

test('o layout livre gera posições válidas para dados legados ausentes ou não finitos',()=>{
 const nodes:ClientMindMapNode[]=[{id:'root',parentId:null,text:'Root',color:'#5b36f2'},topic('branch',Number.NaN,Number.POSITIVE_INFINITY,'root')];
 const positioned=layoutMindMapNodes(nodes,1080,620,true);
 assert.deepEqual(positioned[0],{...nodes[0],x:540,y:310});
 assert.ok(positioned.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)));
 assert.deepEqual(layoutMindMapNodes([],1080,620,true),[]);
});
