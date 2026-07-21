import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Mail, Lock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "convertmastery.admin@gmail.com";
const ADMIN_PASSWORD = "convert@123";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Store admin session in cookie
      document.cookie = `adminAuth=true; path=/; max-age=${60 * 60 * 24}`; // 24 hours
      sessionStorage.setItem("adminAuthenticated", "true");
      sessionStorage.setItem("adminEmail", email);
      toast.success("Admin login successful!");
      router.push("/admin/dashboard");
    } else {
      toast.error("Invalid admin credentials");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-sky/50 via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card shadow-2xl overflow-hidden border border-border">
        <CardHeader className="bg-gradient-to-r from-primary to-brand-navy text-white pb-6">
          <CardTitle className="text-3xl font-bold text-center text-white">
            Admin Login
          </CardTitle>
          <p className="text-center text-brand-sky text-sm mt-2">
            ConvertMastery Admin Panel
          </p>
        </CardHeader>
        <CardContent className="bg-card/80 backdrop-blur-sm pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none bg-background transition-all"
                  placeholder="Enter admin email"
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
                  className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none bg-background transition-all"
                  placeholder="Enter admin password"
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
