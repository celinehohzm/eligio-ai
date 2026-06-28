import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Mark } from "@/components/Logo";
import AppHeader from "@/components/AppHeader";
import { getDefaultRouteForRole } from "@/lib/roles";

const fieldClass =
  "mt-2 h-auto border-0 px-0 py-0 font-sans text-lg font-semibold text-ink shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

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
      const response = await login(formData.email, formData.password);
      toast.success("Login successful!");
      navigate(getDefaultRouteForRole(response.user?.role));
    } catch (error) {
      toast.error("Login failed", {
        description: error.message || "Invalid credentials"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="idx-in mx-auto grid min-h-[calc(100vh-60px)] max-w-[1280px] grid-cols-1 px-4 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col justify-center border-line py-12 lg:border-r lg:py-0 lg:pr-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">02 — Access</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-[-0.04em] sm:text-5xl">
            Welcome
            <br />
            back.
          </h1>
          <p className="mt-4 max-w-[380px] font-sans text-base leading-[1.6] text-muted2">
            Sign in to route referrals, triage patients, and search the specialist index.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 flex max-w-[420px] flex-col">
            <div className="border-t border-line py-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Work email</label>
              <Input
                type="email"
                placeholder="scheduler@northbay.health"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div className="border-t border-line py-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div className="border-t border-line" />

            <Button type="submit" className="mt-6 justify-between" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Enter Eligio"}
              <ArrowRight className="size-4" />
            </Button>
            <p className="mt-4 font-sans text-sm text-muted-foreground">
              Demo credentials: demo@eligio.ai / demo123
            </p>
            <p className="mt-3 font-sans text-sm text-muted-foreground">
              New practice?{" "}
              <Link to="/register" className="font-semibold text-signal underline-offset-4 hover:underline">
                Request access
              </Link>
            </p>
          </form>
        </div>

        <div className="relative hidden items-center justify-center overflow-hidden bg-strong text-on-strong lg:flex">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: "radial-gradient(var(--strong-hair) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative text-center">
            <Mark className="mx-auto size-[120px]" strokeWidth={1.3} />
            <div className="mt-7 font-mono text-[11px] uppercase tracking-[0.24em] text-faint">Registration mark</div>
            <div className="mt-3 max-w-[300px] font-display text-2xl leading-[1.4]">
              One packet in.
              <br />
              The right clinic out.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
