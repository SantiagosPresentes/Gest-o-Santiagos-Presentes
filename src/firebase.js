import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDdVM8Oc290iP9FWGQ_L06AyYbK7XixXyw",
  authDomain: "santiagos-presentes.firebaseapp.com",
  projectId: "santiagos-presentes",
  storageBucket: "santiagos-presentes.firebasestorage.app",
  messagingSenderId: "727035547129",
  appId: "1:727035547129:web:82e04cecd591a0a7844128",
  measurementId: "G-VVHCGVQYLB"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);