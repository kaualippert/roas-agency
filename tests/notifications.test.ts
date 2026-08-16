import assert from 'node:assert/strict';
import test from 'node:test';
import {createGoalAchievementNotification,createVersionNotification,mergeNotificationAlerts,notificationTarget,type AppNotification} from '../apps/web/src/notifications';

const now='2026-08-04T12:00:00.000Z';

test('cria uma notificação estável para cada versão publicada',()=>{
 const notification=createVersionNotification('abcdef123456',now);
 assert.equal(notification?.id,'app-version-abcdef123456');
 assert.equal(notification?.type,'version');
 assert.match(notification?.description||'',/build abcdef1/);
 assert.equal(createVersionNotification('',now),null);
});

test('cria uma notificação mensal estável quando a meta é atingida',()=>{
 const date=new Date('2026-08-16T12:00:00.000Z');
 const notification=createGoalAchievementNotification('2026-08-10T10:00:00.000Z',date);
 assert.equal(notification.id,'crm-goal-achieved-2026-08-2026-08-10T10:00:00.000Z');
 assert.equal(notification.type,'goal');
 assert.equal(notification.targetPath,'/crm');
});

test('notificação de tarefa aponta para a tarefa específica',()=>{
 assert.equal(notificationTarget({taskId:'task/42',targetPath:'/tasks'}),'/tasks?task=task%2F42');
 assert.equal(notificationTarget({targetPath:'/reports'}),'/reports');
});

test('alertas antigos recebem o identificador e itens descartados não reaparecem',()=>{
 const current:AppNotification[]=[{id:'task-alert',title:'Tarefa atrasada',description:'Revisar campanha',type:'task',read:true,createdAt:now}];
 const alert:AppNotification={...current[0],read:false,taskId:'task-1',targetPath:'/tasks'};
 const enriched=mergeNotificationAlerts(current,[alert],[]);
 assert.equal(enriched[0].read,true);
 assert.equal(enriched[0].taskId,'task-1');
 assert.deepEqual(mergeNotificationAlerts([], [alert], ['task-alert']),[]);
});
