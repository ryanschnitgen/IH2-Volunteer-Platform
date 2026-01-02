import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    let serviceAccount: any;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Option 1: Full service account JSON in one environment variable
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Option 2: Individual environment variables
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

      if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
        throw new Error('Missing required Firebase Admin environment variables');
      }

      // Handle different private key formats
      // Try to decode if it's base64 encoded
      let processedPrivateKey = privateKey;
      try {
        // Check if it's base64 encoded (common in Vercel)
        if (!privateKey.includes('BEGIN PRIVATE KEY')) {
          processedPrivateKey = Buffer.from(privateKey, 'base64').toString('utf8');
        }
      } catch (e) {
        // If base64 decode fails, treat as raw key
        processedPrivateKey = privateKey;
      }

      // Replace escaped newlines with actual newlines
      processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');

      serviceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: processedPrivateKey,
      };
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
export default admin;
