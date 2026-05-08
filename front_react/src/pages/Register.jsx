import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import eligioLogo from "@/assets/eligio-logo.png";
import {
  ROLE_PATIENT_SCHEDULER,
  ROLE_PATIENT_SCHEDULER_LABEL,
  ROLE_REFERRING_PROVIDER,
  ROLE_REFERRING_PROVIDER_LABEL,
} from "@/lib/roles";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: ROLE_PATIENT_SCHEDULER,
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

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
      await register(formData);
      toast.success("Registration successful! Please sign in.");
      navigate("/login");
    } catch (error) {
      toast.error("Registration failed", {
        description: error.message || "Please try again"
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
          <div className="mb-4 flex justify-center">
            <img src={eligioLogo} alt="Eligio AI" className="size-16 object-contain motion-safe:hover:rotate-1 motion-safe:transition-transform motion-safe:duration-500" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Create Account
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Join Eligio AI to start using our platform
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Full Name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="border-border bg-background focus-visible:border-primary/50 focus-visible:ring-primary/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className="border-border bg-background focus-visible:border-primary/50 focus-visible:ring-primary/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                minLength={6}
                className="border-border bg-background focus-visible:border-primary/50 focus-visible:ring-primary/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 shadow-sm outline-none ring-offset-background transition-[border-color,box-shadow] duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/25 focus:ring-offset-2 hover:border-input"
              >
                <option value={ROLE_PATIENT_SCHEDULER}>{ROLE_PATIENT_SCHEDULER_LABEL}</option>
                <option value={ROLE_REFERRING_PROVIDER}>{ROLE_REFERRING_PROVIDER_LABEL}</option>
              </select>
            </div>

            <Button type="submit" className="w-full shadow-lg shadow-primary/25" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border/60 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-primary underline-offset-4 transition-colors duration-200 hover:text-primary/80 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
