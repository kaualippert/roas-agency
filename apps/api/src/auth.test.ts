import assert from 'node:assert/strict';
import test from 'node:test';
import {getBearerToken} from './auth.js';

test('extracts only a valid bearer token',()=>{
 assert.equal(getBearerToken('Bearer firebase-token'),'firebase-token');
 assert.equal(getBearerToken('bearer another-token'),'another-token');
 assert.equal(getBearerToken('Basic credentials'),null);
 assert.equal(getBearerToken('Bearer token with spaces'),null);
 assert.equal(getBearerToken(),null);
});
