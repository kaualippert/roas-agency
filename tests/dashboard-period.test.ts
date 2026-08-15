import assert from 'node:assert/strict';
import test from 'node:test';
import {dashboardDateInRange,dashboardPeriodRange,dashboardPeriodStart,dashboardPeriods} from '../apps/web/src/dashboard-period';

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

test('cria um intervalo fechado que inclui todo o dia atual',()=>{
 const range=dashboardPeriodRange('month',new Date(2026,7,19,9,30));
 assert.equal(range.from.getTime(),new Date(2026,7,1).getTime());
 assert.equal(range.to.getTime(),new Date(2026,7,19,23,59,59,999).getTime());
 assert.equal(dashboardDateInRange('2026-08-01',range),true);
 assert.equal(dashboardDateInRange('2026-08-19',range),true);
 assert.equal(dashboardDateInRange('2026-07-31',range),false);
 assert.equal(dashboardDateInRange('2026-08-20',range),false);
});

test('ignora datas ausentes ou inválidas',()=>{
 const range=dashboardPeriodRange('30d',new Date(2026,7,19,12));
 assert.equal(dashboardDateInRange(undefined,range),false);
 assert.equal(dashboardDateInRange('data-invalida',range),false);
});
