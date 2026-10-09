import {useEffect,useId,useState} from 'react';
import {createPortal} from 'react-dom';
import {Info} from 'lucide-react';
import './dashboard-reading.css';

export function MetricHelp({label,description}:{label:string;description:string}){
 const id=useId(),[position,setPosition]=useState<{left:number;top:number;above:boolean}|null>(null);
 useEffect(()=>{if(!position)return;const close=()=>setPosition(null);window.addEventListener('scroll',close,true);window.addEventListener('resize',close);return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close)}},[position]);
 const show=(element:HTMLButtonElement)=>{const rect=element.getBoundingClientRect();setPosition({left:Math.max(12,Math.min(rect.left,window.innerWidth-Math.min(280,window.innerWidth-24)-12)),top:rect.bottom+8,above:rect.bottom>window.innerHeight-140})};
 return <><button type="button" className="metricHelp" aria-label={`Sobre ${label}`} aria-describedby={position?id:undefined} onMouseEnter={event=>show(event.currentTarget)} onMouseLeave={()=>setPosition(null)} onFocus={event=>show(event.currentTarget)} onBlur={()=>setPosition(null)} onClick={event=>show(event.currentTarget)} onKeyDown={event=>{if(event.key==='Escape')setPosition(null)}}><Info aria-hidden="true"/></button>{position&&createPortal(<div id={id} role="tooltip" className="metricExplanation" style={{left:position.left,top:position.above?undefined:position.top,bottom:position.above?window.innerHeight-position.top+36:undefined}}>{description}</div>,document.body)}</>;
}
export function MetricScope({scope}:{scope:'period'|'current'}){return <span className={`metricScope ${scope}`}>{scope==='period'?'Neste período':'Estado atual'}</span>}
