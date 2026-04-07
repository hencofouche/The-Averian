import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const app = initializeApp({});
const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'test@example.com', 'password123')
  .then(() => console.log('Success'))
  .catch((e) => console.error('Error:', e.code, e.message));
