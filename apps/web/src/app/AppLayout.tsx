import {useEffect,useRef,useState} from 'react';
import {Bell,ChevronDown,ChevronsLeft,ChevronsRight,LockKeyhole,LogOut,Menu,Settings} from 'lucide-react';
import {Link,NavLink,useLocation} from 'react-router-dom';
import {signOut} from 'firebase/auth';
import type {TeamMember} from '../types';
import {auth} from '../firebase';
import {store} from '../storage';
import {canAccessPath,firstAllowedPath,memberRoles} from './access-control';
import {navGroups,pageMeta} from './navigation';
import {useStoreData} from './useStoreData';
import './access-control.css';

type Notification={read:boolean};

function Logo(){const [settings]=useStoreData('general_settings',{agencyName:'ROAS',logoDataUrl:'',logoFit:'contain' as const,logoScale:100,logoPositionX:50,logoPositionY:50}),name=settings.agencyName?.trim()||'ROAS';useEffect(()=>{document.title=`${name} · Gestão de agência`},[name]);return <div className="logo">{settings.logoDataUrl?<span className="agencyLogoFrame"><img className="agencyLogo" src={settings.logoDataUrl} alt={`Logo ${name}`} style={{objectFit:settings.logoFit||'contain',objectPosition:`${settings.logoPositionX??50}% ${settings.logoPositionY??50}%`,transform:`scale(${(settings.logoScale||100)/100})`}}/></span>:<div className="rmark">{name.charAt(0).toUpperCase()}</div>}<div><b title={name}>{name}</b><small>GESTÃO DE AGÊNCIA</small></div></div>}
const initials=(name:string)=>name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase();

function Sidebar({open,setOpen,member,onNavigate}:{open:boolean;setOpen:(value:boolean)=>void;member?:TeamMember;onNavigate:()=>void}){
 const location=useLocation();
 useEffect(()=>{const desktop=window.matchMedia('(min-width: 801px)'),saved=localStorage.getItem('roas_sidebar_open');if(desktop.matches&&saved!==null)setOpen(saved==='true');const listener=(event:Event)=>{if(desktop.matches)setOpen(Boolean((event as CustomEvent).detail))};window.addEventListener('roas-sidebar-toggle',listener);return()=>window.removeEventListener('roas-sidebar-toggle',listener)},[setOpen]);
 const toggle=()=>{const next=!open;setOpen(next);if(window.matchMedia('(min-width: 801px)').matches)localStorage.setItem('roas_sidebar_open',String(next))};
 return <aside id="app-sidebar" className={`sidebar ${open?'open':'closed'}`}><div className="sideTop"><Logo/><button className="iconBtn collapse" type="button" title={open?'Recolher menu':'Expandir menu'} aria-label={open?'Recolher menu':'Expandir menu'} onClick={toggle}>{open?<ChevronsLeft/>:<ChevronsRight/>}</button></div><nav>{navGroups.map(group=>{const items=group.items.filter(item=>canAccessPath(member,`/${item.path}`));if(!items.length)return null;return <div className="navGroup" key={group.label}>{group.label&&<span>{group.label}</span>}{items.map(({path,label,icon:Icon})=><NavLink key={path} title={!open?label:undefined} className={location.pathname.split('/')[1]===path?'active':''} to={`/${path}`} onClick={onNavigate}><Icon/>{open&&<em>{label}</em>}</NavLink>)}</div>})}</nav></aside>
}

function Header({onMenu,member,notifications}:{onMenu:()=>void;member?:TeamMember;notifications:Notification[]}){
 const location=useLocation(),profileRef=useRef<HTMLDivElement>(null),[profileOpen,setProfileOpen]=useState(false),key=location.pathname.split('/')[1]||'dashboard',meta=pageMeta[key]||pageMeta.dashboard;
 const name=auth.currentUser?.displayName||member?.name||auth.currentUser?.email||'Usuário',email=auth.currentUser?.email||member?.email||'',role=memberRoles(member)[0]||'Usuário autenticado',unread=notifications.filter(item=>!item.read).length;
 useEffect(()=>{setProfileOpen(false)},[location.pathname]);
 useEffect(()=>{if(!profileOpen)return;const close=(event:MouseEvent)=>{if(!profileRef.current?.contains(event.target as Node))setProfileOpen(false)},escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setProfileOpen(false)};document.addEventListener('mousedown',close);window.addEventListener('keydown',escape);return()=>{document.removeEventListener('mousedown',close);window.removeEventListener('keydown',escape)}},[profileOpen]);
 const openNotifications=()=>window.dispatchEvent(new CustomEvent('roas-notifications-toggle'));
 return <header><button className="mobileMenu iconBtn" type="button" onClick={onMenu} aria-label="Abrir menu" aria-controls="app-sidebar"><Menu/></button><div className="headTitle"><h1>{meta.title}</h1><p>{meta.sub}</p></div><div className="headerSpacer"/><button className="iconBtn notification" type="button" aria-label="Abrir notificações" onClick={openNotifications}><Bell/>{unread>0&&<i>{unread}</i>}</button><div className="profileSession" ref={profileRef}><button type="button" className="profile" title="Abrir menu do perfil" aria-haspopup="menu" aria-expanded={profileOpen} onClick={()=>setProfileOpen(value=>!value)}><div className="userAvatar">{initials(name)}</div><div><b>{name}</b><small>{role}</small></div><ChevronDown/></button>{profileOpen&&<div className="profileMenu" role="menu"><div className="profileMenuIdentity"><b>{name}</b>{email&&<small>{email}</small>}</div>{canAccessPath(member,'/settings')&&<Link role="menuitem" className="profileMenuLink" to="/settings"><Settings/><span><b>Configurações</b><small>Conta e preferências</small></span></Link>}<button type="button" role="menuitem" className="profileLogout" onClick={()=>void signOut(auth)}><LogOut/><span><b>Sair da conta</b><small>Encerrar esta sessão</small></span></button></div>}</div></header>
}

function AccessDenied({member}:{member?:TeamMember}){return <main><section className="card accessDenied"><LockKeyhole/><h2>Acesso não permitido</h2><p>{member?.name||'Este usuário'} não possui permissão para visualizar esta área.</p><Link className="btn" to={firstAllowedPath(member)}>Ir para uma área permitida</Link></section></main>}

export default function AppLayout({children}:{children:React.ReactNode}){
 const location=useLocation(),[sidebarOpen,setSidebarOpen]=useState(()=>window.matchMedia('(min-width: 801px)').matches?(localStorage.getItem('roas_sidebar_open')!=='false'):false),[team,setTeam]=useState<TeamMember[]>(()=>store.get('team',[])),[notifications,setNotifications]=useState<Notification[]>(()=>store.get('notifications',[]));
 useEffect(()=>{const update=()=>{setTeam(store.get('team',[]));setNotifications(store.get('notifications',[]))};window.addEventListener('roas-change',update);update();return()=>window.removeEventListener('roas-change',update)},[]);
 useEffect(()=>{const mobile=window.matchMedia('(max-width: 800px)'),sync=(event:MediaQueryListEvent)=>setSidebarOpen(event.matches?false:localStorage.getItem('roas_sidebar_open')!=='false');mobile.addEventListener('change',sync);return()=>mobile.removeEventListener('change',sync)},[]);
 useEffect(()=>{if(window.matchMedia('(max-width: 800px)').matches)setSidebarOpen(false)},[location.pathname]);
 useEffect(()=>{const mobile=window.matchMedia('(max-width: 800px)').matches;document.body.classList.toggle('mobileNavOpen',mobile&&sidebarOpen);const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&mobile)setSidebarOpen(false)};window.addEventListener('keydown',close);return()=>{document.body.classList.remove('mobileNavOpen');window.removeEventListener('keydown',close)}},[sidebarOpen]);
 const email=auth.currentUser?.email?.toLowerCase(),member=team.find(item=>item.status==='active'&&item.email.toLowerCase()===email);
 const allowed=canAccessPath(member,location.pathname),closeMobileMenu=()=>{if(window.matchMedia('(max-width: 800px)').matches)setSidebarOpen(false)};
 return <><Sidebar open={sidebarOpen} setOpen={setSidebarOpen} member={member} onNavigate={closeMobileMenu}/>{sidebarOpen&&<button className="sidebarBackdrop" type="button" aria-label="Fechar menu" onClick={()=>setSidebarOpen(false)}/>}<div className={`shell ${sidebarOpen?'wide':'narrow'}`}><Header onMenu={()=>setSidebarOpen(value=>!value)} member={member} notifications={notifications}/>{allowed?children:<AccessDenied member={member}/>}</div></>
}
