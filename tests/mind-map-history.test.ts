import assert from 'node:assert/strict';
import test from 'node:test';
import type {ClientMindMap} from '../apps/web/src/client-mind-maps';
import {MindMapHistory,mindMapContentKey} from '../apps/web/src/mind-map-history';

const map:ClientMindMap={id:'map',clientId:'client',title:'Campanha',description:'Estratégia',nodes:[{id:'root',parentId:null,text:'Campanha',color:'#5b36f2',x:500,y:300}],createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-01T00:00:00.000Z'};
const move=(x:number):ClientMindMap=>({...map,nodes:[{...map.nodes[0],x}]});

test('desfaz e refaz posições, registrando uma nova data de atualização',()=>{
 const history=new MindMapHistory(map);
 const moved=history.commit(move(650),'move-time')!;
 assert.equal(moved.nodes[0].x,650);assert.equal(history.canUndo,true);
 assert.equal(history.undo('undo-time')?.nodes[0].x,500);assert.equal(history.canRedo,true);
 const redone=history.redo('redo-time')!;
 assert.equal(redone.nodes[0].x,650);assert.equal(redone.updatedAt,'redo-time');
 assert.equal(history.canRedo,false);
});

test('suporta alterações rápidas sem depender de um novo render e ignora confirmações antigas',()=>{
 const history=new MindMapHistory(map),first=history.commit(move(600))!,second=history.commit(move(700))!;
 assert.equal(history.observe({...first,updatedAt:'server-first'}),false);
 assert.equal(history.observe({...second,updatedAt:'server-second'}),false);
 assert.equal(history.undo()?.nodes[0].x,600);
 assert.equal(history.undo()?.nodes[0].x,500);
 assert.equal(history.canUndo,false);
});

test('não invalida o histórico por datas ou por props que ainda aguardam o salvamento',()=>{
 const history=new MindMapHistory(map);
 history.commit(move(600));
 assert.equal(history.observe({...map,updatedAt:'metadata-only'}),false);
 assert.equal(history.canUndo,true);
 assert.equal(mindMapContentKey(map),mindMapContentKey({...map,updatedAt:'another-date'}));
});

test('invalida o histórico ao receber uma edição externa de texto, estrutura ou posição',()=>{
 const changes=[{...move(710)},{...map,title:'Editado por outra pessoa'},{...map,description:'Novo contexto'},{...map,nodes:[...map.nodes,{id:'other',parentId:'root',text:'Novo',color:'#000'}]}];
 for(const remote of changes){
  const history=new MindMapHistory(map);history.commit(move(600));
  assert.equal(history.observe(remote),true);
  assert.equal(history.canUndo,false);assert.equal(history.canRedo,false);
  assert.equal(history.undo(),undefined);
 }
});

test('trocar o mapa ou fechar a seleção descarta o histórico anterior',()=>{
 const history=new MindMapHistory(map);history.commit(move(600));
 assert.equal(history.observe({...map,id:'another'}),true);
 assert.equal(history.canUndo,false);
 assert.equal(history.commit(move(700)),undefined);
 history.observe(undefined);
 assert.equal(history.mapId,undefined);assert.equal(history.undo(),undefined);
});

test('limita o histórico a 50 ações e descarta refazer após uma nova edição',()=>{
 const history=new MindMapHistory(map);
 for(let index=1;index<=70;index++)history.commit(move(500+index));
 let count=0,last:ClientMindMap|undefined;
 while(history.canUndo){last=history.undo();count++}
 assert.equal(count,50);assert.equal(last?.nodes[0].x,520);
 history.commit(move(900));assert.equal(history.canRedo,false);
});

test('ignora edições sem mudança real e protege os snapshots de mutação',()=>{
 const history=new MindMapHistory(map);
 assert.equal(history.commit({...map,updatedAt:'new-time'}),undefined);
 assert.equal(history.canUndo,false);
 const input=move(600),saved=history.commit(input)!;
 input.nodes[0].x=999;saved.nodes[0].x=888;
 assert.equal(history.undo()?.nodes[0].x,500);
 assert.equal(history.redo()?.nodes[0].x,600);
});
