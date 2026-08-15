import {Check,ClipboardList,ListChecks,Pencil,Plus,Trash2,X} from 'lucide-react';
import {useState} from 'react';
import {clientProcessSummary,type ClientProcess,type ClientProcessItem} from './client-processes';

type Draft={id?:string;title:string;description:string;items:ClientProcessItem[];createdAt?:string};
type Props={clientId:string;processes:ClientProcess[];onChange:(processes:ClientProcess[])=>void};

const emptyItem=():ClientProcessItem=>({id:crypto.randomUUID(),title:'',completed:false});

export default function ClientProcessesPanel({clientId,processes,onChange}:Props){
 const [draft,setDraft]=useState<Draft|null>(null);
 const openNew=()=>setDraft({title:'',description:'',items:[emptyItem()]});
 const openEdit=(process:ClientProcess)=>setDraft({...process,items:process.items.map(item=>({...item}))});
 const updateItem=(id:string,patch:Partial<ClientProcessItem>)=>setDraft(current=>current?{...current,items:current.items.map(item=>item.id===id?{...item,...patch}:item)}:current);
 const removeItem=(id:string)=>setDraft(current=>current?{...current,items:current.items.filter(item=>item.id!==id)}:current);
 const save=(event:React.FormEvent)=>{
  event.preventDefault();
  if(!draft)return;
  const title=draft.title.trim(),items=draft.items.map(item=>({...item,title:item.title.trim()})).filter(item=>item.title);
  if(!title||!items.length)return;
  const now=new Date().toISOString();
  const process:ClientProcess={id:draft.id||crypto.randomUUID(),clientId,title,description:draft.description.trim(),items,createdAt:draft.createdAt||now,updatedAt:now};
  onChange(draft.id?processes.map(item=>item.id===draft.id?process:item):[process,...processes]);
  setDraft(null);
 };
 const toggle=(process:ClientProcess,itemId:string)=>{
  const now=new Date().toISOString();
  onChange(processes.map(item=>item.id===process.id?{...item,updatedAt:now,items:item.items.map(check=>check.id===itemId?{...check,completed:!check.completed,completedAt:check.completed?undefined:now}:check)}:item));
 };
 const remove=(process:ClientProcess)=>{if(confirm(`Excluir o processo “${process.title}”?`))onChange(processes.filter(item=>item.id!==process.id))};
 return <section className="clientProcessesWorkspace">
  <div className="clientProcessesHead"><div><span><ListChecks/></span><div><h3>Processos do cliente</h3><p>Organize rotinas recorrentes e acompanhe cada etapa pelo checklist.</p></div></div><button type="button" className="btn" onClick={openNew}><Plus/> Novo processo</button></div>
  <div className="clientProcessesGrid">{processes.map(process=>{const summary=clientProcessSummary(process);return <article className="card clientProcessCard" key={process.id} data-process-id={process.id}>
   <header><span className={`clientProcessIcon ${summary.progress===100?'done':''}`}>{summary.progress===100?<Check/>:<ClipboardList/>}</span><div><div><h4>{process.title}</h4><span className={`clientProcessStatus ${summary.progress===100?'done':''}`}>{summary.progress===100?'Concluído':'Em andamento'}</span></div><p>{process.description||'Sem descrição'}</p></div><div className="clientProcessActions"><button type="button" aria-label={`Editar ${process.title}`} onClick={()=>openEdit(process)}><Pencil/></button><button type="button" className="danger" aria-label={`Excluir ${process.title}`} onClick={()=>remove(process)}><Trash2/></button></div></header>
   <div className="clientProcessProgress"><div><span>Progresso</span><b>{summary.completed} de {summary.total} etapas</b></div><i><em style={{width:`${summary.progress}%`}}/></i><strong>{summary.progress}%</strong></div>
   <div className="clientProcessChecklist">{process.items.map(item=><label className={item.completed?'completed':''} key={item.id}><input type="checkbox" checked={item.completed} onChange={()=>toggle(process,item.id)}/><span><Check/></span><div><b>{item.title}</b>{item.completedAt&&<small>Concluído em {new Date(item.completedAt).toLocaleDateString('pt-BR')}</small>}</div></label>)}</div>
  </article>})}{!processes.length&&<div className="card clientProcessesEmpty"><ListChecks/><h3>Nenhum processo criado</h3><p>Crie um processo para organizar aprovações, entregas, reuniões ou outras rotinas deste cliente.</p><button type="button" className="btn secondary" onClick={openNew}><Plus/> Criar primeiro processo</button></div>}</div>
  {draft&&<div className="overlay" role="presentation"><div className="modal clientProcessModal" role="dialog" aria-modal="true" aria-labelledby="client-process-title"><div className="modalHead"><div><small>PROCESSO DO CLIENTE</small><h2 id="client-process-title">{draft.id?'Editar processo':'Novo processo'}</h2><p>Defina as etapas que precisam ser acompanhadas para este cliente.</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={()=>setDraft(null)}><X/></button></div><form className="form" onSubmit={save}><label className="full">Nome do processo<input autoFocus required value={draft.title} onChange={event=>setDraft(current=>current?{...current,title:event.target.value}:current)} placeholder="Ex.: Aprovação de campanha"/></label><label className="full">Descrição<textarea value={draft.description} onChange={event=>setDraft(current=>current?{...current,description:event.target.value}:current)} placeholder="Explique quando e como este processo deve ser executado."/></label><div className="full processChecklistEditor"><div><b>Checklist</b><button type="button" onClick={()=>setDraft(current=>current?{...current,items:[...current.items,emptyItem()]}:current)}><Plus/> Adicionar etapa</button></div>{draft.items.map((item,index)=><div className="processChecklistEditRow" key={item.id}><span>{index+1}</span><input aria-label={`Etapa ${index+1}`} required value={item.title} onChange={event=>updateItem(item.id,{title:event.target.value})} placeholder="Nome da etapa"/><button type="button" aria-label={`Remover etapa ${index+1}`} disabled={draft.items.length===1} onClick={()=>removeItem(item.id)}><Trash2/></button></div>)}</div><div className="formActions full"><button type="button" className="btn secondary" onClick={()=>setDraft(null)}>Cancelar</button><button className="btn" disabled={!draft.title.trim()||!draft.items.some(item=>item.title.trim())}>{draft.id?'Salvar alterações':'Criar processo'}</button></div></form></div></div>}
 </section>;
}
