import assert from 'node:assert/strict';
import test from 'node:test';
import {config} from './config.js';
import {decryptSecret,encryptSecret,signOAuthState,verifyOAuthState} from './marketing-oauth.js';

test('assina e valida o estado OAuth sem expor os dados',()=>{
 const previous=config.oauthStateSecret;config.oauthStateSecret='estado-oauth-de-teste-com-entropia';
 try{
  const token=signOAuthState({provider:'google',uid:'user-1',returnTo:'/marketing/integrations',nonce:'nonce-1',expiresAt:Date.now()+60_000});
  assert.equal(token.includes('user-1'),false);
  assert.equal(verifyOAuthState(token).uid,'user-1');
  assert.throws(()=>verifyOAuthState(`${token.slice(0,-1)}x`),/inválido/);
 }finally{config.oauthStateSecret=previous}
});

test('criptografa tokens OAuth com AES-GCM',()=>{
 const previous=config.marketingTokenEncryptionKey;config.marketingTokenEncryptionKey='chave-de-teste-longa-e-diferente';
 try{
  const encrypted=encryptSecret('access-token-secreto');
  assert.notEqual(encrypted.value,'access-token-secreto');
  assert.equal(decryptSecret(encrypted),'access-token-secreto');
 }finally{config.marketingTokenEncryptionKey=previous}
});
