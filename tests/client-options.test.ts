import assert from 'node:assert/strict';
import test from 'node:test';
import {selectableClients} from '../apps/web/src/client-options';
import type {Client} from '../apps/web/src/types';

const baseClient:Client={id:'active',companyName:'Ativo',contactName:'',email:'',phone:'',instagram:'',segment:'',city:'',status:'active',managerId:'',monthlyRevenue:0,startDate:'',notes:'',color:'#000',createdAt:'',updatedAt:''};
const inactiveClient:Client={...baseClient,id:'inactive',companyName:'Inativo',status:'inactive'};
const prospectClient:Client={...baseClient,id:'prospect',companyName:'Prospect',status:'prospect'};

test('oferece apenas clientes ativos em novos vínculos de tarefas e projetos',()=>{
 assert.deepEqual(selectableClients([inactiveClient,baseClient,prospectClient]).map(client=>client.id),['active']);
});

test('preserva o cliente inativo já vinculado durante a edição',()=>{
 assert.deepEqual(selectableClients([baseClient,inactiveClient],'inactive').map(client=>client.id),['active','inactive']);
});
