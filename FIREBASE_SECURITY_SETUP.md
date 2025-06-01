# Firebase Security Setup

## 🔒 CRITICAL: Service Account Security

### Current Status: ✅ SECURE
- Service account file is **NOT tracked by git**
- File is properly listed in `.gitignore`
- Environment variable fallbacks are configured

### Security Best Practices

#### 1. **Local Development**
```bash
# Copy your actual service account file to:
cp path/to/your/firebase-service-account.json ./firebase-service-account.json

# The file is already in .gitignore, so it won't be committed
```

#### 2. **Production Deployment (Recommended)**
Set environment variables instead of using the file:

```bash
# Set these environment variables in your production environment
export FIREBASE_TYPE="service_account"
export FIREBASE_PROJECT_ID="chords-app-ecd47"
export FIREBASE_PRIVATE_KEY_ID="your-private-key-id"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@chords-app-ecd47.iam.gserviceaccount.com"
export FIREBASE_CLIENT_ID="your-client-id"
export FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
export FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token"
export FIREBASE_AUTH_PROVIDER_X509_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
export FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40chords-app-ecd47.iam.gserviceaccount.com"
export FIREBASE_UNIVERSE_DOMAIN="googleapis.com"
```

#### 3. **Alternative: Service Account JSON as Environment Variable**
```bash
# Set the entire service account as a JSON string
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"chords-app-ecd47",...}'
```

### How the API Handles Firebase Initialization

The API tries multiple methods in order:
1. **Environment variables** (most secure for production)
2. **Service account JSON from environment variable**
3. **Service account file path** (for local development)
4. **Application default credentials**
5. **Service account file in root directory**

### Security Checklist

- ✅ Service account file is in `.gitignore`
- ✅ Service account file is NOT tracked by git
- ✅ Environment variable fallbacks are configured
- ✅ Multiple initialization methods available
- ⚠️ **TODO**: Set up environment variables for production

### For New Team Members

1. Get the service account file from a secure source (not from git)
2. Place it as `firebase-service-account.json` in the `chords-api` directory
3. The file will be automatically ignored by git
4. The API will automatically detect and use it

### Production Deployment

**NEVER** deploy the service account file to production. Always use environment variables or cloud provider's secret management systems.
