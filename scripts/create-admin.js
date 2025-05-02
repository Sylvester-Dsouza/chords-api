const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    // Try to load service account from file
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully');
      return true;
    } else {
      console.error('Firebase service account file not found at:', serviceAccountPath);
      return false;
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return false;
  }
}

async function createSuperAdmin() {
  const prisma = new PrismaClient();
  
  try {
    // Super admin details
    const email = 'superadmin@christianchords.com';
    const password = 'super@123';
    const name = 'Super Admin';
    
    // Check if Firebase is initialized
    const isFirebaseInitialized = initializeFirebase();
    if (!isFirebaseInitialized) {
      console.error('Firebase is not initialized. Cannot create user in Firebase.');
      return;
    }
    
    // Check if user already exists in Firebase
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists in Firebase:', userRecord.uid);
      
      // Check if user exists in database
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        console.log('User already exists in database:', existingUser.id);
        
        // Update user to be a super admin if not already
        if (existingUser.role !== 'SUPER_ADMIN') {
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              role: 'SUPER_ADMIN',
              isActive: true,
              firebaseUid: userRecord.uid,
            },
          });
          console.log('User updated to super admin:', updatedUser);
        } else {
          console.log('User is already a super admin');
        }
        
        return;
      }
      
      // Create user in database with existing Firebase UID
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          role: 'SUPER_ADMIN',
          isActive: true,
          firebaseUid: userRecord.uid,
        },
      });
      
      console.log('Super admin created in database:', newUser);
      
    } catch (error) {
      // User doesn't exist in Firebase, create a new one
      if (error.code === 'auth/user-not-found') {
        // Create user in Firebase
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
          emailVerified: true,
        });
        
        console.log('User created in Firebase:', userRecord.uid);
        
        // Create user in database
        const newUser = await prisma.user.create({
          data: {
            email,
            name,
            role: 'SUPER_ADMIN',
            isActive: true,
            firebaseUid: userRecord.uid,
          },
        });
        
        console.log('Super admin created in database:', newUser);
      } else {
        console.error('Error checking Firebase user:', error);
      }
    }
    
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createSuperAdmin()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
