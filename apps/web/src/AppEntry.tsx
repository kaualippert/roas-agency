import {lazy,Suspense} from 'react';
import {useLocation} from 'react-router-dom';

const PublicInformationPage=lazy(()=>import('./PublicInformationPage'));
const ProtectedApp=lazy(()=>import('./ProtectedApp'));

export default function AppEntry(){
 const pathname=useLocation().pathname.replace(/\/$/,'');
 const publicPage=pathname==='/privacidade'?'privacy':pathname==='/termos'?'terms':pathname==='/sobre'?'about':null;
 return <Suspense fallback={<main className="routeLoading" role="status">Carregando…</main>}>{publicPage?<PublicInformationPage page={publicPage}/>:<ProtectedApp/>}</Suspense>;
}
