// Import the functions you need from the SDKs you need
import {initializeApp} from 'firebase/app';
//import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import {getAuth} from 'firebase/auth';
// Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBkogia4Wk0L8PGBmBUe8nchmnTUCP12So',
  authDomain: 'pomodoro-ef5e0.firebaseapp.com',
  projectId: 'pomodoro-ef5e0',
  storageBucket: 'pomodoro-ef5e0.appspot.com',
  messagingSenderId: '1090399963563',
  appId: '1:1090399963563:web:3770ce113bc93a4443eaee',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

//export const provider = new GoogleAuthProvider();
