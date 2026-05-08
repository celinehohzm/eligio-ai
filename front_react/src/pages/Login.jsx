import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import eligioLogo from "@/assets/eligio-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success("Login successful!");
      navigate("/");
    } catch (error) {
      toast.error("Login failed", {
        description: error.message || "Invalid credentials"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute right-4 top-4 z-[2] md:right-8 md:top-8">
        <ThemeToggle />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.9]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 72% 64% at 18% -8%, hsl(191 91% 42% / 0.08), transparent 55%), radial-gradient(ellipse 60% 54% at 96% 12%, hsl(174 72% 40% / 0.06), transparent 50%)",
        }}
      />
      <Card className="relative z-[1] w-full max-w-md border-l-[3px] border-l-primary shadow-2xl shadow-primary/20 motion-safe:animate-subtle-zoom">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <img src={eligioLogo} alt="Eligio AI" className="w-16 h-16 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Sign In to Eligio AI
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access platform
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                placeholder="demo@eligio.ai"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className="border-border bg-background focus-visible:border-primary/50 focus-visible:ring-primary/25"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                className="border-border bg-background focus-visible:border-primary/50 focus-visible:ring-primary/25"
              />
            </div>

            <Button type="submit" className="w-full shadow-lg shadow-primary/25" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Demo credentials: demo@eligio.ai / demo123
            </p>
          </div>

          <div className="mt-6 border-t border-border/60 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-primary underline-offset-4 transition-colors duration-200 hover:text-primary/80 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
