import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import toast from "react-hot-toast";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Sync user to MongoDB
const syncUserToMongoDB = async (firebaseUser) => {
  try {
    const providerData = firebaseUser.providerData?.[0];
    const provider = providerData?.providerId === "google.com" ? "google" : "email";

    const response = await fetch("/api/auth/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || "",
        photoURL: firebaseUser.photoURL || "",
        provider,
      }),
    });

    // Check if response is OK
    if (!response.ok) {
      console.warn("Failed to sync user to MongoDB: Server returned error");
      return null;
    }

    const data = await response.json();
    if (!data.success) {
      console.warn("Failed to sync user to MongoDB:", data.error);
    }
    return data;
  } catch (error) {
    console.warn("Error syncing user to MongoDB:", error.message);
    // Don't show error to user - MongoDB sync failure shouldn't block auth
    return null;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null); // MongoDB user data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });

        // Try to sync to MongoDB (non-blocking)
        try {
          const result = await syncUserToMongoDB(firebaseUser);
          if (result?.success) {
            setDbUser(result.user);
          }
        } catch (e) {
          // Silently handle MongoDB sync failure - user can still use the app
          console.warn("MongoDB sync failed, continuing without user data");
        }
      } else {
        setUser(null);
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        });
      }

      toast.success("Account created successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Signed in successfully!");
      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Signed in with Google!");
      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully!");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Usage tracking disabled — tools run on-the-fly with no MongoDB file saves.
  const trackUsage = async () => {
    return;
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "Email is already in use";
      case "auth/invalid-email":
        return "Invalid email address";
      case "auth/operation-not-allowed":
        return "Operation not allowed";
      case "auth/weak-password":
        return "Password is too weak (min 6 characters)";
      case "auth/user-disabled":
        return "User account has been disabled";
      case "auth/user-not-found":
        return "No account found with this email";
      case "auth/wrong-password":
        return "Incorrect password";
      case "auth/invalid-credential":
        return "Invalid email or password";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed";
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled";
      default:
        return "An error occurred. Please try again";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        loading,
        signUp,
        logIn,
        logInWithGoogle,
        logOut,
        resetPassword,
        trackUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
