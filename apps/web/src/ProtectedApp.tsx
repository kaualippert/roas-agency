import App from './App';
import AuthGate from './AuthGate';

export default function ProtectedApp(){return <AuthGate><App/></AuthGate>}
