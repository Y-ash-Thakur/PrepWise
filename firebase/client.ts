
import { initializeApp, getApp, getApps} from "firebase/app";
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDMtId_CcNMtsxcwKyc9C2VS-EBOA-e5Vo",
    authDomain: "prepwise-31b1f.firebaseapp.com",
    projectId: "prepwise-31b1f",
    storageBucket: "prepwise-31b1f.firebasestorage.app",
    messagingSenderId: "373591270131",
    appId: "1:373591270131:web:b2ffa09ed6fae050f04d86",
    measurementId: "G-DMR8D038L7"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);