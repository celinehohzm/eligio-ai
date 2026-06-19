import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import RoleTabs from "@/components/RoleTabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import eligioLogo from "@/assets/eligio-logo.png";
import apiService from "@/services/api";
import { toast } from "sonner";

export default function ExternalProviderUpload() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralPdf, setReferralPdf] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    address: "",
    phoneNumber: "",
    doctorName: "",
    reasonForReferral: "",
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setReferralPdf(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are allowed.");
      event.target.value = "";
      return;
    }

    setReferralPdf(file);
  };

  const removeFile = () => {
    setReferralPdf(null);
    const fileInput = document.getElementById("referral-pdf-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!referralPdf) {
      toast.error("Please attach one PDF before submitting.");
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await apiService.uploadDocuments(formData, referralPdf);
      
      setFormData({
        fullName: "",
        dateOfBirth: "",
        address: "",
        phoneNumber: "",
        doctorName: "",
        reasonForReferral: "",
      });
      setReferralPdf(null);
      const fileInput = document.getElementById("referral-pdf-upload");
      if (fileInput) {
        fileInput.value = "";
      }
      
      toast.success("Referral submitted successfully!", {
        description: `Submission ID: ${response.submissionId}`
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload documents", {
        description: error.message || "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-page-shell">
      {/* Header */}
      <header className="site-header">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent/70 hover:text-primary"
            >
              <ArrowLeft className="size-5" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="h-6 w-px shrink-0 bg-border" />
            <div className="flex items-center gap-2">
              <img src={eligioLogo} alt="Eligio AI" className="size-12 object-contain motion-safe:hover:scale-[1.03] motion-safe:transition-transform" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">Eligio AI</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <RoleTabs />
          </div>
        </div>
      </header>

      <div className="container relative mx-auto max-w-4xl px-4 pb-14 pt-10">
        <div className="page-intro mb-12">
          <div className="page-kicker">
            <Upload className="size-4" />
            Referring provider portal
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">Referral Upload</h1>
          <p className="mt-3 max-w-xl text-pretty leading-relaxed text-muted-foreground md:text-lg">
            Submit a referral with one PDF attachment
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          <Card className="themed-panel p-6 motion-safe:animate-fade-up">
            <div className="mb-8 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                1
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 of 2</p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Patient Information</h2>
                <p className="mt-1 text-sm text-muted-foreground">All fields below are required.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Patient's Name</label>
                <Input
                  placeholder="Jane Doe"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Address</label>
                <Textarea
                  placeholder="123 Main St, City, State, ZIP"
                  className="resize-none"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  placeholder="(555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Referring Provider</label>
                <Input
                  placeholder="Jane Smith"
                  value={formData.doctorName}
                  onChange={(e) => handleInputChange('doctorName', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Reason for Referral</label>
                <Input
                  placeholder="One-line reason for referral"
                  value={formData.reasonForReferral}
                  onChange={(e) => handleInputChange('reasonForReferral', e.target.value)}
                  required
                />
              </div>
            </div>
          </Card>

          <Card className="themed-panel p-6 motion-safe:animate-fade-up motion-safe:animate-in-delay-100">
            <div className="mb-8 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                2
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 of 2</p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Referral PDF</h2>
                <p className="mt-1 text-sm text-muted-foreground">Click below to choose the file from your computer.</p>
              </div>
            </div>
            <div className="space-y-4">
              <input
                id="referral-pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <label
                htmlFor="referral-pdf-upload"
                className="block cursor-pointer rounded-2xl border border-dashed border-primary/35 bg-accent/35 p-8 text-center transition-colors duration-300 hover:border-primary/55 hover:bg-accent/50 motion-safe:focus-within:ring-2 motion-safe:focus-within:ring-primary/20"
              >
                <FileText className="mx-auto mb-4 size-10 text-primary/80" />
                <p className="text-sm font-medium text-foreground">Click to select a PDF referral packet</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF only</p>
                <Button type="button" variant="outline" className="mt-4 pointer-events-none" tabIndex={-1}>
                  <Upload className="mr-2 h-4 w-4" />
                  Select PDF
                </Button>
              </label>

              {referralPdf && (
                <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-accent/60 p-3">
                  <FileText className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{referralPdf.name}</p>
                    <p className="text-xs text-muted-foreground">{(referralPdf.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeFile} className="shrink-0 text-primary hover:bg-primary/10">
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[200px] shadow-lg shadow-primary/25">
            {isSubmitting ? "Submitting..." : "Submit Referral"}
          </Button>
        </form>
      </div>
    </div>
  );
}
