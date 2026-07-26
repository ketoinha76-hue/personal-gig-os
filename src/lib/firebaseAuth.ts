import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem("google_access_token");

// Google OAuth tokens expire in 1 hour. Track issue time.
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes (safe margin)

const saveToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem("google_access_token", token);
  localStorage.setItem("google_access_token_ts", String(Date.now()));
};

const isTokenStale = (): boolean => {
  const ts = localStorage.getItem("google_access_token_ts");
  if (!ts) return true;
  return Date.now() - Number(ts) > TOKEN_TTL_MS;
};

export const clearToken = () => {
  cachedAccessToken = null;
  localStorage.removeItem("google_access_token");
  localStorage.removeItem("google_access_token_ts");
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const persistedToken = localStorage.getItem("google_access_token");
      if (persistedToken && !isTokenStale()) {
        cachedAccessToken = persistedToken;
        if (onAuthSuccess) onAuthSuccess(user, persistedToken);
      } else if (persistedToken && isTokenStale()) {
        // Token is stale — clear it and require re-login
        clearToken();
        if (onAuthFailure) onAuthFailure();
      } else if (cachedAccessToken) {
        saveToken(cachedAccessToken);
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        clearToken();
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getPersistedToken = (): string | null => {
  if (isTokenStale()) return null;
  return cachedAccessToken || localStorage.getItem("google_access_token");
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Google Auth");
    }

    saveToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await auth.signOut();
  clearToken();
};

