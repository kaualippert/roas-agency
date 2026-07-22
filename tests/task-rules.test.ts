import assert from 'node:assert/strict';
import test from 'node:test';
import {effectiveTaskStatus,isTaskOverdue,localDateKey,normalizeTaskStatuses} from '../apps/web/src/task-rules.js';

test('formats the local calendar date without UTC drift',()=>{
 assert.equal(localDateKey(new Date(2026,6,22,23,30)),'2026-07-22');
});

test('moves every open task past its due date to overdue',()=>{
 for(const status of ['todo','pending','in_progress'] as const){
  const task={status,dueDate:'2026-07-21'};
  assert.equal(isTaskOverdue(task,'2026-07-22'),true);
  assert.equal(effectiveTaskStatus(task,'2026-07-22'),'overdue');
 }
});

test('does not mark current, future or undated tasks as overdue',()=>{
 assert.equal(effectiveTaskStatus({status:'todo',dueDate:'2026-07-22'},'2026-07-22'),'todo');
 assert.equal(effectiveTaskStatus({status:'in_progress',dueDate:'2026-07-23'},'2026-07-22'),'in_progress');
 assert.equal(effectiveTaskStatus({status:'pending',dueDate:''},'2026-07-22'),'pending');
});

test('a completed task never returns to overdue',()=>{
 const task={status:'completed' as const,dueDate:'2026-07-01'};
 assert.equal(isTaskOverdue(task,'2026-07-22'),false);
 assert.equal(effectiveTaskStatus(task,'2026-07-22'),'completed');
});

test('legacy overdue status becomes pending after extending the deadline',()=>{
 assert.equal(effectiveTaskStatus({status:'overdue',dueDate:'2026-07-30'},'2026-07-22'),'pending');
});

test('normalizes all statuses with a stable reference date',()=>{
 const tasks=[{id:'1',status:'todo' as const,dueDate:'2026-07-21'},{id:'2',status:'completed' as const,dueDate:'2026-07-01'}];
 const result=normalizeTaskStatuses(tasks,'2026-07-22');
 assert.equal(result[0].status,'overdue');
 assert.equal(result[1].status,'completed');
});
