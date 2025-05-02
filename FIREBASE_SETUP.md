# Firebase Setup Instructions

To properly set up Firebase authentication in your Chords API, follow these steps:

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Authentication in your Firebase project
   - Go to "Authentication" in the left sidebar
   - Click "Get started"
   - Enable the authentication methods you want to use (Email/Password, Google, etc.)

## 2. Get Your Service Account Key

1. In your Firebase project, go to Project Settings (gear icon)
2. Go to the "Service accounts" tab
3. Click "Generate new private key"
4. Save the JSON file securely

## 3. Set Up Your API

### Option 1: Use Environment Variable (Recommended for Production)

1. Set the `FIREBASE_SERVICE_ACCOUNT` environment variable with the entire JSON content of your service account key:

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
```

Or add it to your `.env` file:

```
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
```

### Option 2: Use Service Account File (Easier for Development)

1. Rename your downloaded service account key to `firebase-service-account.json`
2. Place it in the root directory of your API project

## 4. Verify Setup

1. Start your API server
2. You should see the message "Firebase Admin SDK initialized successfully" in the console
3. Test Firebase authentication by making a request to the `/api/auth/firebase/status` endpoint

## Troubleshooting

If you see "Invalid Firebase token" errors:

1. Make sure your service account key is correctly set up
2. Verify that the Firebase project in your mobile app matches the one in your service account
3. Check that the token being sent from your app is valid and not expired
4. Enable debug logging in your API to see more detailed error messages

## Security Notes

- Never commit your service account key to version control
- Use environment variables or secure secret management in production
- Implement proper security rules in your Firebase project
