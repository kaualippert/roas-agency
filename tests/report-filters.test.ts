import assert from 'node:assert/strict';
import test from 'node:test';
import {filterReports,reportMatchesPeriod,reportMatchesStatus} from '../apps/web/src/report-filters.js';
import type {GenericItem} from '../apps/web/src/types.js';

function report(overrides:Partial<GenericItem>):GenericItem{
 return {
  id:'report-1',
  name:'Performance mensal',
  status:'Pendente',
  date:'2026-07-10',
  createdAt:'2026-07-10T12:00:00.000Z',
  updatedAt:'2026-07-10T12:00:00.000Z',
  ...overrides,
 };
}

const referenceDate=new Date(2026,6,27);

test('filters reports by pending and sent status',()=>{
 assert.equal(reportMatchesStatus(report({status:'Pendente'}),'pending'),true);
 assert.equal(reportMatchesStatus(report({status:'Enviado'}),'sent'),true);
 assert.equal(reportMatchesStatus(report({status:'Enviado'}),'pending'),false);
});

test('filters reports by calendar month without timezone drift',()=>{
 assert.equal(reportMatchesPeriod(report({date:'2026-07-01'}),'this_month',referenceDate),true);
 assert.equal(reportMatchesPeriod(report({date:'2026-06-30'}),'last_month',referenceDate),true);
 assert.equal(reportMatchesPeriod(report({date:'2026-05-01'}),'last_3_months',referenceDate),true);
 assert.equal(reportMatchesPeriod(report({date:'2026-04-30'}),'last_3_months',referenceDate),false);
});

test('combines search, status and period filters',()=>{
 const reports=[
  report({id:'1',name:'Performance julho',status:'Enviado',date:'2026-07-10'}),
  report({id:'2',name:'Performance junho',status:'Enviado',date:'2026-06-10'}),
  report({id:'3',name:'Resultados julho',description:'Performance social',status:'Pendente',date:'2026-07-12'}),
 ];
 const result=filterReports(reports,'performance','sent','this_month',referenceDate);
 assert.deepEqual(result.map(item=>item.id),['1']);
});

test('uses updated date when an old report has no reference date',()=>{
 assert.equal(reportMatchesPeriod(report({date:undefined,updatedAt:'2026-07-02T23:00:00.000Z'}),'this_month',referenceDate),true);
});
