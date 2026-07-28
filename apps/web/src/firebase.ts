import {initializeApp} from 'firebase/app';
import {browserLocalPersistence,getAuth,GoogleAuthProvider,setPersistence} from 'firebase/auth';

const firebaseConfig={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'AIzaSyCeNZ0kCNj3I52WTsv8ekBXHzf0icsW5rk',
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'flowroas-space.firebaseapp.com',
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||'flowroas-space',
 storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET||'flowroas-space.firebasestorage.app',
 messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID||'1006576229337',
 appId:import.meta.env.VITE_FIREBASE_APP_ID||'1:1006576229337:web:b52e26b99bf25b64bd97c8',
 measurementId:import.meta.env.VITE_FIREBASE_MEASUREMENT_ID||'G-160ZC5T3HQ',
};

export const firebaseApp=initializeApp(firebaseConfig);
export const auth=getAuth(firebaseApp);
export const googleProvider=new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt:'select_account'});

export const authPersistenceReady=setPersistence(auth,browserLocalPersistence);
export async function getIdToken(){return auth.currentUser?.getIdToken()||null}
