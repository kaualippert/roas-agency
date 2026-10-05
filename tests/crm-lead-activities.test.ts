import assert from 'node:assert/strict';
import test from 'node:test';
import {appendCRMLeadObservation,type CRMLead} from '../apps/web/src/crm-leads';
import {createCRMFollowUpTask} from '../apps/web/src/crm-lead-activities';

const lead:CRMLead={id:'lead-1',name:'Agência Horizonte',contact:'Maria',phone:'11999990000',responsibleId:'member-1',value:2000,stage:'Em andamento',source:'Indicação',nextAction:'Enviar proposta',color:'#6541ee'};

test('adiciona observações ao lead sem apagar as anteriores',()=>{
 const first=appendCRMLeadObservation(lead,{id:'note-1',text:'  Conversamos sobre o orçamento.  ',createdAt:'2026-10-05T12:00:00.000Z',authorName:'Ana'});
 const second=appendCRMLeadObservation(first,{id:'note-2',text:'Retornar na sexta-feira.',createdAt:'2026-10-06T12:00:00.000Z',authorName:'Bruno'});
 assert.equal(lead.observations,undefined);
 assert.deepEqual(second.observations?.map(note=>note.text),['Conversamos sobre o orçamento.','Retornar na sexta-feira.']);
 assert.equal(second.updatedAt,'2026-10-06T12:00:00.000Z');
 assert.equal(appendCRMLeadObservation(lead,{id:'empty',text:'  ',createdAt:'now',authorName:'Ana'}),lead);
});

test('cria tarefa de follow-up vinculada ao lead com responsável e contexto',()=>{
 const task=createCRMFollowUpTask(lead,{title:'Retornar contato',description:'Confirmar disponibilidade para reunião.',dueDate:'2026-10-08',responsibleId:'member-2'},'2026-10-05T12:00:00.000Z','task-1');
 assert.equal(task.leadId,lead.id);
 assert.equal(task.clientId,'');
 assert.equal(task.responsibleId,'member-2');
 assert.deepEqual(task.responsibleIds,['member-2']);
 assert.equal(task.status,'todo');
 assert.match(task.description,/Agência Horizonte/);
 assert.match(task.description,/Confirmar disponibilidade para reunião/);
});
