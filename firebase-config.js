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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
window.auth = firebase.auth();

// Initialize Firebase Cloud Messaging
let messaging;
try {
    messaging = firebase.messaging();
    window.messaging = messaging;
} catch (error) {
    console.warn('Firebase Messaging not available:', error);
}
