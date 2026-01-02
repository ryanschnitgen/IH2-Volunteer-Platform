import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCf3bP_BlkL4L8OgS69a1biqowlK5G6QJM",
  authDomain: "ih2-volunteer-portal-3f4d1.firebaseapp.com",
  projectId: "ih2-volunteer-portal-3f4d1",
  storageBucket: "ih2-volunteer-portal-3f4d1.firebasestorage.app",
  messagingSenderId: "965696921970",
  appId: "1:965696921970:web:51706ba9477f80bf84bdeb"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
