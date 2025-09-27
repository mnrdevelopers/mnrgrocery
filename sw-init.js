// sw-init.js - Service Worker initialization helper
class ServiceWorkerManager {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator;
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Service Workers not supported in this browser');
            return;
        }

        try {
            await this.registerServiceWorker();
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            this.fallbackToNoSW();
        }
    }

    async registerServiceWorker() {
        const repoName = 'FamilyGrocer';
        const basePath = window.location.hostname.includes('github.io') ? `/${repoName}/` : '/';
        const swPath = basePath + 'OneSignalSDKWorker.js';
        const swScope = basePath;

        console.log('Registering Service Worker:', { path: swPath, scope: swScope });

        try {
            const registration = await navigator.serviceWorker.register(swPath, {
                scope: swScope
            });

            console.log('Service Worker registered successfully:', registration);
            
            // Wait for the service worker to be ready
            await navigator.serviceWorker.ready;
            console.log('Service Worker is ready');
            
            return registration;

        } catch (error) {
            console.error('Service Worker registration failed:', error);
            
            // Try fallback registration
            return await this.tryFallbackRegistration();
        }
    }

    async tryFallbackRegistration() {
        console.log('Trying fallback Service Worker registration...');
        
        // Try different path variations
        const pathsToTry = [
            '/FamilyGrocer/OneSignalSDKWorker.js',
            'OneSignalSDKWorker.js',
            './OneSignalSDKWorker.js'
        ];

        for (const path of pathsToTry) {
            try {
                const registration = await navigator.serviceWorker.register(path, {
                    scope: '/FamilyGrocer/'
                });
                console.log(`Service Worker registered with path: ${path}`);
                return registration;
            } catch (error) {
                console.warn(`Failed with path ${path}:`, error);
                continue;
            }
        }
        
        throw new Error('All Service Worker registration attempts failed');
    }

    fallbackToNoSW() {
        console.warn('Falling back to no Service Worker mode');
        // OneSignal can work without Service Workers for basic functionality
        window.OneSignalNoSW = true;
    }
}

// Initialize Service Worker manager
document.addEventListener('DOMContentLoaded', () => {
    new ServiceWorkerManager();
});
