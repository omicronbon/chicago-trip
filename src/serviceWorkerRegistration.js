export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      navigator.serviceWorker.register(swUrl).then(
        (registration) => {
          console.log('SW registered:', registration.scope);

          // Check for updates on an interval
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content available — notify the app
                  console.log('New SW version available');
                  window.dispatchEvent(
                    new CustomEvent('swUpdate', { detail: registration })
                  );
                }
              }
            };
          };
        },
        (error) => {
          console.log('SW registration failed:', error);
        }
      );
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
