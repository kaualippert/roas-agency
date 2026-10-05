import {useEffect} from 'react';
import {CalendarPlus,MessageSquarePlus,UserRound,X} from 'lucide-react';
import type {CRMFollowUpInput} from './crm-lead-activities';
import type {CRMLead,CRMLeadObservation} from './crm-leads';
import type {TeamMember} from './types';

type ActivityMode='observations'|'follow-up';
type Props={lead:CRMLead;mode:ActivityMode;team:TeamMember[];onClose:()=>void;onAddObservation:(text:string)=>void;onCreateFollowUp:(input:CRMFollowUpInput)=>void};

const localDateOffset=(days:number)=>{
 const date=new Date();
 date.setDate(date.getDate()+days);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
const formatDate=(value:string)=>{
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'Data indisponível':date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
};

export default function CRMLeadActivityModal({lead,mode,team,onClose,onAddObservation,onCreateFollowUp}:Props){
 useEffect(()=>{
  const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};
  window.addEventListener('keydown',closeOnEscape);
  return()=>window.removeEventListener('keydown',closeOnEscape);
 },[onClose]);
 const observations=[...(lead.observations||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const activeTeam=team.filter(member=>member.status==='active'||member.id===lead.responsibleId);
 const saveObservation=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const text=String(new FormData(event.currentTarget).get('observation')||'').trim();
  if(text)onAddObservation(text);
 };
 const saveFollowUp=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const title=String(form.get('title')||'').trim();
  const dueDate=String(form.get('dueDate')||'');
  if(!title||!dueDate)return;
  onCreateFollowUp({title,description:String(form.get('description')||''),dueDate,responsibleId:String(form.get('responsibleId')||'')});
 };

 return <div className="overlay crmLeadActivityOverlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="modal crmLeadActivityModal" role="dialog" aria-modal="true" aria-labelledby="crm-lead-activity-title">
   <header className="modalHead"><div><small>{mode==='observations'?'REGISTRO DO LEAD':'PRÓXIMA AÇÃO'}</small><h2 id="crm-lead-activity-title">{mode==='observations'?'Observações':'Criar tarefa'}</h2><p>{lead.name} · {lead.contact||'Contato não informado'}</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={onClose}><X/></button></header>
   {mode==='observations'?<>
    <div className="crmLeadObservationList" aria-label="Histórico de observações">
     {observations.length?observations.map((observation:CRMLeadObservation)=><article className="crmLeadObservation" key={observation.id}><div><span><UserRound/>{observation.authorName||'Equipe'}</span><time dateTime={observation.createdAt}>{formatDate(observation.createdAt)}</time></div><p>{observation.text}</p></article>):<div className="crmLeadActivityEmpty"><MessageSquarePlus/><b>Nenhuma observação ainda</b><span>Registre contexto importante para a próxima conversa.</span></div>}
    </div>
    <form className="crmLeadActivityForm" onSubmit={saveObservation}><label>Nova observação<textarea name="observation" maxLength={2000} rows={4} required autoFocus placeholder="Escreva um resumo da conversa, objeções, necessidades ou próximos passos…"/></label><div><small>Até 2.000 caracteres</small><button type="submit" className="btn"><MessageSquarePlus/> Salvar observação</button></div></form>
   </>:<form className="crmLeadActivityForm crmLeadFollowUpForm" onSubmit={saveFollowUp}>
    <div className="crmLeadFollowUpContext"><CalendarPlus/><span>A tarefa ficará ligada a <b>{lead.name}</b> e aparecerá na página de Tarefas.</span></div>
    <label>Título da tarefa<input name="title" required autoFocus defaultValue={`Retornar contato — ${lead.name}`} maxLength={140}/></label>
    <div className="crmLeadFollowUpFields"><label>Prazo<input name="dueDate" type="date" min={localDateOffset(0)} required defaultValue={localDateOffset(1)}/></label><label>Responsável<select name="responsibleId" defaultValue={lead.responsibleId||''}><option value="">Sem responsável</option>{activeTeam.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>
    <label>Detalhes<textarea name="description" rows={3} maxLength={2000} placeholder="Descreva a próxima ação: fazer follow-up, enviar proposta, marcar reunião…"/></label>
    <div className="crmLeadActivityFormActions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn"><CalendarPlus/> Criar tarefa</button></div>
   </form>}
  </section>
 </div>;
}
