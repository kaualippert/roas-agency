import {lazy,Suspense} from 'react';
import {useLocation} from 'react-router-dom';
import AppLayout from './app/AppLayout';
import AppOverlays from './app/AppOverlays';
import AppRoutes from './app/AppRoutes';
import RouteUiState from './RouteUiState';
const InviteAcceptancePage=lazy(()=>import('./InviteAcceptancePage'));

export default function App(){
 const location=useLocation();
 if(location.pathname==='/accept-invite')return <Suspense fallback={<main className="routeLoading"><span/><span/><span/></main>}><InviteAcceptancePage/></Suspense>;
 return <div className="app">
  <RouteUiState/>
  <AppLayout><Suspense fallback={<main className="routeLoading"><span/><span/><span/></main>}><AppRoutes/></Suspense></AppLayout>
  <Suspense fallback={null}><AppOverlays/></Suspense>
 </div>
}
