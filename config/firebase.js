// config/firebase.js
// Firebase Admin SDK initialization using service account from .env

const admin = require('firebase-admin');

let db, rtdb, auth, storage;

function initFirebase() {
  if (admin.apps.length > 0) {
    db      = admin.firestore();
    rtdb    = admin.database();
    auth    = admin.auth();
    storage = admin.storage();
    return;
  }

  const serviceAccount = {
    type: 'service_account',
    project_id:                process.env.FIREBASE_PROJECT_ID,
    private_key_id:            process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key:               process.env.FIREBASE_PRIVATE_KEY
                                  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                                  : undefined,
    client_email:              process.env.FIREBASE_CLIENT_EMAIL,
    client_id:                 process.env.FIREBASE_CLIENT_ID,
    auth_uri:                  'https://accounts.google.com/o/oauth2/auth',
    token_uri:                 'https://oauth2.googleapis.com/token',
  };

  admin.initializeApp({
    credential:    admin.credential.cert(serviceAccount),
    databaseURL:   process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });

  db      = admin.firestore();
  rtdb    = admin.database();
  auth    = admin.auth();
  storage = admin.storage();

  // Ignore undefined properties in Firestore writes
  db.settings({ ignoreUndefinedProperties: true });

  console.log(`✅ Firebase Admin SDK initialized — project: ${process.env.FIREBASE_PROJECT_ID}`);
}

initFirebase();

module.exports = { admin, db, rtdb, auth, storage };
