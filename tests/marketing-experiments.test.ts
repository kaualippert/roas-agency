import test from 'node:test';
import assert from 'node:assert/strict';
import {experimentProgress,normalizeMarketingExperiments,upsertMarketingExperiment,type MarketingExperiment} from '../apps/web/src/marketing-experiments.ts';

const experiment:MarketingExperiment={id:'exp-1',title:'Teste de criativo',clientId:'client-1',channel:'meta_ads',campaignName:'Campanha verão',hypothesis:'Depoimentos aumentam leads',metricKey:'leads',direction:'increase',baselineValue:10,targetValue:30,currentValue:20,spendLimit:500,spentValue:100,ownerId:'member-1',dueDate:'2026-10-01',status:'running',learning:'',createdAt:'2026-09-01T00:00:00.000Z',updatedAt:'2026-09-01T00:00:00.000Z'};

test('progresso mede aumento entre a linha de base e a meta',()=>{
 assert.equal(experimentProgress(experiment),50);
 assert.equal(experimentProgress({...experiment,currentValue:40}),100);
 assert.equal(experimentProgress({...experiment,currentValue:0}),0);
 assert.equal(experimentProgress({...experiment,currentValue:40}),100);
});

test('progresso mede redução e limita resultados ao intervalo de zero a cem',()=>{
 const reducing={...experiment,direction:'decrease' as const,metricKey:'costPerLead' as const,baselineValue:100,targetValue:40,currentValue:70};
 assert.equal(experimentProgress(reducing),50);
 assert.equal(experimentProgress({...reducing,currentValue:120}),0);
 assert.equal(experimentProgress({...reducing,currentValue:10}),100);
});

test('normalização descarta dados inválidos e preserva campos válidos',()=>{
 const normalized=normalizeMarketingExperiments([experiment,{...experiment,id:'',title:'Inválido'},{...experiment,id:'exp-2',status:'unknown',channel:'invalid',spentValue:-5}]);
 assert.equal(normalized.length,2);
 assert.equal(normalized[0].campaignName,'Campanha verão');
 assert.equal(normalized[1].status,'idea');
 assert.equal(normalized[1].channel,'other');
 assert.equal(normalized[1].spentValue,0);
});

test('upsert adiciona e atualiza sem duplicar experimento',()=>{
 const added=upsertMarketingExperiment([],experiment);
 const updated=upsertMarketingExperiment(added,{...experiment,title:'Novo nome'});
 assert.equal(added.length,1);
 assert.equal(updated.length,1);
 assert.equal(updated[0].title,'Novo nome');
 assert.equal(updated[0].createdAt,experiment.createdAt);
});
