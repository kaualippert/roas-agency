import {useState} from 'react';
import {CheckCircle2,LockKeyhole,UserCheck} from 'lucide-react';
import {acceptInvitation} from './access-api';
import {auth} from './firebase';
import {store} from './storage';

export default function InviteAcceptancePage(){
 const token=new URLSearchParams(location.search).get('token')||'';
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const accept=async()=>{
  if(!token)return;
  setBusy(true);setError('');
  try{
   await acceptInvitation(token);
   store.clearSession();
   await store.init();
   location.assign('/dashboard');
  }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível aceitar o convite.');setBusy(false)}
 };
 return <main className="inviteAcceptScreen"><section className="inviteAcceptCard">
  <span className="inviteAcceptIcon"><UserCheck/></span>
  <small>CONVITE PARA A EQUIPE</small>
  <h1>Ative seu acesso à agência</h1>
  <p>O acesso será vinculado com segurança à conta autenticada abaixo e respeitará as áreas e clientes definidos no convite.</p>
  <div className="inviteIdentity"><LockKeyhole/><div><small>Conta autenticada</small><b>{auth.currentUser?.email||'E-mail não informado'}</b></div></div>
  {!token?<p className="inviteError">O link do convite está incompleto.</p>:error?<p className="inviteError">{error}</p>:null}
  <button className="btn inviteAcceptButton" disabled={!token||busy} onClick={accept}>{busy?'Ativando acesso…':<><CheckCircle2/> Aceitar convite</>}</button>
  <a href="/dashboard">Voltar ao sistema</a>
 </section></main>
}
