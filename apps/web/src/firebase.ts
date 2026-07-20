import {initializeApp} from 'firebase/app';
import {browserLocalPersistence,getAuth,GoogleAuthProvider,setPersistence} from 'firebase/auth';

const firebaseConfig={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'AIzaSyAJYfVo6xNMLzT6YuK3KPEleMajDz4I_RM',
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'agencia-roas.firebaseapp.com',
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||'agencia-roas',
 storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET||'agencia-roas.firebasestorage.app',
 messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID||'747665912742',
 appId:import.meta.env.VITE_FIREBASE_APP_ID||'1:747665912742:web:a7a72813c3f31d6e7cd567',
};

export const firebaseApp=initializeApp(firebaseConfig);
export const auth=getAuth(firebaseApp);
export const googleProvider=new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt:'select_account'});

export const authPersistenceReady=setPersistence(auth,browserLocalPersistence);
export async function getIdToken(){return auth.currentUser?.getIdToken()||null}
