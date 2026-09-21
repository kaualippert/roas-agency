import assert from 'node:assert/strict';
import test from 'node:test';
import {currentBillingDate} from '../apps/web/src/financial-entries.ts';

test('mantém vencimentos nos dias 29, 30 e 31 quando o mês permite',()=>{
  assert.equal(currentBillingDate(31,new Date(2026,6,10)),'2026-07-31');
  assert.equal(currentBillingDate(30,new Date(2026,8,10)),'2026-09-30');
});

test('ajusta o vencimento somente para o último dia real do mês',()=>{
  assert.equal(currentBillingDate(31,new Date(2026,1,10)),'2026-02-28');
  assert.equal(currentBillingDate(31,new Date(2028,1,10)),'2028-02-29');
});
