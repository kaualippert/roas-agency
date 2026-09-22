import assert from 'node:assert/strict';
import test from 'node:test';
import {removeClientRecords} from './client-deletion.js';

test('a regra de exclusão preserva registros pertencentes a outros clientes',()=>{
 const records=[{id:'a',clientId:'client-1'},{id:'b',clientId:'client-2'},{id:'global'}];
 assert.deepEqual(removeClientRecords(records,'client-1'),[records[1],records[2]]);
});
