// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRaFGI6r7WrRy-uhRapVbsLw5JllZYHNU",
    authDomain: "mnr-grocery.firebaseapp.com",
    projectId: "mnr-grocery",
    storageBucket: "mnr-grocery.firebasestorage.app",
    messagingSenderId: "40213820077",
    appId: "1:40213820077:web:5ef71592f3a347b47d8c24",
    measurementId: "G-7RRDLTWZHX"
};

try {
    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    // Enable offline persistence
    db.enablePersistence().catch((err) => {
        console.warn('Firestore persistence failed:', err);
    });
    
} catch (error) {
    console.error('Firebase initialization error:', error);
}
