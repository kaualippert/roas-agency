import type {ReactNode} from 'react';
import './kanban-light.css';

type Props={fields:Array<{label:string;value:ReactNode}>;description?:string;children?:ReactNode};
export default function KanbanCardDetails({fields,description,children}:Props){
 return <div className="kanbanCardDetails">
  <dl>{fields.map(field=><div key={field.label}><dt>{field.label}</dt><dd>{field.value||'Não informado'}</dd></div>)}</dl>
  {description?.trim()&&<p className="kanbanCardExcerpt">{description}</p>}
  {children}
  <span className="kanbanCardOpenHint">Abra o card para ver e editar todos os detalhes</span>
 </div>;
}
