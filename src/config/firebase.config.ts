import * as admin from 'firebase-admin';

// Flag to indicate if Firebase is available
let isFirebaseAvailable = false;

// Initialize Firebase Admin SDK
export function initializeFirebase(): void {
  // Check if Firebase is already initialized
  if (admin.apps.length === 0) {
    try {
      // For development, you can use a service account key file
      // For production, use environment variables or secret management
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (projectId && privateKey && clientEmail) {
        // Use individual environment variables
        const type = process.env.FIREBASE_TYPE || 'service_account';
        const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
        const clientId = process.env.FIREBASE_CLIENT_ID;
        const authUri = process.env.FIREBASE_AUTH_URI;
        const tokenUri = process.env.FIREBASE_TOKEN_URI;
        const authProviderX509CertUrl = process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL;
        const clientX509CertUrl = process.env.FIREBASE_CLIENT_X509_CERT_URL;
        const universeDomain = process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com';

        admin.initializeApp({
          credential: admin.credential.cert({
            type,
            projectId,
            privateKeyId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
            clientId,
            authUri,
            tokenUri,
            authProviderX509CertUrl,
            clientX509CertUrl,
            universeDomain,
          } as admin.ServiceAccount),
        });
        isFirebaseAvailable = true;
        console.info('Firebase Admin SDK initialized with environment variables');
      } else if (serviceAccount) {
        // Parse the JSON string from environment variable
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount)),
        });
        isFirebaseAvailable = true;
      } else if (serviceAccountPath) {
        // Use the service account file path
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        isFirebaseAvailable = true;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use application default credentials if available
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        isFirebaseAvailable = true;
      } else {
        // Fallback to a local service account file for development
        try {
          // Try to load from the secrets directory first
          const localServiceAccount = require('../config/secrets/firebase-service-account.json');
          admin.initializeApp({
            credential: admin.credential.cert(localServiceAccount),
          });
          isFirebaseAvailable = true;
        } catch (e) {
          // If not found in secrets directory, try the root directory (for backward compatibility)
          try {
            const rootServiceAccount = require('../../firebase-service-account.json');
            admin.initializeApp({
              credential: admin.credential.cert(rootServiceAccount),
            });
            isFirebaseAvailable = true;
          } catch (rootError) {
            if (process.env.MINIMAL_LOGS !== 'true') {
              console.warn('Firebase service account not found. Firebase authentication will be disabled.');
              console.warn('To enable Firebase authentication, set FIREBASE_SERVICE_ACCOUNT environment variable or provide a firebase-service-account.json file.');
            }
          }
          // Initialize Firebase with a dummy app for development
          if (process.env.NODE_ENV !== 'production') {
            try {
              admin.initializeApp({
                projectId: 'dummy-project',
              });
              console.info('Initialized Firebase with dummy configuration for development');
              console.warn('WARNING: Using dummy Firebase configuration. Token verification will fail!');
              isFirebaseAvailable = false; // Mark as not available since token verification will fail
            } catch (initError) {
              console.error('Error initializing Firebase with dummy configuration:', initError);
              isFirebaseAvailable = false;
            }
          } else {
            throw new Error('Firebase service account not found. Please set FIREBASE_SERVICE_ACCOUNT environment variable or provide a firebase-service-account.json file.');
          }
        }
      }

      if (isFirebaseAvailable && process.env.MINIMAL_LOGS !== 'true') {
        console.info('Firebase Admin SDK initialized successfully');
      }
    } catch (error) {
      // Always log errors
      console.error('Error initializing Firebase Admin SDK:', error);
      if (process.env.NODE_ENV === 'production') {
        throw error; // Re-throw in production to prevent app from starting with invalid Firebase config
      } else {
        console.warn('Continuing without Firebase authentication');
      }
    }
  }
}

// Check if Firebase is available
export function isFirebaseInitialized(): boolean {
  return isFirebaseAvailable;
}

// Export the admin SDK for use in other files
export { admin };
