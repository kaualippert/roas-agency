import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveApiUrl} from '../api/index.js';

test('reconstructs the Express API path from the Vercel rewrite',()=>{
  assert.equal(resolveApiUrl({path:'health'}),'/api/health');
  assert.equal(resolveApiUrl({path:'state/clients',page:'2'}),'/api/state/clients?page=2');
});
