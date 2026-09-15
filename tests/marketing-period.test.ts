import assert from 'node:assert/strict';
import test from 'node:test';
import {marketingPeriodRange,normalizeMarketingPeriodKey} from '../apps/web/src/marketing-period';

const reference=new Date(2026,8,14,15,30);

test('cria intervalos fechados equivalentes aos períodos do gerenciador de anúncios',()=>{
 assert.deepEqual(marketingPeriodRange('today',reference),{from:'2026-09-14',to:'2026-09-14'});
 assert.deepEqual(marketingPeriodRange('last_7',reference),{from:'2026-09-08',to:'2026-09-14'});
 assert.deepEqual(marketingPeriodRange('this_week',reference),{from:'2026-09-14',to:'2026-09-14'});
 assert.deepEqual(marketingPeriodRange('last_week',reference),{from:'2026-09-07',to:'2026-09-13'});
 assert.deepEqual(marketingPeriodRange('last_month',reference),{from:'2026-08-01',to:'2026-08-31'});
});

test('usa este mês quando o período persistido não é reconhecido',()=>{
 assert.equal(normalizeMarketingPeriodKey('invalid'),'this_month');
});
