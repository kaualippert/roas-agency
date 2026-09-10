import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,CalendarDays,ChevronLeft,ChevronRight,ExternalLink,GripVertical,LayoutGrid,List,Maximize2,Minimize2,Palette,Pencil,Plus,Trash2,X} from 'lucide-react';
import {Link,useParams} from 'react-router-dom';
import {useStoreData} from './app/useStoreData';
import {KanbanMoreButton,useKanbanColumnLimit,visibleKanbanCards} from './KanbanColumnLimit';
import type {Project} from './types';
import './editorial.css';
import './editorial-description.css';
import './editorial-editing.css';
import {useKanbanDensity} from './persistent-ui';
import {FullscreenTargetButton} from './FullscreenPanel';

type EditorialStatus='todo'|'in_progress'|'completed';
type EditorialFormat='Reels'|'Post estático'|'Carrossel';
type WorkflowKey='planning'|'creative'|'copy'|'approval'|'scheduling'|'completed';
type Workflow=Record<WorkflowKey,boolean>;
type EditorialPost={id:string;date:string;name:string;headline:string;description?:string;format:EditorialFormat;reference:string;steps:Workflow;createdAt:string;updatedAt:string};

const workflow:[WorkflowKey,string][]=[['planning','Planejamento'],['creative','Criativo'],['copy','Copy'],['approval','Aprovação'],['scheduling','Programar'],['completed','Concluído']];
const emptySteps=():Workflow=>({planning:false,creative:false,copy:false,approval:false,scheduling:false,completed:false});
const statusOf=(post:EditorialPost):EditorialStatus=>post.steps.completed?'completed':Object.values(post.steps).some(Boolean)?'in_progress':'todo';
const statusLabel:Record<EditorialStatus,string>={todo:'A fazer',in_progress:'Em andamento',completed:'Concluído'};
const statusTone:Record<EditorialStatus,string>={todo:'purple',in_progress:'orange',completed:'green'};
const formatDate=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const initials=(name:string)=>name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase();

export default function EditorialPage(){
 const {projectId=''}=useParams(),[projects]=useStoreData<Project[]>('projects',[]),project=projects.find(item=>item.id===projectId);
 const [posts,setPosts]=useStoreData<EditorialPost[]>(`editorial_${projectId}`,[]),[modal,setModal]=useState(false),[editing,setEditing]=useState<EditorialPost|null>(null),[dragged,setDragged]=useState<string|null>(null),[calendarDate,setCalendarDate]=useState(()=>new Date());
 const {isExpanded,toggleColumn}=useKanbanColumnLimit();
 const {compact,toggleDensity}=useKanbanDensity(`roas_kanban_editorial_density_${projectId}`);
 const columns:EditorialStatus[]=['todo','in_progress','completed'];
 const stats=useMemo(()=>({total:posts.length,todo:posts.filter(post=>statusOf(post)==='todo').length,progress:posts.filter(post=>statusOf(post)==='in_progress').length,completed:posts.filter(post=>statusOf(post)==='completed').length}),[posts]);
 if(!project)return <main className="editorialPage"><div className="editorialMissing"><Palette/><h2>Projeto não encontrado</h2><Link className="btn" to="/projects">Voltar para Projetos</Link></div></main>;

 const savePost=(post:EditorialPost)=>{setPosts(editing?posts.map(item=>item.id===post.id?post:item):[post,...posts]);setEditing(null);setModal(false)};
 const openPost=(post:EditorialPost)=>{setEditing(post);setModal(true)};
 const remove=(post:EditorialPost)=>{if(confirm(`Excluir o conteúdo “${post.name}”?`)){setPosts(posts.filter(item=>item.id!==post.id));setEditing(null);setModal(false)}};
 const toggleStep=(post:EditorialPost,key:WorkflowKey,checked:boolean)=>{let steps={...post.steps,[key]:checked};if(key==='completed'&&checked)steps=Object.fromEntries(workflow.map(([step])=>[step,true])) as Workflow;if(key!=='completed'&&!checked)steps.completed=false;setPosts(posts.map(item=>item.id===post.id?{...item,steps,updatedAt:new Date().toISOString()}:item))};
 const movePost=(status:EditorialStatus)=>{if(!dragged)return;setPosts(posts.map(post=>{if(post.id!==dragged)return post;let steps=post.steps;if(status==='todo')steps=emptySteps();if(status==='in_progress')steps={...post.steps,planning:true,completed:false};if(status==='completed')steps=Object.fromEntries(workflow.map(([key])=>[key,true])) as Workflow;return{...post,steps,updatedAt:new Date().toISOString()}}));setDragged(null)};
 return <main className="editorialPage">
  <div className="editorialHero"><div><Link to="/projects"><ArrowLeft/> Projetos</Link><small>LINHA EDITORIAL</small><h2>{project.name}</h2><p>Planeje, produza, aprove e programe os conteúdos do projeto.</p></div><button className="btn" onClick={()=>{setEditing(null);setModal(true)}}><Plus/> Novo conteúdo</button></div>
  <div className="editorialStats"><article><span><List/></span><div><small>Total de conteúdos</small><strong>{stats.total}</strong></div></article><article><span><GripVertical/></span><div><small>A fazer</small><strong>{stats.todo}</strong></div></article><article><span><Palette/></span><div><small>Em andamento</small><strong>{stats.progress}</strong></div></article><article><span><CalendarDays/></span><div><small>Concluídos</small><strong>{stats.completed}</strong></div></article></div>
  <section className="card editorialSection"><SectionTitle icon={<List/>} title="Tabela editorial" subtitle="Controle operacional de cada conteúdo e suas etapas"/><div className="editorialTableWrap"><table className="editorialTable"><thead><tr><th>Data</th><th>Status</th><th>Conteúdo</th><th>Headline</th>{workflow.map(([,label])=><th key={label}>{label}</th>)}<th>Formato</th><th>Referência</th><th/></tr></thead><tbody>{[...posts].sort((a,b)=>a.date.localeCompare(b.date)).map(post=>{const status=statusOf(post);return <tr key={post.id} onClick={event=>{if(!(event.target as Element).closest("button,a,input,label"))openPost(post)}}><td><b>{formatDate(post.date)}</b></td><td><span className={`editorialStatus ${statusTone[status]}`}>{statusLabel[status]}</span></td><td className="editorialContentCell"><button type="button" className="editorialOpenPost" onClick={()=>openPost(post)}>{post.name}</button>{post.description&&<small>{post.description}</small>}</td><td className="editorialHeadline">{post.headline||'—'}</td>{workflow.map(([key,label])=><td key={key}><label className="editorialStep" title={label}><input type="checkbox" checked={post.steps[key]} onChange={event=>toggleStep(post,key,event.target.checked)}/><i/></label></td>)}<td><span className="formatBadge">{post.format}</span></td><td>{post.reference?<a className="referenceLink" href={post.reference} target="_blank" rel="noreferrer"><ExternalLink/> Abrir</a>:'—'}</td><td><div className="editorialActions"><button className="iconBtn" title="Editar" onClick={()=>{setEditing(post);setModal(true)}}><Pencil/></button><button className="iconBtn delete" title="Excluir" onClick={()=>remove(post)}><Trash2/></button></div></td></tr>})}</tbody></table>{!posts.length&&<EditorialEmpty onAdd={()=>setModal(true)}/>}</div>
  </section>
  <section className="card editorialSection"><div className="editorialKanbanHead"><SectionTitle icon={<LayoutGrid/>} title="Kanban de produção" subtitle="Arraste os conteúdos para atualizar o andamento"/><div className="editorialFullscreenActions"><FullscreenTargetButton target=".editorialSection" label="Kanban editorial"/><button type="button" className="kanbanDensityButton" onClick={toggleDensity}>{compact?<Maximize2/>:<Minimize2/>}{compact?'Expandir cards':'Minimizar cards'}</button></div></div><div className="editorialKanban">{columns.map(status=>{const items=posts.filter(post=>statusOf(post)===status),expanded=isExpanded(status);return <div className={`editorialColumn ${status}`} key={status} onDragOver={event=>event.preventDefault()} onDrop={()=>movePost(status)}><header><span>{statusLabel[status]}</span><b>{items.length}</b></header><div>{visibleKanbanCards(items,expanded).map(post=><article className={compact?'compact':''} key={post.id} role="button" tabIndex={0} aria-label={`Editar post ${post.name}`} onClick={()=>{if(!dragged)openPost(post)}} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openPost(post)}}} draggable onDragStart={()=>setDragged(post.id)} onDragEnd={()=>setDragged(null)}><div><span className="postInitials">{initials(post.name)}</span><GripVertical/></div><h4>{post.name}</h4><p className="editorialPostHeadline">{post.headline||'Sem headline definida'}</p>{post.description&&<p className="editorialPostDescription">{post.description}</p>}<footer><span>{post.format}</span><time><CalendarDays/>{formatDate(post.date)}</time></footer><div className="postWorkflowProgress"><i style={{width:`${Math.round(Object.values(post.steps).filter(Boolean).length/workflow.length*100)}%`}}/></div></article>)}</div><KanbanMoreButton total={items.length} expanded={expanded} onToggle={()=>toggleColumn(status)}/></div>})}</div>
  </section>
  <section className="card editorialSection"><div className="editorialCalendarHeader"><SectionTitle icon={<CalendarDays/>} title="Calendário editorial" subtitle="Distribuição dos conteúdos por data de publicação"/><div><FullscreenTargetButton target=".editorialSection" label="calendário editorial"/><button className="iconBtn" onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1))}><ChevronLeft/></button><b>{calendarDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</b><button className="iconBtn" onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1))}><ChevronRight/></button></div></div><EditorialCalendar date={calendarDate} posts={posts} onEdit={openPost}/></section>
  {modal&&<PostModal post={editing} onClose={()=>{setModal(false);setEditing(null)}} onSave={savePost} onDelete={editing?()=>remove(editing):undefined}/>}
 </main>
}

function SectionTitle({icon,title,subtitle}:{icon:React.ReactNode;title:string;subtitle:string}){return <div className="editorialSectionTitle"><span>{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>}
function EditorialEmpty({onAdd}:{onAdd:()=>void}){return <div className="editorialEmpty"><Palette/><b>Nenhum conteúdo planejado</b><span>Adicione o primeiro post desta linha editorial.</span><button className="btn secondary" onClick={onAdd}><Plus/> Adicionar conteúdo</button></div>}
function PostModal({post,onClose,onSave,onDelete}:{post:EditorialPost|null;onClose:()=>void;onSave:(post:EditorialPost)=>void;onDelete?:()=>void}){
 const [steps,setSteps]=useState<Workflow>(()=>({...emptySteps(),...post?.steps}));
 const [dirty,setDirty]=useState(false);
 const closeRef=useRef(onClose),dirtyRef=useRef(false);
 closeRef.current=onClose;dirtyRef.current=dirty;
 const close=()=>{if(!dirtyRef.current||confirm('Descartar as alterações não salvas deste post?'))closeRef.current()};
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close()}};
  document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('keydown',escape);previous?.focus()};
 },[]);
 const changeStep=(key:WorkflowKey,checked:boolean)=>{
  setDirty(true);
  setSteps(current=>{
   if(key==='completed'&&checked)return Object.fromEntries(workflow.map(([step])=>[step,true])) as Workflow;
   return {...current,[key]:checked,...(key!=='completed'&&!checked?{completed:false}:{})};
  });
 };
 const submit=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget),name=String(form.get('name')).trim();
  const input=event.currentTarget.elements.namedItem('name') as HTMLInputElement;
  input.setCustomValidity(name?'':'Informe o nome do post.');
  if(!name){input.reportValidity();return}
  const now=new Date().toISOString();
  onSave({id:post?.id||crypto.randomUUID(),date:String(form.get('date')),name,headline:String(form.get('headline')).trim(),description:String(form.get('description')||'').trim(),format:String(form.get('format')) as EditorialFormat,reference:String(form.get('reference')).trim(),steps,createdAt:post?.createdAt||now,updatedAt:now});
 };
 return <div className="overlay"><div className="modal editorialModal" role="dialog" aria-modal="true" aria-labelledby="editorial-modal-title">
  <div className="modalHead"><div><small>LINHA EDITORIAL</small><h2 id="editorial-modal-title">{post?'Editar conteúdo':'Novo conteúdo'}</h2><p>Atualize os detalhes e acompanhe as etapas de produção do post.</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={close}><X/></button></div>
  <form className="form" onSubmit={submit} onChange={()=>setDirty(true)}>
   <label className="full">Nome do post<input name="name" required autoFocus defaultValue={post?.name} onInput={event=>event.currentTarget.setCustomValidity('')} placeholder="Ex.: 5 dicas para melhorar o ROAS"/></label>
   <label>Data de publicação<input name="date" type="date" required defaultValue={post?.date||dateKey(new Date())}/></label>
   <label>Formato<select name="format" defaultValue={post?.format||'Post estático'}><option>Reels</option><option>Post estático</option><option>Carrossel</option></select></label>
   <label className="full">Headline<input name="headline" defaultValue={post?.headline} placeholder="Título ou chamada principal do conteúdo"/></label>
   <label className="full">Link de referência<input name="reference" type="url" defaultValue={post?.reference} placeholder="https://..."/></label>
   <fieldset className="full editorialWorkflowFields"><legend>Etapas de produção</legend><p>Marque o que já foi realizado. O status acompanha as etapas concluídas.</p><div>{workflow.map(([key,label])=><label key={key}><input type="checkbox" checked={steps[key]} onChange={event=>changeStep(key,event.target.checked)}/><span>{label}</span></label>)}</div></fieldset>
   <label className="full editorialDescriptionField">Descrição<textarea name="description" defaultValue={post?.description} placeholder="Descreva a ideia, a copy e as orientações para este conteúdo."/></label>
   <div className="formActions full">{onDelete&&<button type="button" className="btn secondary editorialDeletePost" onClick={onDelete}><Trash2/> Excluir conteúdo</button>}<button type="button" className="btn secondary" onClick={close}>Cancelar</button><button className="btn">Salvar conteúdo</button></div>
  </form>
 </div></div>;
}
function EditorialCalendar({date,posts,onEdit}:{date:Date;posts:EditorialPost[];onEdit:(post:EditorialPost)=>void}){
 const [expanded,setExpanded]=useState<string[]>([]);
 const first=new Date(date.getFullYear(),date.getMonth(),1),offset=(first.getDay()+6)%7,days=new Date(date.getFullYear(),date.getMonth()+1,0).getDate(),cells=Array.from({length:42},(_,index)=>{const day=index-offset+1;return day>0&&day<=days?day:null});
 return <div className="editorialCalendar"><div className="calendarLabels">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(label=><b key={label}>{label}</b>)}</div><div className="editorialCalendarGrid">{cells.map((day,index)=>{
  const key=day?dateKey(new Date(date.getFullYear(),date.getMonth(),day)):'',dayPosts=posts.filter(post=>post.date===key),showAll=expanded.includes(key);
  return <div key={index} className={!day?'outside':''}>{day&&<><span>{day}</span>{(showAll?dayPosts:dayPosts.slice(0,3)).map(post=><article role="button" tabIndex={0} aria-label={`Editar post ${post.name}`} onClick={()=>onEdit(post)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onEdit(post)}}} className={statusOf(post)} key={post.id} title={[post.headline,post.description].filter(Boolean).join(' — ')}><b>{post.name}</b><small>{post.format}</small></article>)}{dayPosts.length>3&&<button type="button" className="morePosts" onClick={()=>setExpanded(current=>showAll?current.filter(item=>item!==key):[...current,key])}>{showAll?'Ver menos':`Ver mais (${dayPosts.length-3})`}</button>}</>}</div>;
 })}</div></div>;
}
