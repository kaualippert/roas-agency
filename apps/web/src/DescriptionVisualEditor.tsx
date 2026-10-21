import {forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useRef} from 'react';
import {descriptionToHtml} from './description-document';
import {editorDescription,pastedDescription} from './description-clipboard';

export type DescriptionVisualHandle={command:(name:string,value?:string)=>void;insertChecklist:()=>void;insertTable:()=>void};
const DescriptionVisualEditor=forwardRef<DescriptionVisualHandle,{value:string;onChange:(value:string)=>void}>(function DescriptionVisualEditor({value,onChange},ref){
 const editor=useRef<HTMLDivElement>(null),range=useRef<Range|null>(null),initial=useRef(descriptionToHtml(value,true)),change=useRef(onChange);
 change.current=onChange;
 // O DOM editável é gerenciado pelo navegador; React não deve restaurar o HTML
 // inicial a cada tecla, pois isso apaga a seleção e as alterações do usuário.
 useLayoutEffect(()=>{if(editor.current)editor.current.innerHTML=initial.current},[]);
 const remember=()=>{const selection=window.getSelection();if(selection?.rangeCount&&editor.current?.contains(selection.anchorNode)&&editor.current.contains(selection.focusNode))range.current=selection.getRangeAt(0).cloneRange()};
 const update=()=>{if(editor.current){
  for(const block of editor.current.querySelectorAll<HTMLElement>('[data-checklist]')){
   const input=block.querySelector<HTMLInputElement>('input[type="checkbox"]');
   if(input)input.setAttribute('aria-label',block.textContent?.trim()||'Item');
   else{block.removeAttribute('data-checklist');block.classList.remove('descriptionChecklistItem','checked')}
  }
  change.current(editorDescription(editor.current));
 }remember()};
 const restore=()=>{const element=editor.current;if(!element)return;remember();element.focus();const selection=window.getSelection();if(selection){selection.removeAllRanges();if(range.current&&element.contains(range.current.commonAncestorContainer))selection.addRange(range.current);else{const end=document.createRange();end.selectNodeContents(element);end.collapse(false);selection.addRange(end)}}};
 const command=(name:string,value?:string)=>{restore();document.execCommand(name,false,value);update()};
 useImperativeHandle(ref,()=>({command,insertChecklist:()=>{
  restore();const selected=window.getSelection()?.toString()||'Item',existing=[...(editor.current?.querySelectorAll('[data-checklist]')||[])].find(block=>block.textContent?.trim()===selected.trim());
  if(existing?.querySelector('input')){update();return}
  command('insertHTML',descriptionToHtml(selected.split('\n').map(line=>'- [ ] '+line).join('\n'),true));
 },insertTable:()=>command('insertHTML',descriptionToHtml('| Coluna 1 | Coluna 2 | Coluna 3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |',true))}));
 useEffect(()=>{document.addEventListener('selectionchange',remember);return()=>document.removeEventListener('selectionchange',remember)},[]);
 const paste=(event:React.ClipboardEvent<HTMLDivElement>)=>{
  event.preventDefault();
  const text=pastedDescription(event.clipboardData.getData('text/plain'),event.clipboardData.getData('text/html'));
  if(text)command('insertHTML',descriptionToHtml(text,true));
 };
 const keyDown=(event:React.KeyboardEvent<HTMLDivElement>)=>{
  const modifier=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
  if(modifier&&['b','i'].includes(key)){event.preventDefault();command(key==='b'?'bold':'italic');return}
  if(modifier&&event.shiftKey&&key==='s'){event.preventDefault();command('strikeThrough');return}
  if(event.key==='Tab'){
   const selection=window.getSelection(),anchor=selection?.anchorNode,element=anchor?.nodeType===Node.ELEMENT_NODE?anchor as Element:anchor?.parentElement,cell=element?.closest('td,th'),table=cell?.closest('table');
   if(cell&&table){const cells=[...table.querySelectorAll('td,th')],index=cells.indexOf(cell),next=cells[index+(event.shiftKey?-1:1)];if(next){event.preventDefault();const target=document.createRange();target.selectNodeContents(next);target.collapse(true);selection?.removeAllRanges();selection?.addRange(target);remember()}}
  }
 };
 return <div ref={editor} className="taskRichEditor descriptionDocument" role="textbox" aria-label="Descrição da tarefa" aria-multiline="true" contentEditable suppressContentEditableWarning data-placeholder="Escreva ou cole seu briefing. Tabelas, títulos e listas mantêm a estrutura." onInput={update} onPaste={paste} onMouseUp={remember} onKeyUp={remember} onBlur={remember} onKeyDown={keyDown} onClick={event=>{const input=event.target as HTMLInputElement;if(input.type==='checkbox'){if(input.checked)input.setAttribute('checked','');else input.removeAttribute('checked');input.closest('.descriptionChecklistItem')?.classList.toggle('checked',input.checked);update()}if((event.target as Element).closest('a'))event.preventDefault()}}/>;
});
export default DescriptionVisualEditor;
