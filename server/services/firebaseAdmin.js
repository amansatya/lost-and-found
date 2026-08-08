import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let firebaseAuth = null;

function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required for Google login."
    );
  }

  const app = getApps()[0] || initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Firebase ID token is required.");
  }

  const auth = getFirebaseAuth();
  return auth.verifyIdToken(idToken);
}
