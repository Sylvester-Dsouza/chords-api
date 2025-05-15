import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    // Try to load service account from secrets directory first
    const secretsPath = path.resolve(__dirname, '../config/secrets/firebase-service-account.json');
    if (fs.existsSync(secretsPath)) {
      console.log('Found service account in secrets directory');
      const serviceAccount = require(secretsPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully from secrets directory');
      return true;
    }

    // Try to load from root directory (for backward compatibility)
    const rootPath = path.resolve(__dirname, '../firebase-service-account.json');
    if (fs.existsSync(rootPath)) {
      console.log('Found service account in root directory');
      const serviceAccount = require(rootPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully from root directory');
      return true;
    }

    // Try to load from environment variables
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      console.log('Found service account in environment variable');
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
      console.log('Firebase Admin SDK initialized successfully from environment variable');
      return true;
    }

    console.error('Firebase service account file not found in any location');
    return false;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return false;
  }
}

async function checkFirebaseConfig() {
  console.log('Checking Firebase configuration...');
  
  // Initialize Firebase
  const isInitialized = initializeFirebase();
  if (!isInitialized) {
    console.error('Failed to initialize Firebase');
    return;
  }

  // Check if we can list users
  try {
    console.log('Attempting to list Firebase users...');
    const listUsersResult = await admin.auth().listUsers(10);
    console.log(`Successfully listed ${listUsersResult.users.length} users`);
    
    // Print user details
    listUsersResult.users.forEach((userRecord) => {
      console.log('User:', userRecord.toJSON());
    });
    
    console.log('Firebase configuration is working correctly!');
  } catch (error) {
    console.error('Error listing users:', error);
    console.error('Firebase configuration is NOT working correctly.');
  }
}

// Run the function
checkFirebaseConfig()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
