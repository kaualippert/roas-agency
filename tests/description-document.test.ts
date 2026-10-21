import assert from 'node:assert/strict';
import test from 'node:test';
import {clipboardPlainDescription,descriptionInlineHtml,descriptionToHtml} from '../apps/web/src/description-document';

test('transforma tabela Markdown em estrutura real com cabeçalho e linhas',()=>{
 const html=descriptionToHtml('| Anúncio | Conteúdo | Teste |\n| --- | --- | --- |\n| **Sorriso** | Planejar lentes | Naturalidade |\n| Dúvidas | Cuidados | Qualificação |');
 assert.equal((html.match(/<th>/g)||[]).length,3);
 assert.equal((html.match(/<td>/g)||[]).length,6);
 assert.match(html,/<strong>Sorriso<\/strong>/);
 assert.equal(html.includes('| --- |'),false);
});
test('tabelas preservam pipes escapados e células vazias ou extras',()=>{
 const html=descriptionToHtml('| Um | Dois |\n| --- | --- |\n| A \\| B | | Extra |');
 assert.match(html,/A \| B/);assert.equal((html.match(/<td>/g)||[]).length,3);
});
test('interpreta títulos, listas, citações, código e checklist',()=>{
 const html=descriptionToHtml('## Plano\n- Um\n- Dois\n\n1. Primeiro\n2. Segundo\n> Atenção\n- [x] Feito\n```\n<script>não executar</script>\n```');
 for(const tag of ['h2','ul','ol','blockquote','pre'])assert.match(html,new RegExp('<'+tag+'>'));
 assert.match(html,/data-line="7" checked disabled/);
 assert.match(html,/&lt;script&gt;não executar&lt;\/script&gt;/);
});
test('gera apenas formatação segura, com combinações e links validados',()=>{
 const html=descriptionInlineHtml('**Texto _importante_** [site](https://example.com) [ruim](javascript:alert) [color=#dc2626]~~fim~~[/color] <img src=x onerror=alert(1)>');
 assert.match(html,/<strong>Texto <em>importante<\/em><\/strong>/);
 assert.match(html,/href="https:\/\/example.com"/);
 assert.equal(html.includes('href="javascript:'),false);
 assert.equal(html.includes('<img'),false);
 assert.match(html,/color:#dc2626/);
});
test('texto tabulado do clipboard vira tabela e mantém caracteres especiais',()=>{
 const text=clipboardPlainDescription('Anúncio\tConteúdo\r\nSorriso\tA | B');
 assert.match(text,/\| --- \| --- \|/);
 assert.match(descriptionToHtml(text),/A \| B/);
 assert.equal(clipboardPlainDescription('Texto\r\nnormal'),'Texto\nnormal');
});
test('listas aninhadas mantêm a hierarquia e descrições vazias continuam vazias',()=>{
 const html=descriptionToHtml('- Campanha\n  - Público\n  - Criativos\n- Relatório');
 assert.match(html,/<li>Campanha<ul><li>Público<\/li><li>Criativos<\/li><\/ul><\/li>/);
 assert.equal(descriptionToHtml(''),'');
});
