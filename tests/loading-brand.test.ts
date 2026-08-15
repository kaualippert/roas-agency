import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeLoadingBrand} from '../apps/web/src/loading-brand';

test('preserva a identidade visual válida na tela de carregamento',()=>{
 const brand=normalizeLoadingBrand({agencyName:' Agência Teste ',logoDataUrl:'data:image/png;base64,abc',logoScale:165});
 assert.deepEqual(brand,{agencyName:'Agência Teste',logoDataUrl:'data:image/png;base64,abc',logoScale:165});
});

test('descarta logos inseguras e limita o zoom',()=>{
 const brand=normalizeLoadingBrand({agencyName:'',logoDataUrl:'https://site.test/logo.svg',logoScale:999});
 assert.deepEqual(brand,{agencyName:'ROAS',logoDataUrl:'',logoScale:200});
});
