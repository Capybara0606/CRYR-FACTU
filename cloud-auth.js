import {firebaseConfig} from './firebase-config.js';
export async function connectAuth(onUser){
  const [{initializeApp},sdk]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
  ]);
  const app=initializeApp(firebaseConfig);
  const auth=sdk.initializeAuth(app,{persistence:sdk.inMemoryPersistence,popupRedirectResolver:sdk.browserPopupRedirectResolver});
  sdk.onAuthStateChanged(auth,onUser);
  return {
    google:()=>sdk.signInWithPopup(auth,new sdk.GoogleAuthProvider()),
    email:(email,password)=>sdk.signInWithEmailAndPassword(auth,email,password),
    logout:()=>sdk.signOut(auth)
  };
}
