import {useEffect,useId,type ButtonHTMLAttributes} from 'react';
import {CircleCheck,Inbox,Search,X} from 'lucide-react';

export const money=(value=0)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const initials=(name='')=>name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase();

type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{secondary?:boolean;variant?:'primary'|'secondary'|'danger'|'ghost';size?:'sm'|'md'};
export function Button({children,secondary=false,variant,size='md',className='',type='button',...props}:ButtonProps){const resolved=variant||(secondary?'secondary':'primary');return <button type={type} {...props} className={`btn ${resolved!=='primary'?resolved:''} ${size==='sm'?'btnSm':''} ${className}`.trim()}>{children}</button>}
export function Avatar({name,color='#111'}:{name:string;color?:string}){return <span className="avatar" style={{background:color}}>{initials(name)}</span>}
export function Badge({children,tone='green'}:{children:React.ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>}
export function Progress({value}:{value:number}){return <div className="progressCell"><span>{value}%</span><div><i style={{width:`${value}%`}}/></div></div>}
export function Empty({label}:{label:string}){return <div className="empty"><Inbox/><b>Nenhum {label} encontrado</b><span>Ajuste os filtros ou adicione um novo registro.</span></div>}
export function Filter({query,setQuery,placeholder='Buscar...'}:{query:string;setQuery:(value:string)=>void;placeholder?:string}){return <div className="filter"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={placeholder}/></div>}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){const titleId=useId();useEffect(()=>{const close=(event:KeyboardEvent)=>event.key==='Escape'&&onClose();window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[onClose]);return <div className="overlay" role="presentation" onMouseDown={event=>event.currentTarget===event.target&&onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="modalHead"><div><small>REGISTRO</small><h2 id={titleId}>{title}</h2></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={onClose}><X/></button></div>{children}</div></div>}
export function Toast({text}:{text:string}){return text?<div className="toast"><CircleCheck/> {text}</div>:null}
