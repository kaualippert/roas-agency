import assert from 'node:assert/strict';
import test from 'node:test';
import {recordPomodoroRun,mergePomodoroRecord,pomodoroTotals,type PomodoroRun} from '../apps/web/src/pomodoro-tracking';
const start=Date.parse('2026-11-24T12:00:00Z');
const run:PomodoroRun={id:'focus-1',phase:'focus',startedAt:start,endsAt:start+1500000,personId:'user-1',personName:'Ana'};
test('limita o foco ao término do cronômetro e conta o ciclo uma única vez',()=>{
 const complete=recordPomodoroRun(run,start+3600000);
 assert.equal(complete.seconds,1500);assert.equal(complete.completed,true);
 const records=mergePomodoroRecord([complete],complete);
 assert.equal(records.length,1);assert.deepEqual(pomodoroTotals(records),{focusSeconds:1500,breakSeconds:0,cycles:1});
});
test('pausar e retomar soma somente segmentos ativos e não conta ciclos parciais',()=>{
 const partial=recordPomodoroRun(run,start+60000);
 const resumed=recordPomodoroRun({...run,id:'resume',startedAt:start+600000,endsAt:start+2040000},start+2040000);
 assert.deepEqual(pomodoroTotals([partial,resumed]),{focusSeconds:1500,breakSeconds:0,cycles:1});
});
test('checkpoint substitui o anterior sem duplicar tempo ou regredir',()=>{
 const first=recordPomodoroRun(run,start+30000),second=recordPomodoroRun(run,start+60000);
 const records=mergePomodoroRecord([first],second);
 assert.equal(records.length,1);assert.equal(records[0].seconds,60);
 assert.equal(mergePomodoroRecord(records,first),records);
});
test('descanso é separado do foco e não gera ciclo de foco',()=>{
 const rest=recordPomodoroRun({...run,id:'rest',phase:'break',endsAt:start+300000},start+120000);
 assert.deepEqual(pomodoroTotals([rest]),{focusSeconds:0,breakSeconds:120,cycles:0});
});
