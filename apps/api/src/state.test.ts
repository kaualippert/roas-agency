import assert from 'node:assert/strict';
import test from 'node:test';
import {isAllowedKey} from './state.js';

test('accepts application collections and rejects arbitrary keys',()=>{
  assert.equal(isAllowedKey('clients'),true);
  assert.equal(isAllowedKey('financial_entries'),true);
  assert.equal(isAllowedKey('notification_preferences'),true);
  assert.equal(isAllowedKey('notification_sound_enabled'),true);
  assert.equal(isAllowedKey('unknown_collection'),false);
});
