import {useEffect,useRef,useState} from 'react';
import {Bell,ChevronDown,LogOut,Menu,Settings} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import {signOut} from 'firebase/auth';
import type {TeamMember} from '../types';
import {auth} from '../firebase';
import {canAccessPath,memberRoles} from './access-control';
import {pageMeta} from './navigation';

export type LayoutNotification={read:boolean};

const initials=(name:string)=>name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase();

export default function AppHeader({onMenu,member,notifications}:{onMenu:()=>void;member?:TeamMember;notifications:LayoutNotification[]}){
 const location=useLocation();
 const profileRef=useRef<HTMLDivElement>(null);
 const [profileOpen,setProfileOpen]=useState(false);
 const key=location.pathname.split('/')[1]||'dashboard';
 const meta=pageMeta[key]||pageMeta.dashboard;
 const name=auth.currentUser?.displayName||member?.name||auth.currentUser?.email||'Usuário';
 const email=auth.currentUser?.email||member?.email||'';
 const role=memberRoles(member)[0]||'Usuário autenticado';
 const unread=notifications.filter(item=>!item.read).length;
 useEffect(()=>{setProfileOpen(false)},[location.pathname]);
 useEffect(()=>{
  if(!profileOpen)return;
  const close=(event:MouseEvent)=>{if(!profileRef.current?.contains(event.target as Node))setProfileOpen(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setProfileOpen(false)};
  document.addEventListener('mousedown',close);
  window.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('mousedown',close);window.removeEventListener('keydown',escape)};
 },[profileOpen]);
 const openNotifications=()=>window.dispatchEvent(new CustomEvent('roas-notifications-toggle'));
 return <header>
  <button className="mobileMenu iconBtn" type="button" onClick={onMenu} aria-label="Abrir menu" aria-controls="app-sidebar"><Menu/></button>
  <div className="headTitle"><h1>{meta.title}</h1><p>{meta.sub}</p></div>
  <div className="headerSpacer"/>
  <button className="iconBtn notification" type="button" aria-label="Abrir notificações" onClick={openNotifications}><Bell/>{unread>0&&<i>{unread}</i>}</button>
  <div className="profileSession" ref={profileRef}>
   <button type="button" className="profile" title="Abrir menu do perfil" aria-haspopup="menu" aria-expanded={profileOpen} onClick={()=>setProfileOpen(value=>!value)}><div className="userAvatar">{initials(name)}</div><div><b>{name}</b><small>{role}</small></div><ChevronDown/></button>
   {profileOpen&&<div className="profileMenu" role="menu">
    <div className="profileMenuIdentity"><b>{name}</b>{email&&<small>{email}</small>}</div>
    {canAccessPath(member,'/settings')&&<Link role="menuitem" className="profileMenuLink" to="/settings"><Settings/><span><b>Configurações</b><small>Conta e preferências</small></span></Link>}
    <button type="button" role="menuitem" className="profileLogout" onClick={()=>void signOut(auth)}><LogOut/><span><b>Sair da conta</b><small>Encerrar esta sessão</small></span></button>
   </div>}
  </div>
 </header>
}
