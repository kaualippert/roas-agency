import assert from 'node:assert/strict';
import test from 'node:test';
import {insertDescriptionChecklist,parseTaskDescription,parseTaskDescriptionLines,toggleDescriptionChecklist,validTaskLink,wrapDescriptionSelection} from '../apps/web/src/task-description';

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

test('aplica cor segura preservando formatação interna',()=>{
 assert.deepEqual(parseTaskDescription('[color=#DC2626]**Urgente**[/color]'),[{type:'bold',value:'Urgente',color:'#dc2626'}]);
 assert.deepEqual(wrapDescriptionSelection('Prazo hoje',0,5,'[color=#2563eb]','[/color]'),{value:'[color=#2563eb]Prazo[/color] hoje',selectionStart:15,selectionEnd:20});
});

test('cria, interpreta e alterna itens de checklist',()=>{
 assert.deepEqual(insertDescriptionChecklist('Planejar\nPublicar',0,17),{value:'- [ ] Planejar\n- [ ] Publicar',selectionStart:0,selectionEnd:29});
 assert.deepEqual(parseTaskDescriptionLines('- [ ] Planejar\n- [x] Publicar'),[
  {type:'checklist',checked:false,tokens:[{type:'text',value:'Planejar'}]},
  {type:'checklist',checked:true,tokens:[{type:'text',value:'Publicar'}]},
 ]);
 assert.equal(toggleDescriptionChecklist('- [ ] Planejar\n- [x] Publicar',0),'- [x] Planejar\n- [x] Publicar');
 assert.equal(toggleDescriptionChecklist('- [ ] Planejar\n- [x] Publicar',1),'- [ ] Planejar\n- [ ] Publicar');
});
