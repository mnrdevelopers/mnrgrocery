// onesignal-config.js - GitHub Pages specific configuration
class OneSignalConfig {
    static getConfig() {
        const isGitHubPages = window.location.hostname.includes('github.io');
        const repoName = 'FamilyGrocer';
        
        if (isGitHubPages) {
            return {
                appId: "6b1d9511-6cdb-44cb-bff0-8798cf9bfc46",
                serviceWorkerPath: `/${repoName}/OneSignalSDKWorker.js`,
                serviceWorkerParam: { scope: `/${repoName}/` },
                httpPermissionRequest: { enable: true },
                promptOptions: {
                    slidedown: {
                        enabled: true,
                        autoPrompt: true,
                        timeDelay: 3
                    }
                },
                notifyButton: { enable: true }
            };
        } else {
            // Local development configuration
            return {
                appId: "6b1d9511-6cdb-44cb-bff0-8798cf9bfc46",
                serviceWorkerPath: '/OneSignalSDKWorker.js',
                serviceWorkerParam: { scope: '/' },
                httpPermissionRequest: { enable: true },
                promptOptions: {
                    slidedown: {
                        enabled: true,
                        autoPrompt: true,
                        timeDelay: 3
                    }
                },
                notifyButton: { enable: true },
                allowLocalhostAsSecureOrigin: true
            };
        }
    }
}
