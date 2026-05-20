import admin from "firebase-admin";

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized || admin.apps.length) return;

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    firebaseInitialized = true;
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
};

export const verifyFirebaseToken = async (token) => {
  try {
    initializeFirebase();
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
};

export const getUserProfile = async (uid) => {
  try {
    initializeFirebase();
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) return null;
    return userDoc.data();
  } catch (error) {
    console.error("Error fetching user profile from Firestore:", error);
    return null;
  }
};

