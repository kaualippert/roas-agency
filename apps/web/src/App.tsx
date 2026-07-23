import {Suspense} from 'react';
import AppLayout from './app/AppLayout';
import AppOverlays from './app/AppOverlays';
import AppRoutes from './app/AppRoutes';
import RouteUiState from './RouteUiState';

export default function App(){
 return <div className="app">
  <RouteUiState/>
  <AppLayout><Suspense fallback={<main className="routeLoading"><span/><span/><span/></main>}><AppRoutes/></Suspense></AppLayout>
  <Suspense fallback={null}><AppOverlays/></Suspense>
 </div>
}
