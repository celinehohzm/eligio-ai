import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Mark } from "@/components/Logo";
import AppHeader from "@/components/AppHeader";
import {
  ROLE_PATIENT_SCHEDULER,
  ROLE_PATIENT_SCHEDULER_LABEL,
  ROLE_REFERRING_PROVIDER,
  ROLE_REFERRING_PROVIDER_LABEL,
} from "@/lib/roles";

const fieldClass =
  "mt-2 h-auto border-0 px-0 py-0 font-sans text-lg font-semibold text-ink shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

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
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="idx-in mx-auto grid min-h-[calc(100vh-60px)] max-w-[1280px] grid-cols-1 px-4 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col justify-center border-line py-12 lg:border-r lg:py-0 lg:pr-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">02 — Access</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-[-0.04em] sm:text-5xl">
            Create
            <br />
            account.
          </h1>
          <p className="mt-4 max-w-[380px] font-sans text-base leading-[1.6] text-muted2">
            Join Eligio to start triaging, routing, and searching the specialist index.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 flex max-w-[420px] flex-col">
            <div className="border-t border-line py-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Full name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div className="border-t border-line py-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Work email</label>
              <Input
                type="email"
                placeholder="john@example.com"
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
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                minLength={6}
                className={fieldClass}
              />
            </div>
            <div className="border-t border-line py-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Role</label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="mt-2 w-full border-0 bg-transparent font-sans text-lg font-semibold text-ink outline-none"
              >
                <option value={ROLE_PATIENT_SCHEDULER}>{ROLE_PATIENT_SCHEDULER_LABEL}</option>
                <option value={ROLE_REFERRING_PROVIDER}>{ROLE_REFERRING_PROVIDER_LABEL}</option>
              </select>
            </div>
            <div className="border-t border-line" />

            <Button type="submit" className="mt-6 justify-between" disabled={isLoading}>
              {isLoading ? "Creating account…" : "Create account"}
              <ArrowRight className="size-4" />
            </Button>
            <p className="mt-3 font-sans text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-signal underline-offset-4 hover:underline">
                Sign in
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
