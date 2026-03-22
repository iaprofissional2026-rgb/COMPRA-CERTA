// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhiaubyKgX07WSCjAKGWcjaNsw-Qu6Eq4",
  authDomain: "compracerta-4bc35.firebaseapp.com",
  projectId: "compracerta-4bc35",
  storageBucket: "compracerta-4bc35.firebasestorage.app",
  messagingSenderId: "112192722446",
  appId: "1:112192722446:web:b842d285b2624498a7ce5f",
  measurementId: "G-9SKMD2LV6Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
