if ('serviceWorker' in navigator) {
  // When a new SW takes control, reload the page to ensure fresh assets
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js');

      // Proactively check for a new SW on every page load
      reg.update().catch(() => {});

      // If a new SW is already waiting (was installed in a previous visit),
      // tell it to skip waiting and take control now
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Also handle the case where a new SW installs during this session
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version ready — activate it immediately
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  });
}
