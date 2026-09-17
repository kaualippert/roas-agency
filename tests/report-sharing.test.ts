import assert from 'node:assert/strict';
import test from 'node:test';
import {buildReportShareText,reportEmailUrl,reportWhatsAppUrl} from '../apps/web/src/report-sharing';

const report={name:'Performance de setembro',clientName:'Cliente Teste',period:'01/09/2026 até 30/09/2026',description:'Crescimento consistente.',recommendations:'Escalar os melhores anúncios.',metricIds:['spend','results'] as const,metricValues:{spend:1500,results:30},agencyName:'Agência ROAS'};

test('gera uma mensagem de relatório pronta para o cliente',()=>{
 const text=buildReportShareText({...report,metricIds:[...report.metricIds]});
 assert.match(text,/Performance de setembro/);assert.match(text,/Investimento: R\$\s1\.500,00/);assert.match(text,/Resultados: 30/);assert.match(text,/Escalar os melhores anúncios/);
});

test('gera links seguros para e-mail e WhatsApp',()=>{
 const email=reportEmailUrl('cliente@example.com','Relatório mensal','Olá & resultados');
 assert.match(email,/^mailto:cliente%40example\.com/);assert.match(email,/Ol%C3%A1%20%26%20resultados/);
 const whatsapp=reportWhatsAppUrl('Olá cliente','+55 (51) 99999-0000');
 assert.match(whatsapp,/wa\.me\/5551999990000/);assert.match(whatsapp,/Ol%C3%A1%20cliente/);
});
