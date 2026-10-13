import { msg } from '@lit/localize';
import { Workbox } from 'workbox-window';
import { store } from './store';
import { queueComplexSnackbar, queueSnackbar } from './store/snackbars';
import { basepath } from './config/site';

if ('serviceWorker' in navigator) {
  const workbox = new Workbox('service-worker.js', { scope: basepath });

  // The new worker waits until the user opts in so open tabs never run
  // against precached assets deleted by the new version.
  workbox.addEventListener('waiting', () => {
    store.dispatch(
      queueComplexSnackbar({
        label: msg('A new version of this app is available.', {
          id: 'shell.service-worker.available',
        }),
        action: {
          title: msg('Refresh', { id: 'shell.service-worker.refresh' }),
          callback: () => {
            workbox.addEventListener('controlling', () => window.location.reload());
            workbox.messageSkipWaiting();
          },
        },
      }),
    );
  });

  workbox.register().catch((e: unknown) => {
    console.error('Service worker registration failed:', e);
    store.dispatch(
      queueSnackbar(msg('Error caching for offline use.', { id: 'shell.service-worker.error' })),
    );
  });
}
