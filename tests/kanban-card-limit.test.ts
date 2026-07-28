import assert from 'node:assert/strict';
import test from 'node:test';
import {hiddenKanbanCardCount,KANBAN_CARD_LIMIT,visibleKanbanCards} from '../apps/web/src/KanbanColumnLimit.js';

test('shows at most five cards while a column is collapsed',()=>{
 const cards=Array.from({length:8},(_,index)=>index+1);
 assert.equal(KANBAN_CARD_LIMIT,5);
 assert.deepEqual(visibleKanbanCards(cards),[1,2,3,4,5]);
});

test('shows every card after expanding the column',()=>{
 const cards=Array.from({length:8},(_,index)=>index+1);
 assert.deepEqual(visibleKanbanCards(cards,true),cards);
});

test('only reports hidden cards when the column exceeds the limit',()=>{
 assert.equal(hiddenKanbanCardCount(4),0);
 assert.equal(hiddenKanbanCardCount(5),0);
 assert.equal(hiddenKanbanCardCount(8),3);
});
