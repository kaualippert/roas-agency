import assert from 'node:assert/strict';
import test from 'node:test';
import {sortTasks,normalizeTaskSort} from '../apps/web/src/task-sorting';
import type {Task} from '../apps/web/src/types';
const task=(id:string,title:string,createdAt:string,dueDate='2099-01-01'):Task=>({id,title,createdAt,updatedAt:createdAt,dueDate,description:'',clientId:'',projectId:'',responsibleId:'',status:'todo',priority:'medium',tags:[],position:0,commentsCount:0,attachmentsCount:0});
test('ordena por criação, sem usar prazo ou alterar a lista original',()=>{
 const tasks=[task('old','Zebra','2026-01-01T12:00:00Z','2099-02-01'),task('new','Abelha','2026-02-01T12:00:00Z','2099-01-01')];
 assert.deepEqual(sortTasks(tasks,'newest').map(item=>item.id),['new','old']);
 assert.deepEqual(sortTasks(tasks,'oldest').map(item=>item.id),['old','new']);
 assert.deepEqual(tasks.map(item=>item.id),['old','new']);
 assert.equal(normalizeTaskSort('invalid'),'due');
});
test('datas inválidas ficam no final nas duas ordens de criação',()=>{
 const tasks=[task('invalid','Sem data',''),task('valid','Com data','2026-01-01T00:00:00Z')];
 for(const order of ['newest','oldest'])assert.equal(sortTasks(tasks,order)[1].id,'invalid');
});
test('ordena títulos numericamente e mantém prazo e prioridade disponíveis',()=>{
 const tasks=[task('10','Tarefa 10','2026-01-01','2099-01-01'),task('2','Tarefa 2','2026-01-01','2099-02-01')];
 assert.deepEqual(sortTasks(tasks,'title_asc').map(item=>item.id),['2','10']);
 assert.deepEqual(sortTasks(tasks,'title_desc').map(item=>item.id),['10','2']);
 assert.equal(sortTasks(tasks,'due')[0].id,'10');
 tasks[1].priority='urgent';
 assert.equal(sortTasks(tasks,'priority')[0].id,'2');
});
