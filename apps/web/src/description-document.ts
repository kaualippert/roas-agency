import {validTaskLink} from './task-description';

const escape=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function descriptionInlineHtml(text:string,depth=0):string{
 if(depth>12)return escape(text);
 let html='',index=0;
 while(index<text.length){
  const source=text.slice(index);
  if(source.startsWith('\\')&&source.length>1){html+=escape(source[1]);index+=2;continue}
  if(source.startsWith('<br>')){html+='<br>';index+=4;continue}
  const code=source.match(/^`([^`\n]+)`/);
  if(code){html+=`<code>${escape(code[1])}</code>`;index+=code[0].length;continue}
  const color=source.match(/^\[color=(#[\da-f]{6})\]([\s\S]*?)\[\/color\]/i);
  if(color){html+=`<span style="color:${color[1]}">${descriptionInlineHtml(color[2],depth+1)}</span>`;index+=color[0].length;continue}
  const link=source.match(/^\[([^\]\n]+)\]\(([^\s)]+)\)/);
  if(link&&validTaskLink(link[2])){html+=`<a href="${escape(link[2])}" target="_blank" rel="noopener noreferrer">${descriptionInlineHtml(link[1],depth+1)}</a>`;index+=link[0].length;continue}
  const marker=['**','__','~~','*','_'].find(item=>source.startsWith(item)&&source.indexOf(item,item.length)>item.length);
  if(marker){const end=source.indexOf(marker,marker.length),tag=marker==='**'||marker==='__'?'strong':marker==='~~'?'s':'em';html+=`<${tag}>${descriptionInlineHtml(source.slice(marker.length,end),depth+1)}</${tag}>`;index+=end+marker.length;continue}
  html+=escape(text[index++]);
 }
 return html;
}

function tableCells(line:string){
 const trimmed=line.trim().replace(/^\|/,'').replace(/(?<!\\)\|$/,'');
 return trimmed.split(/(?<!\\)\|/).map(cell=>cell.trim());
}
const tableDivider=(line:string)=>line.includes('|')&&tableCells(line).every(cell=>/^:?-{3,}:?$/.test(cell));
function descriptionList(lines:string[],start:number):{html:string;next:number}{
 const pattern=/^(\s*)([-+*]|\d+[.)])\s+(.+)$/,first=lines[start].match(pattern)!,indent=first[1].length,ordered=/^\d/.test(first[2]),tag=ordered?'ol':'ul',items:string[]=[];
 let i=start;
 while(i<lines.length){
  const item=lines[i].match(pattern);if(!item||/^\[([ xX])\]/.test(item[3])||item[1].length<indent)break;
  if(item[1].length>indent&&items.length){const nested=descriptionList(lines,i);items[items.length-1]+=nested.html;i=nested.next;continue}
  if(/^\d/.test(item[2])!==ordered)break;
  items.push(descriptionInlineHtml(item[3]));i++;
 }
 return {html:`<${tag}>${items.map(item=>`<li>${item}</li>`).join('')}</${tag}>`,next:i};
}

/** Build only known, escaped HTML. Raw HTML in existing descriptions stays literal text. */
export function descriptionToHtml(value:string,interactiveChecks=false){
 if(!value)return '';
 const lines=value.replace(/\r\n?/g,'\n').split('\n');let html='',i=0;
 while(i<lines.length){
  const line=lines[i];
  if(!line.trim()){html+='<p><br></p>';i++;continue}
  if(line.trim().startsWith('```')){
   const content:string[]=[];i++;while(i<lines.length&&!lines[i].trim().startsWith('```'))content.push(lines[i++]);i++;
   html+=`<pre><code>${escape(content.join('\n'))}</code></pre>`;continue;
  }
  if(line.includes('|')&&i+1<lines.length&&tableDivider(lines[i+1])){
   const header=tableCells(line),divider=tableCells(lines[i+1]),rows:string[][]=[];i+=2;
   while(i<lines.length&&lines[i].trim()&&lines[i].includes('|'))rows.push(tableCells(lines[i++]));
   const count=Math.max(header.length,...rows.map(row=>row.length));
   const cells=(row:string[],tag:string)=>Array.from({length:count},(_,column)=>`<${tag}${divider[column]?.startsWith(':')&&divider[column]?.endsWith(':')?' style="text-align:center"':divider[column]?.endsWith(':')?' style="text-align:right"':''}>${descriptionInlineHtml(row[column]||'')}</${tag}>`).join('');
   html+=`<table><thead><tr>${cells(header,'th')}</tr></thead><tbody>${rows.map(row=>`<tr>${cells(row,'td')}</tr>`).join('')}</tbody></table>`;continue;
  }
  const heading=line.match(/^(#{1,6})\s+(.+)$/);
  if(heading){html+=`<h${heading[1].length}>${descriptionInlineHtml(heading[2])}</h${heading[1].length}>`;i++;continue}
  if(/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)){html+='<hr>';i++;continue}
  if(/^>\s?/.test(line)){
   const quote:string[]=[];while(i<lines.length&&/^>\s?/.test(lines[i]))quote.push(lines[i++].replace(/^>\s?/,''));html+=`<blockquote>${descriptionToHtml(quote.join('\n'),interactiveChecks)}</blockquote>`;continue;
  }
  const checklist=line.match(/^\s*- \[([ xX])\]\s?(.*)$/);
  if(checklist){const checked=checklist[1].toLowerCase()==='x';html+=`<div class="descriptionChecklistItem${checked?' checked':''}" data-checklist="true"><input type="checkbox" aria-label="${escape(checklist[2].replace(/[*_~]/g,''))}" contenteditable="false" data-line="${i}"${checked?' checked':''}${interactiveChecks?'':' disabled'}><span>${descriptionInlineHtml(checklist[2])}</span></div>`;i++;continue}
  const list=line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
  if(list){
   const result=descriptionList(lines,i);html+=result.html;i=result.next;continue;
  }
  html+=`<p>${descriptionInlineHtml(line)}</p>`;i++;
 }
 return html;
}

export function clipboardPlainDescription(text:string){
 const normalized=text.replace(/\r\n?/g,'\n');
 const rows=normalized.trim().split('\n');
 if(rows.length>1&&rows.every(row=>row.includes('\t'))){
  const cells=rows.map(row=>row.split('\t')),width=Math.max(...cells.map(row=>row.length));
  const row=(values:string[])=>`| ${Array.from({length:width},(_,i)=>(values[i]||'').replace(/\|/g,'\\|')).join(' | ')} |`;
  return [row(cells[0]),row(Array(width).fill('---')),...cells.slice(1).map(row)].join('\n');
 }
 return normalized;
}
