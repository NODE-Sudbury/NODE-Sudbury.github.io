import { getAnalytics } from 'firebase/analytics';
import { type FirebaseApp, type FirebaseOptions, initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getPerformance, initializePerformance } from 'firebase/performance';
import { isServer } from 'lit';
import { highlightMissingAlt } from './utils/missing-alt';

/**
 * Load Firebase config in the layout with /__/firebase/init.js. It stubs out
 * window.firebase.initializeApp to grab the config and saves it on the window
 * for use here. This is a workaround for the fact that the Firebase SDK v9 is
 * modular and doesn't support init.js and top-level await is not well supported
 * so loading from init.json caused issues with Safari, Jest, Vite, etc.
 *
 * https://github.com/gdg-x/hoverboard/pull/2368
 */

declare global {
  interface Window {
    firebaseConfig?: FirebaseOptions;
    process?: { env: { NODE_ENV?: string } };
  }
}

/**
 * What Firebase starts with when the site has no Firebase project, as N.O.D.E. does not. Nothing
 * reaches the network until a Firestore feature is used, and those features are off.
 */
const INERT_CONFIG: FirebaseOptions = {
  apiKey: 'not-used',
  appId: 'not-used',
  projectId: 'not-used',
};

const start = (givenConfig: FirebaseOptions | undefined) => {
  const inert = !givenConfig;
  const firebaseConfig = givenConfig ?? INERT_CONFIG;
  const firebaseApp = initializeApp(firebaseConfig);
  // Every tab shares one cache and one queue of writes, so a change in one tab shows in the others.
  const db: Firestore = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  /**
   * Local development always runs on the emulators with a `demo-` project (see `npm start`), which
   * cannot reach real Firebase services. Connect must happen before any other Firestore calls.
   */
  const isDemoProject = firebaseConfig.projectId?.startsWith('demo-') ?? false;

  if (isDemoProject) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // So organizers see the images that need alt text before they deploy.
    highlightMissingAlt();
  }

  // Demo projects have no app ID, which Analytics and Performance Monitoring need, and a site
  // with no Firebase project has nothing to report to.
  const measured = !isDemoProject && !inert;
  const analytics = measured ? getAnalytics(firebaseApp) : undefined;

  if (measured) {
    getPerformance(firebaseApp);
    initializePerformance(firebaseApp);
  }

  return { firebaseApp, db, isDemoProject, analytics };
};

// Pages render at build time from data passed in, so reaching Firebase there is a bug.
const unavailable = <T extends object>(name: string): T =>
  new Proxy({} as T, {
    get: () => {
      throw new Error(`${name} is not available on the server`);
    },
  });

export const { firebaseApp, db, isDemoProject, analytics } = isServer
  ? {
      firebaseApp: unavailable<FirebaseApp>('firebaseApp'),
      db: unavailable<Firestore>('db'),
      isDemoProject: false,
      analytics: undefined,
    }
  : start(window.firebaseConfig);
