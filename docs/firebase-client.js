const FIREBASE_SDK_VERSION = '10.13.0';

let firebaseApp;
let firebaseAuth;
let firebaseDb;
let modules;

async function loadModules() {
  if (modules) return modules;
  const [appMod, authMod, dbMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
  ]);
  modules = {
    initializeApp: appMod.initializeApp,
    getAuth: authMod.getAuth,
    GoogleAuthProvider: authMod.GoogleAuthProvider,
    signInWithPopup: authMod.signInWithPopup,
    signOut: authMod.signOut,
    onAuthStateChanged: authMod.onAuthStateChanged,
    getFirestore: dbMod.getFirestore,
    doc: dbMod.doc,
    getDoc: dbMod.getDoc,
    setDoc: dbMod.setDoc,
  };
  return modules;
}

async function ensureFirebase(config) {
  if (firebaseApp) {
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  }
  if (!config) {
    throw new Error('Firebase config missing');
  }
  const fb = await loadModules();
  firebaseApp = fb.initializeApp(config);
  firebaseAuth = fb.getAuth(firebaseApp);
  firebaseDb = fb.getFirestore(firebaseApp);
  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
}

export async function bootstrapFirebase(config) {
  return ensureFirebase(config);
}

export function subscribeToAuthChanges(callback) {
  if (!firebaseAuth || !modules?.onAuthStateChanged) {
    console.warn('Firebase auth not initialized.');
    return () => {};
  }
  return modules.onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle() {
  if (!firebaseAuth) {
    throw new Error('Firebase auth unavailable');
  }
  const provider = new modules.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return modules.signInWithPopup(firebaseAuth, provider);
}

export function signOutUser() {
  if (!firebaseAuth) {
    throw new Error('Firebase auth unavailable');
  }
  return modules.signOut(firebaseAuth);
}

export async function fetchEntitlement(uid) {
  if (!firebaseDb) {
    throw new Error('Firestore unavailable');
  }
  if (!uid) return null;
  const ref = modules.doc(firebaseDb, 'entitlements', uid);
  const snapshot = await modules.getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data();
}
