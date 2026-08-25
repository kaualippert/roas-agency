import {Maximize2,Minimize2} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import './fullscreen-panel.css';

export function useFullscreenPanel<T extends HTMLElement>(){
 const ref=useRef<T>(null),[active,setActive]=useState(false);
 useEffect(()=>{
  const change=()=>setActive(document.fullscreenElement===ref.current);
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){setActive(false);if(document.fullscreenElement)void document.exitFullscreen().catch(()=>undefined)}};
  document.addEventListener('fullscreenchange',change);
  document.addEventListener('keydown',keydown,true);
  return()=>{document.removeEventListener('fullscreenchange',change);document.removeEventListener('keydown',keydown,true)};
 },[]);
 const toggle=async()=>{
  if(active){
   setActive(false);
   if(document.fullscreenElement)await document.exitFullscreen().catch(()=>undefined);
   return;
  }
  setActive(true);
  if(ref.current?.requestFullscreen)await ref.current.requestFullscreen().catch(()=>undefined);
 };
 return{ref,active,toggle};
}

export function FullscreenButton({active,onClick,label='visualização'}:{active:boolean;onClick:()=>void;label?:string}){
 return <button type="button" className="fullscreenButton" onClick={onClick} aria-pressed={active} title={active?'Sair da tela cheia':'Abrir em tela cheia'}>{active?<Minimize2/>:<Maximize2/>}<span>{active?'Sair da tela cheia':`Tela cheia`}</span><span className="srOnly"> de {label}</span></button>;
}

export function FullscreenTargetButton({target,label}:{target:string;label:string}){
 const buttonRef=useRef<HTMLButtonElement>(null),[active,setActive]=useState(false);
 const surface=()=>buttonRef.current?.closest<HTMLElement>(target)||null;
 useEffect(()=>{
  const change=()=>{const element=surface();if(document.fullscreenElement!==element){element?.classList.remove('fullscreenSurfaceActive');setActive(false)}};
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){surface()?.classList.remove('fullscreenSurfaceActive');setActive(false);if(document.fullscreenElement)void document.exitFullscreen().catch(()=>undefined)}};
  document.addEventListener('fullscreenchange',change);document.addEventListener('keydown',keydown,true);
  return()=>{document.removeEventListener('fullscreenchange',change);document.removeEventListener('keydown',keydown,true);surface()?.classList.remove('fullscreenSurface','fullscreenSurfaceActive')};
 },[target]);
 const toggle=async()=>{
  const element=surface();if(!element)return;
  if(active){element.classList.remove('fullscreenSurfaceActive');setActive(false);if(document.fullscreenElement)await document.exitFullscreen().catch(()=>undefined);return}
  element.classList.add('fullscreenSurface','fullscreenSurfaceActive');setActive(true);if(element.requestFullscreen)await element.requestFullscreen().catch(()=>undefined);
 };
 return <button ref={buttonRef} type="button" className="fullscreenButton" onClick={toggle} aria-pressed={active} title={active?'Sair da tela cheia':'Abrir em tela cheia'}>{active?<Minimize2/>:<Maximize2/>}<span>{active?'Sair da tela cheia':'Tela cheia'}</span><span className="srOnly"> de {label}</span></button>;
}
