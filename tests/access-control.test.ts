import assert from 'node:assert/strict';
import test from 'node:test';
import {canAccessPath,firstAllowedPath} from '../apps/web/src/app/access-control';

test('verified server areas override the permissive legacy fallback',()=>{
 assert.equal(canAccessPath(undefined,'/dashboard',['general']),true);
 assert.equal(canAccessPath(undefined,'/settings',['general']),false);
 assert.equal(canAccessPath(undefined,'/finance',['general']),false);
});

test('redirects a restricted member to the first server-authorized area',()=>{
 assert.equal(firstAllowedPath(undefined,['marketing']),'/marketing/dashboard');
 assert.equal(firstAllowedPath(undefined,['finance']),'/finance');
});

test('protects every nested marketing route with the marketing permission',()=>{
 assert.equal(canAccessPath(undefined,'/marketing/dashboard',['marketing']),true);
 assert.equal(canAccessPath(undefined,'/marketing/integrations',['general']),false);
 assert.equal(canAccessPath(undefined,'/marketing/reports',['marketing']),true);
});
