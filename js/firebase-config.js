import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkkTi0LbMnmrFXsHvc_V6-W_NA7DDVaY0",
  authDomain: "stockcom02-86eaf.firebaseapp.com",
  projectId: "stockcom02-86eaf",
  storageBucket: "stockcom02-86eaf.firebasestorage.app",
  messagingSenderId: "918587005644",
  appId: "1:918587005644:web:9eb2ae0df1dfe940970069"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);