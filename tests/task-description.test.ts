import assert from 'node:assert/strict';
import test from 'node:test';
import {parseTaskDescription,validTaskLink,wrapDescriptionSelection} from '../apps/web/src/task-description';

test('aplica formatação somente ao trecho selecionado',()=>{
 assert.deepEqual(wrapDescriptionSelection('Revisar campanha',0,7,'**'),{value:'**Revisar** campanha',selectionStart:2,selectionEnd:9});
 assert.equal(wrapDescriptionSelection('',0,0,'~~').value,'~~texto~~');
});

test('interpreta negrito, itálico e tachado como tokens seguros',()=>{
 assert.deepEqual(parseTaskDescription('Use **negrito**, _itálico_ e ~~tachado~~.'),[
  {type:'text',value:'Use '},{type:'bold',value:'negrito'},{type:'text',value:', '},{type:'italic',value:'itálico'},{type:'text',value:' e '},{type:'strike',value:'tachado'},{type:'text',value:'.'},
 ]);
 assert.deepEqual(parseTaskDescription('<img src=x onerror=alert(1)>'),[{type:'text',value:'<img src=x onerror=alert(1)>'}]);
});

test('aceita somente links http e https',()=>{
 assert.equal(validTaskLink('https://flowroas.space/tarefas'),true);
 assert.equal(validTaskLink('javascript:alert(1)'),false);
 assert.equal(validTaskLink('arquivo-local'),false);
});
