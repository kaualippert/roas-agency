import {clipboardPlainDescription} from './description-document';
import {validTaskLink} from './task-description';

const skipped=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','IMG','VIDEO','AUDIO','META','LINK','TEMPLATE','FORM','BUTTON']);
const wrapped=(content:string,marker:string)=>content.startsWith(marker)&&content.endsWith(marker)?content:`${marker}${content}${marker}`;
function hexColor(value:string){
 if(/^#[\da-f]{6}$/i.test(value))return value.toLowerCase();
 const rgb=value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
 return rgb?'#'+rgb.slice(1,4).map(part=>Math.min(255,Number(part)).toString(16).padStart(2,'0')).join(''):null;
}
function children(node:Node):string{return [...node.childNodes].map(child=>serialize(child)).join('')}
function serialize(node:Node,inCell=false):string{
 if(node.nodeType===Node.TEXT_NODE)return (node.textContent||'').replace(/\u00a0/g,' ');
 if(node.nodeType!==Node.ELEMENT_NODE)return '';
 const element=node as HTMLElement,tag=element.tagName;
 if(skipped.has(tag))return '';
 if(tag==='INPUT')return '';
 if(tag==='TABLE'){
  const rows=[...element.querySelectorAll('tr')].filter(row=>row.closest('table')===element).map(row=>[...row.cells].map(cell=>[...cell.childNodes].map(child=>serialize(child,true)).join('').trim().replace(/\n+/g,'<br>').replace(/\|/g,'\\|')));
  if(!rows.length)return '';
  const width=Math.max(...rows.map(row=>row.length)),row=(cells:string[])=>`| ${Array.from({length:width},(_,i)=>cells[i]||'').join(' | ')} |`;
  return '\n\n'+[row(rows[0]),row(Array(width).fill('---')),...rows.slice(1).map(row)].join('\n')+'\n\n';
 }
 if(element.dataset.checklist==='true'){
  const input=element.querySelector('input[type="checkbox"]') as HTMLInputElement|null;
  return `\n- [${input?.checked||input?.hasAttribute('checked')?'x':' '}] ${children(element).trim()}\n`;
 }
 if(tag==='PRE')return '\n\n```\n'+(element.textContent||'').replace(/\n$/,'')+'\n```\n\n';
 if(tag==='BR')return inCell?'<br>':'\n';
 const content=[...element.childNodes].map(child=>serialize(child,inCell)).join('');
 if(!content.trim()&&!['P','DIV','TD','TH'].includes(tag))return '';
 if(tag==='B'||tag==='STRONG')return wrapped(content,'**');
 if(tag==='I'||tag==='EM')return wrapped(content,'_');
 if(['S','STRIKE','DEL'].includes(tag))return wrapped(content,'~~');
 if(tag==='CODE')return `\`${content}\``;
 if(tag==='A'){const href=element.getAttribute('href')||'';return validTaskLink(href)?`[${content}](${href})`:content}
 if(tag==='FONT'||tag==='SPAN'){
  const color=hexColor(tag==='FONT'?element.getAttribute('color')||'':element.style.color);
  let formatted=content;
  if(Number(element.style.fontWeight)>=600||element.style.fontWeight==='bold')formatted=wrapped(formatted,'**');
  if(element.style.fontStyle==='italic')formatted=wrapped(formatted,'_');
  if(element.style.textDecoration.includes('line-through'))formatted=wrapped(formatted,'~~');
  return color?`[color=${color}]${formatted}[/color]`:formatted;
 }
 if(/^H[1-6]$/.test(tag))return `\n\n${'#'.repeat(Number(tag[1]))} ${content.trim()}\n\n`;
 if(tag==='HR')return '\n\n---\n\n';
 if(tag==='BLOCKQUOTE')return '\n\n'+content.trim().split('\n').map(line=>'> '+line).join('\n')+'\n\n';
 if(tag==='LI'){
  const parent=element.parentElement,ordered=parent?.tagName==='OL',index=parent?[...parent.children].indexOf(element)+1:1;
  const nodes=[...element.childNodes],isList=(node:Node)=>node.nodeType===Node.ELEMENT_NODE&&['UL','OL'].includes((node as Element).tagName);
  const text=nodes.filter(node=>!isList(node)).map(node=>serialize(node,inCell)).join('').trim();
  const nested=nodes.filter(isList).map(node=>serialize(node,inCell).trim().split('\n').map(line=>'  '+line).join('\n')).join('\n');
  return `\n${ordered?`${index}.`:'-'} ${text}${nested?'\n'+nested:''}\n`;
 }
 if(tag==='UL'||tag==='OL')return '\n'+content.trim().replace(/\n{2,}/g,'\n')+'\n';
 if(['P','DIV','SECTION','ARTICLE','HEADER','FOOTER','TR'].includes(tag))return inCell?content+'\n':'\n'+content+'\n';
 return content;
}

/** Clipboard HTML is parsed inside an inert template, never inserted into the page. */
export function clipboardHtmlDescription(html:string){
 const template=document.createElement('template');template.innerHTML=html;
 // Descarte preto/branco herdados do tema da origem para manter a leitura no tema atual.
 for(const element of template.content.querySelectorAll<HTMLElement>('[style],[color]')){
  const color=hexColor(element.style.color||element.getAttribute('color')||'');
  if(color&&/^#(00|11|22|33|ee|ff)\1\1$/i.test(color)){element.style.color='';element.removeAttribute('color')}
 }
 return [...template.content.childNodes].map(node=>serialize(node)).join('').replace(/\n{3,}/g,'\n\n').trim();
}
export function editorDescription(element:HTMLElement){
 return [...element.childNodes].map(node=>serialize(node)).join('').replace(/\n{3,}/g,'\n\n').trim();
}
export function pastedDescription(plain:string,html:string){
 const rich=html?clipboardHtmlDescription(html):'';
 return rich||clipboardPlainDescription(plain);
}
