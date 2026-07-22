import {useEffect,useState} from 'react';
import {FirebaseError} from 'firebase/app';
import {onAuthStateChanged,sendPasswordResetEmail,signInWithEmailAndPassword,signInWithPopup,type User} from 'firebase/auth';
import {ArrowRight,Eye,EyeOff,LockKeyhole,Mail} from 'lucide-react';
import {auth,authPersistenceReady,googleProvider} from './firebase';
import {store} from './storage';

type Status='auth'|'data'|'ready'|'error';

export default function AuthGate({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),[status,setStatus]=useState<Status>('auth'),[message,setMessage]=useState('');
 useEffect(()=>onAuthStateChanged(auth,async current=>{
  setUser(current);setMessage('');
  if(!current){store.clearSession();setStatus('ready');return}
  setStatus('data');
  try{await store.init();setStatus('ready')}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível acessar a API.');setStatus('error')}
 }),[]);
 if(status==='auth'||status==='data')return <AuthLoading label={status==='auth'?'Validando sua sessão…':'Carregando dados da agência…'}/>;
 if(!user)return <LoginPage/>;
 if(status==='error')return <main className="authScreen"><section className="authError"><span><LockKeyhole/></span><h1>Não foi possível acessar os dados</h1><p>{message}</p><button className="btn" onClick={()=>location.reload()}>Tentar novamente</button></section></main>;
 return children;
}

function LoginPage(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const login=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError('');setNotice('');try{await authPersistenceReady;await signInWithEmailAndPassword(auth,email.trim(),password)}catch(reason){setError(authError(reason))}finally{setBusy(false)}};
 const google=async()=>{setBusy(true);setError('');setNotice('');try{await authPersistenceReady;await signInWithPopup(auth,googleProvider)}catch(reason){setError(authError(reason))}finally{setBusy(false)}};
 const reset=async()=>{if(!email.trim()){setError('Informe seu e-mail para recuperar a senha.');return}setBusy(true);setError('');try{await sendPasswordResetEmail(auth,email.trim());setNotice('Enviamos o link de redefinição para o seu e-mail.')}catch(reason){setError(authError(reason))}finally{setBusy(false)}};
 return <main className="authScreen"><section className="authBrand"><div className="authBrandLogo"><span>R</span><div><b>ROAS</b><small>AGÊNCIA DE PERFORMANCE</small></div></div><div className="authBrandCopy"><small>GESTÃO CENTRALIZADA</small><h1>Sua agência inteira em um único lugar.</h1><p>Clientes, projetos, tarefas, CRM e financeiro protegidos por autenticação segura.</p></div><div className="authBrandGrid"><i/><i/><i/><i/></div></section><section className="loginPanel"><div className="loginBox"><div className="loginHeading"><span><LockKeyhole/></span><div><small>ACESSO RESTRITO</small><h2>Entre na sua conta</h2><p>Use uma conta habilitada no Firebase da agência.</p></div></div><button className="googleLogin" type="button" onClick={google} disabled={busy}><GoogleIcon/><span>Continuar com Google</span></button><div className="loginDivider"><span>ou acesse com e-mail</span></div><form onSubmit={login}><label>E-mail<div><Mail/><input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="voce@empresa.com.br"/></div></label><label>Senha<div><LockKeyhole/><input type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} placeholder="Sua senha"/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label><button className="forgotPassword" type="button" onClick={reset} disabled={busy}>Esqueci minha senha</button>{error&&<p className="loginMessage error">{error}</p>}{notice&&<p className="loginMessage success">{notice}</p>}<button className="emailLogin" disabled={busy}>{busy?'Entrando…':<>Entrar <ArrowRight/></>}</button></form><footer><LockKeyhole/> Sessão protegida pelo Firebase Authentication</footer></div></section></main>;
}

function AuthLoading({label}:{label:string}){return <main className="authLoading"><span className="authLoader">R</span><p>{label}</p></main>}
function GoogleIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.7 4.7 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-4V7.4H3.2a10 10 0 0 0 0 9.2L6.5 14Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.4L6.5 10A5.8 5.8 0 0 1 12 6Z"/></svg>}
function authError(reason:unknown){if(!(reason instanceof FirebaseError))return'Não foi possível entrar. Tente novamente.';return({
 'auth/invalid-credential':'E-mail ou senha inválidos.',
 'auth/user-disabled':'Este usuário foi desativado.',
 'auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.',
 'auth/popup-closed-by-user':'A janela do Google foi fechada antes da conclusão.',
 'auth/popup-blocked':'O navegador bloqueou a janela de login do Google.',
 'auth/network-request-failed':'Falha de conexão. Verifique sua internet.',
 'auth/unauthorized-domain':'Este domínio ainda não foi autorizado no Firebase.',
 } as Record<string,string>)[reason.code]||'Não foi possível autenticar esta conta.'}
