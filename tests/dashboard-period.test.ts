import assert from 'node:assert/strict';
import test from 'node:test';
import {dashboardPeriodStart,dashboardPeriods} from '../apps/web/src/dashboard-period';

test('este mês começa no primeiro dia do mês atual',()=>{
 const start=dashboardPeriodStart('month',new Date(2026,7,19,18,45));
 assert.equal(start.getFullYear(),2026);
 assert.equal(start.getMonth(),7);
 assert.equal(start.getDate(),1);
 assert.equal(start.getHours(),0);
});

test('mantém os períodos móveis existentes',()=>{
 const reference=new Date(2026,7,19,12);
 assert.equal(dashboardPeriodStart('30d',reference).getTime(),new Date(2026,6,20).getTime());
 assert.equal(dashboardPeriods.month.label,'Este mês');
});
