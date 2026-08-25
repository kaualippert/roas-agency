import assert from 'node:assert/strict';
import test from 'node:test';
import {layoutMindMapNodes,mindMapDescendantIds,removeMindMapBranch,type ClientMindMapNode} from '../apps/web/src/client-mind-maps';

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
