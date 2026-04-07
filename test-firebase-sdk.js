import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCCHzwVLfKflfvtoJ4c37bJ3m6nOh8Pink",
  authDomain: "unreal-assistant-9mnru.firebaseapp.com",
  projectId: "unreal-assistant-9mnru",
  storageBucket: "unreal-assistant-9mnru.firebasestorage.app",
  messagingSenderId: "1061890560287",
  appId: "1:1061890560287:web:b2ea32219cac95aee8602a",
  measurementId: "",
  firestoreDatabaseId: "unreal-assistant-9mnru"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'test@example.com', 'password123')
  .then(() => console.log('Success'))
  .catch((e) => console.error('Error:', e.code, e.message));
