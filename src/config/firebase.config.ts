import * as admin from 'firebase-admin';

// Flag to indicate if Firebase is available
let isFirebaseAvailable = false;

// Initialize Firebase Admin SDK
export function initializeFirebase(): boolean {
  // Check if Firebase is already initialized
  if (admin.apps.length > 0) {
    console.log('Firebase Admin SDK already initialized');
    isFirebaseAvailable = true;
    return true;
  }

  try {
    console.log('Initializing Firebase Admin SDK...');

    // For development, you can use a service account key file
    // For production, use environment variables or secret management
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Track initialization method for logging
    let initMethod = 'none';

    if (projectId && privateKey && clientEmail) {
      // Use individual environment variables
      console.log('Initializing Firebase with individual environment variables');
      initMethod = 'env_vars';

      const type = process.env.FIREBASE_TYPE || 'service_account';
      const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
      const clientId = process.env.FIREBASE_CLIENT_ID;
      const authUri = process.env.FIREBASE_AUTH_URI;
      const tokenUri = process.env.FIREBASE_TOKEN_URI;
      const authProviderX509CertUrl = process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL;
      const clientX509CertUrl = process.env.FIREBASE_CLIENT_X509_CERT_URL;
      const universeDomain = process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com';

      try {
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
      } catch (envVarError) {
        console.error('Error initializing Firebase with environment variables:', envVarError);
        // Continue to next method
      }
    }

    // If not initialized yet, try with service account JSON
    if (!isFirebaseAvailable && serviceAccount) {
      // Parse the JSON string from environment variable
      console.log('Initializing Firebase with service account JSON from environment variable');
      initMethod = 'service_account_json';

      try {
        const parsedServiceAccount = JSON.parse(serviceAccount);
        admin.initializeApp({
          credential: admin.credential.cert(parsedServiceAccount),
        });
        isFirebaseAvailable = true;
        console.info('Firebase Admin SDK initialized with service account JSON from environment variable');
      } catch (parseError) {
        console.error('Error parsing service account JSON:', parseError);
        // Continue to next method
      }
    }

    // If not initialized yet, try with service account path
    if (!isFirebaseAvailable && serviceAccountPath) {
      // Use the service account file path
      console.log('Initializing Firebase with service account file path:', serviceAccountPath);
      initMethod = 'service_account_path';

      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        isFirebaseAvailable = true;
        console.info('Firebase Admin SDK initialized with service account file path');
      } catch (pathError) {
        console.error('Error initializing Firebase with service account path:', pathError);
        // Continue to next method
      }
    }

    // If not initialized yet, try with application default credentials
    if (!isFirebaseAvailable && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use application default credentials if available
      console.log('Initializing Firebase with application default credentials');
      initMethod = 'application_default';

      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        isFirebaseAvailable = true;
        console.info('Firebase Admin SDK initialized with application default credentials');
      } catch (adcError) {
        console.error('Error initializing Firebase with application default credentials:', adcError);
        // Continue to next method
      }
    }

    // If not initialized yet, try with local service account files
    if (!isFirebaseAvailable) {
      // Fallback to a local service account file for development
      const fs = require('fs');
      const path = require('path');

      // Try to load from the secrets directory first
      console.log('Trying to load service account from secrets directory');
      const secretsPath = path.resolve(__dirname, '../config/secrets/firebase-service-account.json');

      if (fs.existsSync(secretsPath)) {
        console.log('Service account file found in secrets directory');
        initMethod = 'secrets_directory';

        try {
          const localServiceAccount = require(secretsPath);
          admin.initializeApp({
            credential: admin.credential.cert(localServiceAccount),
          });
          isFirebaseAvailable = true;
          console.info('Firebase Admin SDK initialized with service account from secrets directory');
        } catch (secretsError) {
          console.error('Error initializing Firebase with service account from secrets directory:', secretsError);
          // Continue to next method
        }
      }

      // If not initialized yet, try with root directory
      if (!isFirebaseAvailable) {
        // If not found in secrets directory, try the root directory (for backward compatibility)
        console.log('Service account not found in secrets directory, trying root directory');
        const rootPath = path.resolve(__dirname, '../../firebase-service-account.json');

        if (fs.existsSync(rootPath)) {
          console.log('Service account file found in root directory');
          initMethod = 'root_directory';

          try {
            const rootServiceAccount = require(rootPath);
            admin.initializeApp({
              credential: admin.credential.cert(rootServiceAccount),
            });
            isFirebaseAvailable = true;
            console.info('Firebase Admin SDK initialized with service account from root directory');
          } catch (rootError) {
            console.error('Error initializing Firebase with service account from root directory:', rootError);
            // Continue to next method
          }
        }
      }

      // If not initialized yet and in development, use dummy app
      if (!isFirebaseAvailable) {
        console.warn('Firebase service account not found in any location');

        // Initialize Firebase with a dummy app for development
        if (process.env.NODE_ENV !== 'production') {
          console.log('Initializing Firebase with dummy configuration for development');
          initMethod = 'dummy_development';

          try {
            admin.initializeApp({
              projectId: 'chords-app-ecd47', // Use the correct project ID
            });
            console.warn('WARNING: Using dummy Firebase configuration. Token verification will fail!');
            isFirebaseAvailable = false; // Mark as not available since token verification will fail
          } catch (dummyError) {
            console.error('Error initializing Firebase with dummy configuration:', dummyError);
          }
        } else {
          console.error('Firebase service account not found. Please set FIREBASE_SERVICE_ACCOUNT environment variable or provide a firebase-service-account.json file.');
        }
      }
    }

    // Verify Firebase is working
    if (isFirebaseAvailable) {
      console.info(`Firebase Admin SDK initialized successfully using method: ${initMethod}`);

      // Verify that Firebase is working by listing a user
      try {
        // Use a synchronous check to verify Firebase is working
        const auth = admin.auth();
        if (auth) {
          console.info('Firebase Auth instance is available');

          // Try to list users as an asynchronous verification
          auth.listUsers(1)
            .then(() => {
              console.info('Firebase authentication is working correctly - listUsers successful');
            })
            .catch((error) => {
              console.error('Firebase listUsers verification failed:', error);
              // Don't set isFirebaseAvailable to false here, as the basic auth instance is working
            });
        } else {
          console.error('Firebase Auth instance is not available');
          isFirebaseAvailable = false;
        }
      } catch (verifyError) {
        console.error('Error verifying Firebase authentication:', verifyError);
        // Keep isFirebaseAvailable true if we got this far
      }
    }

    return isFirebaseAvailable;
  } catch (error) {
    // Always log errors
    console.error('Error initializing Firebase Admin SDK:', error);
    if (process.env.NODE_ENV === 'production') {
      console.error('Firebase initialization failed in production environment');
    } else {
      console.warn('Continuing without Firebase authentication');
    }
    isFirebaseAvailable = false;
    return false;
  }
}

// Check if Firebase is available
export function isFirebaseInitialized(): boolean {
  // If Firebase is not available, try to initialize it again
  if (!isFirebaseAvailable && admin.apps.length === 0) {
    console.log('Firebase not initialized, attempting to initialize now...');
    initializeFirebase();
  }

  // Double-check if Firebase is available after initialization attempt
  if (!isFirebaseAvailable && admin.apps.length > 0) {
    console.log('Firebase app exists but isFirebaseAvailable flag is false, setting to true');
    isFirebaseAvailable = true;
  }

  return isFirebaseAvailable;
}

// Export the admin SDK for use in other files
export { admin };
