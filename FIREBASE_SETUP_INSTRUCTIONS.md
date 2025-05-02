# Firebase Setup Instructions for Chords App

## Issue: Firebase Token Mismatch

The error you're seeing is because the Firebase token from your app has a different project ID (`chords-app-ecd47`) than what your backend is expecting. This happens when:

1. Your Flutter app is using one Firebase project
2. Your backend is using a different Firebase project or no valid Firebase configuration

## Solution

### 1. Get the Service Account Key for Your Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `chords-app-ecd47`
3. Go to Project Settings (gear icon in the top left)
4. Go to the "Service accounts" tab
5. Click "Generate new private key"
6. Save the JSON file

### 2. Set Up Your Backend

#### Option A: Use the Service Account File (Easiest)

1. Rename the downloaded JSON file to `firebase-service-account.json`
2. Place it in the root directory of your API project (`chords-api/`)

#### Option B: Use Environment Variable

1. Add the entire JSON content to your `.env` file:

```
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"chords-app-ecd47",...}'
```

### 3. Restart Your Backend

```bash
cd chords-api
npm run start:minimal
```

### 4. Restart Your Flutter App

Make sure to completely restart your Flutter app after making these changes.

## Verification

After making these changes:

1. The Firebase project ID in your Flutter app should be `chords-app-ecd47`
2. The Firebase service account in your backend should also be for `chords-app-ecd47`
3. The token verification should now succeed

If you continue to have issues, check the logs for both your Flutter app and backend to see if there are any other errors.
