import assert from 'node:assert/strict';
import test from 'node:test';
import {clientProcessProgress,clientProcessSummary} from '../apps/web/src/client-processes';

test('calcula o progresso do checklist do processo',()=>{
 const process={items:[
  {id:'1',title:'Planejar',completed:true},
  {id:'2',title:'Executar',completed:false},
  {id:'3',title:'Aprovar',completed:true},
 ]};
 assert.equal(clientProcessProgress(process),67);
 assert.deepEqual(clientProcessSummary(process),{completed:2,total:3,progress:67});
});

test('processo sem etapas começa em zero por cento',()=>{
 assert.equal(clientProcessProgress({items:[]}),0);
});
