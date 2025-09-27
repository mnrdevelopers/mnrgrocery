// firebase-messaging-sw.js - Fixed version
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
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
const messaging = firebase.messaging();

// Customize background message handling
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || 'FamilyGrocer';
    const notificationOptions = {
        body: payload.notification?.body || 'New update from your family',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: payload.data || {},
        actions: [
            {
                action: 'open',
                title: 'Open App'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    const payload = event.notification.data;
    
    event.waitUntil(
        clients.matchAll({ 
            type: 'window',
            includeUncontrolled: true 
        }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes('/app.html') && 'focus' in client) {
                    client.focus();
                    
                    // Send message to navigate to specific tab
                    if (payload && payload.tab) {
                        client.postMessage({
                            type: 'NAVIGATE_TO_TAB',
                            tab: payload.tab
                        });
                    }
                    return;
                }
            }
            
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow('/app.html');
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
});
