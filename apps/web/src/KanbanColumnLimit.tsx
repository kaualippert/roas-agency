import {useState} from 'react';
import {ChevronDown,ChevronUp} from 'lucide-react';

export const KANBAN_CARD_LIMIT=5;

export function visibleKanbanCards<T>(items:T[],expanded=false){
 return expanded?items:items.slice(0,KANBAN_CARD_LIMIT);
}

export function hiddenKanbanCardCount(total:number){
 return Math.max(0,total-KANBAN_CARD_LIMIT);
}

export function useKanbanColumnLimit(){
 const [expandedColumns,setExpandedColumns]=useState<Record<string,boolean>>({});
 const isExpanded=(column:string)=>Boolean(expandedColumns[column]);
 const toggleColumn=(column:string)=>setExpandedColumns(current=>({...current,[column]:!current[column]}));
 return{isExpanded,toggleColumn};
}

export function KanbanMoreButton({total,expanded,onToggle}:{total:number;expanded:boolean;onToggle:()=>void}){
 const hidden=hiddenKanbanCardCount(total);
 if(!hidden)return null;
 return <button className="kanbanMoreButton" type="button" aria-expanded={expanded} onClick={onToggle}>
  {expanded?<><ChevronUp/> Ver menos</>:<><ChevronDown/> Ver mais ({hidden})</>}
 </button>;
}
