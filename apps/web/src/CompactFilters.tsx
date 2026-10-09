import {useId,useRef,useState,type ReactNode} from 'react';
import {Search,SlidersHorizontal,X} from 'lucide-react';
import './compact-filters.css';

export type FilterChip={id:string;label:string;onRemove:()=>void};
type Props={label:string;query:string;onQuery:(value:string)=>void;placeholder:string;primary:ReactNode;secondary?:ReactNode;secondaryCount?:number;chips:FilterChip[];onClear:()=>void;result?:ReactNode};

export default function CompactFilters({label,query,onQuery,placeholder,primary,secondary,secondaryCount=0,chips,onClear,result}:Props){
 const [open,setOpen]=useState(false),panelId=useId(),toggle=useRef<HTMLButtonElement>(null);
 return <section className="compactFilters" aria-label={label}>
  <div className="compactFiltersMain">
   <label className="compactFiltersSearch"><Search/><input type="search" aria-label={placeholder} placeholder={placeholder} value={query} onChange={event=>onQuery(event.target.value)}/></label>
   {primary}
   {secondary&&<button ref={toggle} type="button" className={`compactFiltersToggle${open?' active':''}`} aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(value=>!value)}><SlidersHorizontal/> Mais filtros{secondaryCount>0&&<span>{secondaryCount}</span>}</button>}
  </div>
  {secondary&&<div id={panelId} className="compactFiltersSecondary" hidden={!open} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus()}}}>{secondary}</div>}
  {(chips.length>0||result)&&<div className="compactFiltersBottom">
   <div className="compactFiltersChips" aria-label="Filtros ativos">{chips.map(chip=><button type="button" key={chip.id} aria-label={`Remover filtro ${chip.label}`} title={`Remover filtro ${chip.label}`} onClick={chip.onRemove}><span>{chip.label}</span><X/></button>)}{chips.length>0&&<button type="button" className="compactFiltersClear" onClick={onClear}>Limpar todos</button>}</div>
   {result&&<span className="compactFiltersResult" aria-live="polite">{result}</span>}
  </div>}
 </section>;
}
