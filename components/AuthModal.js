import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/authContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X, Mail, Lock, User, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AuthModal({ isOpen, onClose, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const onCloseRef = useRef(onClose);

  const { user, logIn, signUp, logInWithGoogle, resetPassword } = useAuth();

  // Keep ref updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Sync mode with initialMode prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setShowForgotPassword(false);
      setResetEmail("");
    }
  }, [isOpen, initialMode]);

  // Auto-close modal when user signs in successfully
  useEffect(() => {
    if (isOpen && user) {
      onCloseRef.current();
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const result = await logIn(email, password);
      if (result.success) {
        onClose();
      }
    } else {
      const result = await signUp(email, password, displayName);
      if (result.success) {
        onClose();
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await logInWithGoogle();
    if (result.success) {
      onClose();
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    await resetPassword(resetEmail);
    setLoading(false);
    setShowForgotPassword(false);
    setResetEmail("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md shadow-2xl mx-auto overflow-hidden transition-all duration-300 bg-gradient-to-br from-brand-sky/40 via-card to-muted border-2 border-brand-mid/30"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative bg-gradient-to-r from-primary to-brand-navy text-white pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/90 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <CardTitle className="text-2xl font-bold text-center text-white">
            {showForgotPassword
              ? "Reset Password"
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </CardTitle>
          {!showForgotPassword && (
            <p className="text-center text-brand-sky text-sm mt-2">
              {mode === "login"
                ? "Welcome back! Sign in to continue"
                : "Join thousands of users converting files effortlessly"}
            </p>
          )}
        </CardHeader>
        <CardContent className="bg-white/80 backdrop-blur-sm">
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                className="w-full text-sm text-primary hover:text-brand-navy transition-colors"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg transition-all focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none bg-card"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg transition-all bg-card focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg transition-all bg-card focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                      placeholder="Enter your password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:text-brand-navy text-right w-full transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      {mode === "login" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : mode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-mid/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white/80 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                variant="outline"
                className="w-full border-2 border-brand-mid/30 hover:bg-brand-sky/50 hover:border-brand-mid py-3 rounded-lg transition-all"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {loading ? "Signing in..." : "Sign in with Google"}
              </Button>

              <div className="mt-4 text-center text-sm text-foreground">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setEmail("");
                        setPassword("");
                      }}
                      className="text-primary hover:text-brand-navy font-semibold transition-colors"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setEmail("");
                        setPassword("");
                        setDisplayName("");
                      }}
                      className="text-primary hover:text-brand-navy font-semibold transition-colors"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
