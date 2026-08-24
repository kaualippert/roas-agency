import {useRef,useState} from 'react';
import {Bold,ChevronDown,ChevronUp,ExternalLink,FileText,ImagePlus,Italic,Link2,ListChecks,LoaderCircle,Palette,Paperclip,Strikethrough,Trash2} from 'lucide-react';
import {openClientFile,uploadClientFile} from './client-files';
import {insertDescriptionChecklist,parseTaskDescriptionLines,toggleDescriptionChecklist,validTaskLink,wrapDescriptionSelection,type DescriptionToken} from './task-description';
import type {TaskAttachment} from './types';
import './task-preview-toggle.css';
import './task-description-enhanced.css';

const MAX_ATTACHMENT_SIZE=4*1024*1024;
const textColors=[
 {value:'#111827',label:'Preto'},
 {value:'#5b36f2',label:'Roxo'},
 {value:'#2563eb',label:'Azul'},
 {value:'#059669',label:'Verde'},
 {value:'#d97706',label:'Laranja'},
 {value:'#dc2626',label:'Vermelho'},
];

function Token({token,index}:{token:DescriptionToken;index:number}){
 const content=token.type==='bold'?<strong>{token.value}</strong>:token.type==='italic'?<em>{token.value}</em>:token.type==='strike'?<s>{token.value}</s>:token.value;
 return token.color?<span key={index} style={{color:token.color}}>{content}</span>:<span key={index}>{content}</span>;
}

export function FormattedTaskDescription({value,className='',onToggleChecklist}:{value?:string;className?:string;onToggleChecklist?:(lineIndex:number)=>void}){
 if(!value?.trim())return null;
 const lines=parseTaskDescriptionLines(value);
 return <div className={`formattedTaskDescription ${className}`}>{lines.map((line,lineIndex)=>line.type==='checklist'?<label className={`descriptionChecklistItem${line.checked?' checked':''}`} key={lineIndex}><input type="checkbox" checked={Boolean(line.checked)} disabled={!onToggleChecklist} onChange={()=>onToggleChecklist?.(lineIndex)}/><span>{line.tokens.map((token,index)=><Token key={index} token={token} index={index}/>)}</span></label>:<div className="descriptionTextLine" key={lineIndex}>{line.tokens.length?line.tokens.map((token,index)=><Token key={index} token={token} index={index}/>):<br/>}</div>)}</div>;
}

export default function TaskDescriptionEditor({defaultValue='',clientId,attachments,onAttachmentsChange,onUploaded,hideLabel=false}:{defaultValue?:string;clientId:string;attachments:TaskAttachment[];onAttachmentsChange:(items:TaskAttachment[])=>void;onUploaded?:(fileId:string)=>void;hideLabel?:boolean}){
 const [value,setValue]=useState(defaultValue),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[showLink,setShowLink]=useState(false),[showColors,setShowColors]=useState(false),[link,setLink]=useState(''),[linkName,setLinkName]=useState(''),[customColor,setCustomColor]=useState('#5b36f2'),[previewExpanded,setPreviewExpanded]=useState(()=>localStorage.getItem('roas_task_description_preview_expanded')!=='false');
 const textarea=useRef<HTMLTextAreaElement>(null),fileInput=useRef<HTMLInputElement>(null),mediaInput=useRef<HTMLInputElement>(null),selection=useRef({start:0,end:0});

 const rememberSelection=()=>{const element=textarea.current;if(element)selection.current={start:element.selectionStart,end:element.selectionEnd}};
 const keepEditorFocus=(event:React.MouseEvent<HTMLButtonElement>)=>{rememberSelection();event.preventDefault()};
 const revealPreview=()=>{setPreviewExpanded(true);localStorage.setItem('roas_task_description_preview_expanded','true')};
 const applyChange=(next:{value:string;selectionStart:number;selectionEnd:number})=>{const element=textarea.current;selection.current={start:next.selectionStart,end:next.selectionEnd};setValue(next.value);revealPreview();requestAnimationFrame(()=>{element?.focus();element?.setSelectionRange(next.selectionStart,next.selectionEnd)})};
 const format=(marker:string,endMarker=marker)=>{const {start,end}=selection.current;applyChange(wrapDescriptionSelection(value,start,end,marker,endMarker))};
 const addChecklist=()=>{const {start,end}=selection.current;applyChange(insertDescriptionChecklist(value,start,end))};
 const applyColor=(color:string)=>{format(`[color=${color}]`,'[/color]');setShowColors(false)};
 const handleKeyDown=(event:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(!(event.ctrlKey||event.metaKey))return;const key=event.key.toLowerCase();if(key==='b'){event.preventDefault();format('**')}else if(key==='i'){event.preventDefault();format('_')}else if(key==='s'&&event.shiftKey){event.preventDefault();format('~~')}};

 const upload=async(files:FileList|null)=>{if(!files?.length)return;if(!clientId){setError('Selecione um cliente antes de anexar arquivos.');return}setUploading(true);setError('');let next=attachments;try{for(const file of Array.from(files)){if(file.size>MAX_ATTACHMENT_SIZE)throw new Error(`${file.name} ultrapassa o limite de 4 MB.`);const result=await uploadClientFile(clientId,file),type:TaskAttachment['type']=file.type.startsWith('image/')||file.type.startsWith('video/')||file.type.startsWith('audio/')?'media':'file';next=[...next,{id:crypto.randomUUID(),type,name:result.name,fileId:result.fileId,mimeType:result.mimeType,size:result.size,createdAt:new Date().toISOString()}];onUploaded?.(result.fileId)}onAttachmentsChange(next)}catch(reason){if(next!==attachments)onAttachmentsChange(next);setError(reason instanceof Error?reason.message:'Não foi possível anexar o arquivo.')}finally{setUploading(false);if(fileInput.current)fileInput.current.value='';if(mediaInput.current)mediaInput.current.value=''}};
 const addLink=()=>{const normalized=/^https?:\/\//i.test(link.trim())?link.trim():`https://${link.trim()}`;if(!validTaskLink(normalized)){setError('Informe um link válido, como https://exemplo.com.');return}onAttachmentsChange([...attachments,{id:crypto.randomUUID(),type:'link',name:linkName.trim()||normalized,url:normalized,createdAt:new Date().toISOString()}]);setLink('');setLinkName('');setShowLink(false);setError('')};
 const remove=(attachment:TaskAttachment)=>onAttachmentsChange(attachments.filter(item=>item.id!==attachment.id));
 const togglePreview=()=>setPreviewExpanded(current=>{const next=!current;localStorage.setItem('roas_task_description_preview_expanded',String(next));return next});

 return <div className="taskDescriptionEditor full">
  {!hideLabel&&<label>Descrição</label>}
  <div className="taskDescriptionBox">
   <div className="taskDescriptionToolbar" role="toolbar" aria-label="Formatação da descrição">
    <div className="taskToolbarGroup"><button type="button" aria-label="Negrito" title="Negrito (Ctrl+B)" onMouseDown={keepEditorFocus} onClick={()=>format('**')}><Bold/></button><button type="button" aria-label="Itálico" title="Itálico (Ctrl+I)" onMouseDown={keepEditorFocus} onClick={()=>format('_')}><Italic/></button><button type="button" aria-label="Tachado" title="Tachado (Ctrl+Shift+S)" onMouseDown={keepEditorFocus} onClick={()=>format('~~')}><Strikethrough/></button><button type="button" className={showColors?'active':''} aria-label="Cor do texto" title="Cor do texto" onMouseDown={keepEditorFocus} onClick={()=>setShowColors(current=>!current)}><Palette/></button><button type="button" aria-label="Adicionar checklist" title="Adicionar checklist" onMouseDown={keepEditorFocus} onClick={addChecklist}><ListChecks/></button></div>
    <i/>
    <div className="taskToolbarGroup"><button type="button" aria-label="Adicionar arquivo" title="Adicionar arquivo" disabled={uploading} onClick={()=>fileInput.current?.click()}><Paperclip/></button><button type="button" aria-label="Adicionar mídia" title="Adicionar mídia" disabled={uploading} onClick={()=>mediaInput.current?.click()}><ImagePlus/></button><button type="button" className={showLink?'active':''} aria-label="Adicionar link" title="Adicionar link" onClick={()=>setShowLink(current=>!current)}><Link2/></button></div>
    {uploading&&<span><LoaderCircle className="spin"/> Enviando...</span>}
   </div>
   {showColors&&<div className="taskColorPicker"><span>Cor do texto</span>{textColors.map(color=><button key={color.value} type="button" title={color.label} aria-label={color.label} style={{backgroundColor:color.value}} onMouseDown={keepEditorFocus} onClick={()=>applyColor(color.value)}/>)}<label title="Cor personalizada"><input aria-label="Escolher cor personalizada" type="color" value={customColor} onChange={event=>setCustomColor(event.target.value)}/></label><button type="button" className="applyCustomColor" onMouseDown={keepEditorFocus} onClick={()=>applyColor(customColor)}>Aplicar</button></div>}
   <textarea ref={textarea} name="description" value={value} onChange={event=>{setValue(event.target.value);selection.current={start:event.target.selectionStart,end:event.target.selectionEnd}}} onSelect={rememberSelection} onClick={rememberSelection} onKeyUp={rememberSelection} onBlur={rememberSelection} onKeyDown={handleKeyDown} placeholder="Escreva o contexto, briefing, instruções e demais detalhes desta tarefa..."/>
   <input ref={fileInput} hidden multiple type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={event=>void upload(event.target.files)}/>
   <input ref={mediaInput} hidden multiple type="file" accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/mp4" onChange={event=>void upload(event.target.files)}/>
  </div>
  <small className="taskEditorHint">Selecione um trecho para formatar. Use checklist para etapas. Arquivos e mídias: até 4 MB cada.</small>
  {showLink&&<div className="taskLinkForm"><input value={linkName} onChange={event=>setLinkName(event.target.value)} placeholder="Nome do link (opcional)"/><input value={link} onChange={event=>setLink(event.target.value)} placeholder="https://..."/><button type="button" className="btn" onClick={addLink}>Adicionar</button></div>}
  {error&&<p className="taskAttachmentError" role="alert">{error}</p>}
  {attachments.length>0&&<div className="taskAttachments">{attachments.map(attachment=><article key={attachment.id}><span>{attachment.type==='media'?<ImagePlus/>:attachment.type==='link'?<Link2/>:<FileText/>}</span><div><b>{attachment.name}</b><small>{attachment.type==='link'?'Link externo':attachment.type==='media'?'Mídia':attachment.size?`${(attachment.size/1024/1024).toFixed(1)} MB`:'Arquivo'}</small></div>{attachment.type==='link'?<a href={attachment.url} target="_blank" rel="noreferrer" title="Abrir link"><ExternalLink/></a>:<button type="button" title="Abrir arquivo" onClick={()=>attachment.fileId&&void openClientFile(attachment.fileId)}><ExternalLink/></button>}<button type="button" className="remove" title="Remover" onClick={()=>remove(attachment)}><Trash2/></button></article>)}</div>}
  {value.trim()&&<div className={`taskDescriptionPreview${previewExpanded?'':' collapsed'}`}><button type="button" className="taskDescriptionPreviewToggle" aria-expanded={previewExpanded} onClick={togglePreview}><span>Pré-visualização</span><span>{previewExpanded?'Minimizar':'Expandir'}{previewExpanded?<ChevronUp/>:<ChevronDown/>}</span></button>{previewExpanded&&<FormattedTaskDescription value={value} onToggleChecklist={lineIndex=>setValue(current=>toggleDescriptionChecklist(current,lineIndex))}/>}</div>}
 </div>;
}
