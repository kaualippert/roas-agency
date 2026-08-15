import assert from 'node:assert/strict';
import test from 'node:test';
import {findMarketingResourceConflict,markMarketingIntegrationSynced,migratableLegacyMarketingIntegrations,migrateLegacyMarketingIntegration,normalizeClientMarketingIntegrations,upsertClientMarketingIntegration,type ClientMarketingIntegration} from '../apps/web/src/marketing-integrations';

const integration=(changes:Partial<ClientMarketingIntegration>={}):ClientMarketingIntegration=>({
 schemaVersion:1,id:'link-1',clientId:'client-1',provider:'meta_ads',status:'connected',primaryName:'BM Principal',primaryId:'bm-1',resourceName:'Conta Principal',resourceId:'act_1',accessEmail:'admin@example.com',autoSync:true,connectedAt:'2026-08-01T10:00:00.000Z',createdAt:'2026-08-01T10:00:00.000Z',updatedAt:'2026-08-01T10:00:00.000Z',...changes,
});

test('normaliza vínculos antigos e mantém apenas um por cliente e plataforma',()=>{
 const normalized=normalizeClientMarketingIntegrations([
  {...integration(),schemaVersion:undefined,createdAt:undefined,updatedAt:undefined},
  integration({id:'duplicated',resourceId:'act_2'}),
  {id:'invalid',clientId:'',provider:'meta_ads'},
 ]);
 assert.equal(normalized.length,1);
 assert.equal(normalized[0].schemaVersion,1);
 assert.equal(normalized[0].id,'link-1');
 assert.equal(normalized[0].createdAt,normalized[0].connectedAt);
});

test('atualiza o vínculo natural sem trocar seu identificador permanente',()=>{
 const updated=upsertClientMarketingIntegration([integration()],integration({id:'temporary',resourceName:'Conta Nova'}));
 assert.equal(updated.length,1);
 assert.equal(updated[0].id,'link-1');
 assert.equal(updated[0].resourceName,'Conta Nova');
 assert.equal(updated[0].createdAt,'2026-08-01T10:00:00.000Z');
});

test('impede a mesma conta externa de ser vinculada a clientes diferentes',()=>{
 const conflict=findMarketingResourceConflict([integration()],integration({id:'link-2',clientId:'client-2'}));
 assert.equal(conflict?.clientId,'client-1');
 assert.equal(findMarketingResourceConflict([integration()],integration({resourceId:'act_2'})),undefined);
});

test('registra sincronização sem recriar o vínculo',()=>{
 const synced=markMarketingIntegrationSynced([integration({status:'error'})],'link-1','2026-08-15T12:00:00.000Z');
 assert.equal(synced[0].id,'link-1');
 assert.equal(synced[0].status,'connected');
 assert.equal(synced[0].lastSync,'2026-08-15T12:00:00.000Z');
 assert.equal(synced[0].updatedAt,'2026-08-15T12:00:00.000Z');
});

test('identifica apenas cadastros manuais que possuem uma conta aproveitável',()=>{
 const candidates=migratableLegacyMarketingIntegrations([
  {id:'legacy-meta',provider:'meta',accountId:'act_123'},
  {id:'empty-google',provider:'google',accountId:''},
  {id:'unsupported',provider:'analytics',accountId:'123'},
 ]);
 assert.deepEqual(candidates.map(item=>item.id),['legacy-meta']);
});

test('migra a conta antiga preservando dados e adicionando o cliente',()=>{
 const migrated=migrateLegacyMarketingIntegration({id:'legacy-google',provider:'google',accountName:'Conta Ads',accountId:'123-456-7890',email:'media@example.com',autoSync:true,connectedAt:'2026-07-10T10:00:00.000Z',lastSync:'2026-07-11T10:00:00.000Z'},{clientId:'client-2',primaryName:'Manager Agência',primaryId:'999-888-7777'},'2026-08-15T12:00:00.000Z');
 assert.equal(migrated.clientId,'client-2');
 assert.equal(migrated.provider,'google_ads');
 assert.equal(migrated.legacySourceId,'legacy-google');
 assert.equal(migrated.resourceName,'Conta Ads');
 assert.equal(migrated.resourceId,'123-456-7890');
 assert.equal(migrated.accessEmail,'media@example.com');
 assert.equal(migrated.createdAt,'2026-07-10T10:00:00.000Z');
 assert.equal(migrated.updatedAt,'2026-08-15T12:00:00.000Z');
});
