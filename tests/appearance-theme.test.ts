import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeThemePreference,resolveThemePreference} from '../apps/web/src/appearance-theme';

test('tema claro permanece claro, inclusive sem depender do sistema',()=>{
 assert.deepEqual(resolveThemePreference('light',true),{theme:'light',variant:null});
});

test('all black usa a base escura e ativa a variante preta',()=>{
 assert.deepEqual(resolveThemePreference('all-black',false),{theme:'dark',variant:'all-black'});
});

test('preferência do sistema acompanha o dispositivo e valores antigos são normalizados',()=>{
 assert.deepEqual(resolveThemePreference('system',true),{theme:'dark',variant:null});
 assert.equal(normalizeThemePreference('all-black'),'all-black');
 assert.equal(normalizeThemePreference('desconhecido'),'light');
});
