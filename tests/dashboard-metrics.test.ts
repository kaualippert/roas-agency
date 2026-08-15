import assert from 'node:assert/strict';
import test from 'node:test';
import {dueEntriesInRange,receivedEntriesInRange} from '../apps/web/src/dashboard-metrics';
import {dashboardPeriodRange} from '../apps/web/src/dashboard-period';

const range=dashboardPeriodRange('month',new Date(2026,7,19,10));
const entries=[
 {id:'paid-now',status:'received' as const,dueDate:'2026-07-10',receivedAt:'2026-08-05'},
 {id:'paid-later',status:'received' as const,dueDate:'2026-08-10',receivedAt:'2026-09-01'},
 {id:'legacy',status:'received' as const,dueDate:'2026-08-11'},
 {id:'pending',status:'pending' as const,dueDate:'2026-08-12'},
];

test('recebimentos usam receivedAt, não a data de vencimento',()=>{
 assert.deepEqual(receivedEntriesInRange(entries,range).map(entry=>entry.id),['paid-now']);
});

test('previsões continuam usando vencimentos dentro do intervalo fechado',()=>{
 assert.deepEqual(dueEntriesInRange(entries,range).map(entry=>entry.id),['paid-later','legacy','pending']);
});
