// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getAuth } from "firebase/auth";
// Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

// NOTE: authDomain
// localhost:3001에서 앱을 열어도, Firebase Google 로그인은 내부적으로 authDomain(지금
// 은 pomodoro-ef5e0.firebaseapp.com)의 iframe/popup을 통해 통신합니다.
// 그래서 API 서버 입장에서는 요청 referer가
// https://pomodoro-ef5e0.firebaseapp.com/...로 보일 수 있어요.
// 즉:
// - 앱 시작: http://localhost:3001
// - 실제 인증 보조 요청: https://pomodoro-ef5e0.firebaseapp.com 쪽에서 발생
// - 그래서 키 제한에 firebaseapp.com 도메인도 허용 필요
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "pomodoro-ef5e0.firebaseapp.com",
  projectId: "pomodoro-ef5e0",
  storageBucket: "pomodoro-ef5e0.appspot.com",
  messagingSenderId: "1090399963563",
  appId: "1:1090399963563:web:3770ce113bc93a4443eaee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

//export const provider = new GoogleAuthProvider();
