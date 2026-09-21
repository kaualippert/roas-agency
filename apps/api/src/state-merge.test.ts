import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeConcurrentState,StateConflictError} from './state-merge.js';

test('combina alterações concorrentes em registros diferentes',()=>{
  const base=[{id:'a',title:'A',status:'todo'},{id:'b',title:'B',status:'todo'}];
  const current=[{id:'a',title:'A',status:'done'},{id:'b',title:'B',status:'todo'}];
  const incoming=[{id:'a',title:'A',status:'todo'},{id:'b',title:'B editado',status:'todo'}];
  assert.deepEqual(mergeConcurrentState(base,current,incoming),[
    {id:'a',title:'A',status:'done'},
    {id:'b',title:'B editado',status:'todo'},
  ]);
});

test('combina campos diferentes do mesmo registro',()=>{
  const base=[{id:'a',title:'A',status:'todo'}];
  const current=[{id:'a',title:'A',status:'done'}];
  const incoming=[{id:'a',title:'Novo título',status:'todo'}];
  assert.deepEqual(mergeConcurrentState(base,current,incoming),[{id:'a',title:'Novo título',status:'done'}]);
});

test('preserva inclusões concorrentes sem duplicar registros',()=>{
  const base=[{id:'a',title:'A'}];
  const current=[{id:'c',title:'Servidor'},{id:'a',title:'A'}];
  const incoming=[{id:'b',title:'Navegador'},{id:'a',title:'A'}];
  assert.deepEqual(mergeConcurrentState(base,current,incoming),[
    {id:'b',title:'Navegador'},
    {id:'a',title:'A'},
    {id:'c',title:'Servidor'},
  ]);
});

test('combina as primeiras inclusões feitas ao mesmo tempo',()=>{
  assert.deepEqual(mergeConcurrentState(
    [],
    [{id:'a',title:'Primeiro usuário'}],
    [{id:'b',title:'Segundo usuário'}],
  ),[
    {id:'b',title:'Segundo usuário'},
    {id:'a',title:'Primeiro usuário'},
  ]);
});

test('bloqueia alterações incompatíveis no mesmo campo',()=>{
  assert.throws(()=>mergeConcurrentState(
    [{id:'a',title:'Original'}],
    [{id:'a',title:'Servidor'}],
    [{id:'a',title:'Navegador'}],
  ),StateConflictError);
});

test('não restaura um registro removido por outra pessoa quando ele não mudou localmente',()=>{
  const base=[{id:'a',title:'A'},{id:'b',title:'B'}];
  const current=[{id:'a',title:'A'}];
  const incoming=[{id:'a',title:'A'},{id:'b',title:'B'}];
  assert.deepEqual(mergeConcurrentState(base,current,incoming),[{id:'a',title:'A'}]);
});
