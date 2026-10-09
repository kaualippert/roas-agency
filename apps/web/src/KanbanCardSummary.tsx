import {CalendarDays,UserRound} from 'lucide-react';
import './kanban-light.css';

type Props={title:string;owner?:string;dueDate?:string;priority?:'low'|'medium'|'high'|'urgent';late?:boolean};
const priorities={low:'Baixa',medium:'Média',high:'Alta',urgent:'Urgente'};

export default function KanbanCardSummary({title,owner,dueDate,priority,late=false}:Props){
 const date=dueDate?new Date(`${dueDate}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):'Sem prazo';
 return <div className="kanbanCardSummary">
  <div className="kanbanCardTitleRow"><h4 className="kanbanCardTitle" title={title}>{title}</h4>{priority&&<span className={`kanbanCardPriority ${priority}`} title={`Prioridade ${priorities[priority]}`}>{priorities[priority]}</span>}</div>
  <div className="kanbanCardMeta"><span className="kanbanCardOwner" title={owner||'Sem responsável'}><UserRound/><span>{owner||'Sem responsável'}</span></span><time dateTime={dueDate||undefined} className={late?'late':''} title={dueDate?`Prazo: ${dueDate}${late?' · Atrasado':''}`:'Sem prazo'}><CalendarDays/>{date}</time></div>
 </div>;
}
