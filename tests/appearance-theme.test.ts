import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeThemePreference,resolveGlassEffect,resolveThemePreference,themeChoices} from '../apps/web/src/appearance-theme';

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

test('efeito Glass é opcional e a escolha explícita vale em todos os temas',()=>{
 for(const {value} of themeChoices){
  assert.equal(resolveGlassEffect(value,null),value==='apple-glass');
  assert.equal(resolveGlassEffect(value,true),true);
  assert.equal(resolveGlassEffect(value,false),false);
 }
});
