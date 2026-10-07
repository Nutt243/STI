// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  runTransaction, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: "process.env.FIREBASE_API_KEY",
  authDomain: "stockcom02-86eaf.firebaseapp.com",
  projectId: "stockcom02-86eaf",
  storageBucket: "stockcom02-86eaf.firebasestorage.app",
  messagingSenderId: "918587005644",
  appId: "1:918587005644:web:9eb2ae0df1dfe940970069",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
  auth, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  runTransaction, 
  increment, 
  serverTimestamp 
};