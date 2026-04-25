import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC00RS-_p1Kfm07UPcKq4kPfHsd3oRixxg",
  authDomain: "personal-finance-analyti-4cf20.web.app",
  projectId: "personal-finance-analyti-4cf20",
  storageBucket: "personal-finance-analyti-4cf20.firebasestorage.app",
  messagingSenderId: "829602320057",
  appId: "1:829602320057:web:85418864818e670d11d568",
  measurementId: "G-DD3SM5S7ZR"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Activar Persistencia Offline según Firebase v10+
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

export default app;
