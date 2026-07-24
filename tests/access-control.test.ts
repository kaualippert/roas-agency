import assert from 'node:assert/strict';
import test from 'node:test';
import {canAccessPath,firstAllowedPath} from '../apps/web/src/app/access-control';

test('verified server areas override the permissive legacy fallback',()=>{
 assert.equal(canAccessPath(undefined,'/dashboard',['general']),true);
 assert.equal(canAccessPath(undefined,'/settings',['general']),false);
 assert.equal(canAccessPath(undefined,'/finance',['general']),false);
});

test('redirects a restricted member to the first server-authorized area',()=>{
 assert.equal(firstAllowedPath(undefined,['marketing']),'/integrations');
 assert.equal(firstAllowedPath(undefined,['finance']),'/finance');
});
