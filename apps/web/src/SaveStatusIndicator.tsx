import {useEffect,useRef,useState} from 'react';
import {Check,CloudOff,Download,LoaderCircle,RefreshCw,X} from 'lucide-react';
import {store} from './storage';
import './save-status.css';

export default function SaveStatusIndicator(){
 const [status,setStatus]=useState(()=>store.saveStatus()),[open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const update=()=>setStatus(store.saveStatus());
  window.addEventListener('roas-save-status',update);update();
  return()=>window.removeEventListener('roas-save-status',update);
 },[]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus()}};
  document.addEventListener('mousedown',close);window.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('mousedown',close);window.removeEventListener('keydown',escape)};
 },[open]);
 const label=status.status==='saving'?'Salvando…':status.status==='saved'?'Salvo':'Falha';
 return <div className={`saveStatus ${status.status}`} ref={root}>
  <button className="saveStatusToggle" type="button" aria-expanded={open} aria-controls="save-status-details" onClick={()=>setOpen(value=>!value)} title={status.message||label}>
   {status.status==='saving'?<LoaderCircle/>:status.status==='saved'?<Check/>:<CloudOff/>}<span>{label}</span>{status.recoverable>0&&<i>{status.recoverable}</i>}
  </button>
  <span className="saveStatusAnnounce" role="status" aria-live="polite">{label}{status.recoverable>0?'. Rascunho disponível para recuperação.':''}</span>
  {open&&<section id="save-status-details" className="saveStatusDetails" aria-label="Detalhes do salvamento">
   <div className="saveStatusHeading"><b>{status.recoverable?'Rascunho recuperável':status.status==='saved'?'Tudo salvo':status.status==='saving'?'Salvando alterações':'Falha no salvamento'}</b><button type="button" aria-label="Fechar detalhes do salvamento" onClick={()=>setOpen(false)}><X/></button></div>
   <p>{status.message||(status.status==='saved'?'Todas as alterações confirmadas foram salvas no servidor.':'Aguarde a confirmação do servidor antes de fechar a página.')}</p>
   {status.recoverable>0&&<><p>Recupere as alterações pendentes. O servidor verificará permissões e conflitos antes de aplicá-las.</p><div className="saveStatusActions"><button type="button" disabled={status.pending>0} onClick={()=>store.recoverDrafts()}><RefreshCw/> Recuperar rascunho</button><button type="button" className="secondary" onClick={()=>{if(confirm('Descartar os rascunhos recuperáveis? Os dados já salvos no servidor serão mantidos.'))store.discardDrafts()}}>Descartar</button></div><button type="button" className="saveDraftDownload" onClick={()=>store.downloadDrafts()}><Download/> Baixar cópia do rascunho</button></>}
   {status.status==='error'&&status.pending>0&&<button type="button" className="saveRetry" onClick={()=>store.retrySave()}><RefreshCw/> Tentar novamente</button>}
   {status.status!=='saved'&&<small>Rascunhos de alterações confirmadas ficam neste navegador, por conta, por até 7 dias. Não substituem um backup. Em dispositivos compartilhados, descarte-os após resolver o envio.</small>}
  </section>}
 </div>;
}
