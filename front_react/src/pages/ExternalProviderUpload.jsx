import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AppHeader from "@/components/AppHeader";
import { Mark } from "@/components/Logo";
import apiService from "@/services/api";
import { toast } from "sonner";

const fieldClass =
  "mt-2 h-auto border-0 px-0 py-0 font-sans text-[15px] font-semibold text-ink shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

export default function ExternalProviderUpload() {
  const [uploadStep, setUploadStep] = useState(1);
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
  const formRef = useRef(null);

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

  const toStep2 = () => {
    if (!formRef.current?.reportValidity()) return;
    if (!referralPdf) {
      toast.error("Please attach one PDF before continuing.");
      return;
    }
    setUploadStep(2);
    window.scrollTo(0, 0);
  };

  const toStep1 = () => {
    setUploadStep(1);
    window.scrollTo(0, 0);
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
      setUploadStep(1);

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

  const reviewRows = [
    { k: "Patient", v: formData.fullName || "—" },
    { k: "Date of birth", v: formData.dateOfBirth || "—" },
    { k: "Address", v: formData.address || "—" },
    { k: "Phone number", v: formData.phoneNumber || "—" },
    { k: "Referring provider", v: formData.doctorName || "—" },
    { k: "Reason", v: formData.reasonForReferral || "—" },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="idx-in mx-auto max-w-[860px] px-4 py-12 sm:px-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">05 — Submit</span>
        <div className="mt-2 flex items-end justify-between border-b border-line pb-5">
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.035em]">New referral</h1>
          <span className="font-mono text-xs uppercase tracking-[0.14em]">
            Step <span className="text-signal">{uploadStep === 2 ? "02" : "01"}</span> / 02
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-1 flex-1 bg-signal" />
          <div className={`h-1 flex-1 ${uploadStep === 2 ? "bg-signal" : "bg-hair"}`} />
        </div>

        <form ref={formRef} onSubmit={onSubmit}>
          {uploadStep === 1 && (
            <div>
              <p className="mt-6 font-sans text-[15px] text-muted2">
                All fields below are required. Submit a referral with one PDF attachment.
              </p>

              <div className="mt-7 grid grid-cols-1 border border-line sm:grid-cols-2">
                <div className="border-line p-5 sm:border-b sm:border-r">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Patient&apos;s name</label>
                  <Input
                    placeholder="Jane Doe"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="border-b border-line p-5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Date of birth</label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="border-line p-5 sm:border-b sm:border-r">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Phone number</label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="border-b border-line p-5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Referring provider</label>
                  <Input
                    placeholder="Jane Smith"
                    value={formData.doctorName}
                    onChange={(e) => handleInputChange('doctorName', e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="p-5 sm:col-span-2 sm:border-b sm:border-line">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Address</label>
                  <Textarea
                    placeholder="123 Main St, City, State, ZIP"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    required
                    className="mt-2 resize-none border-0 px-0 py-0 font-sans text-[15px] font-medium text-ink shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="p-5 sm:col-span-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Reason for referral</label>
                  <Textarea
                    placeholder="One-line reason for referral"
                    rows={2}
                    value={formData.reasonForReferral}
                    onChange={(e) => handleInputChange('reasonForReferral', e.target.value)}
                    required
                    className="mt-2 resize-none border-0 px-0 py-0 font-sans text-[15px] font-medium text-ink shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <input
                id="referral-pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {!referralPdf ? (
                <label
                  htmlFor="referral-pdf-upload"
                  className="mt-5 block cursor-pointer border-2 border-dashed border-line bg-surface p-9 text-center"
                >
                  <FileUp className="mx-auto size-[30px] text-signal" />
                  <p className="mt-3 font-display text-[17px] font-bold tracking-[-0.01em]">Drop the referral PDF here</p>
                  <p className="mt-1 font-sans text-sm text-muted-foreground">Click below to choose the file from your computer. One PDF, max 20 MB.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-4 pointer-events-none" tabIndex={-1}>
                    Choose file
                  </Button>
                </label>
              ) : (
                <div className="mt-5 flex items-center gap-3 border border-line bg-surface p-3">
                  <FileText className="size-5 shrink-0 text-signal" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-medium text-ink">{referralPdf.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{(referralPdf.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeFile} className="shrink-0 text-signal">
                    <X className="size-4" />
                  </Button>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <Link to="/" className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">← Cancel</Link>
                <Button type="button" onClick={toStep2}>Continue — step 02</Button>
              </div>
            </div>
          )}

          {uploadStep === 2 && (
            <div>
              <p className="mt-6 font-sans text-[15px] text-muted2">
                Review the referral before it enters the routing queue.
              </p>

              <div className="mt-7 border border-line">
                <div className="flex items-center justify-between bg-strong px-5 py-3.5 text-on-strong">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Referral summary</span>
                  <button type="button" onClick={toStep1} className="font-mono text-[10px] uppercase tracking-[0.1em] text-signal">
                    Edit ↩
                  </button>
                </div>
                {reviewRows.map((r) => (
                  <div key={r.k} className="grid grid-cols-1 gap-1 border-b border-hair px-5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{r.k}</span>
                    <span className="font-sans text-[15px] font-medium text-ink">{r.v}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <FileText className="size-5 text-signal" />
                  <div>
                    <div className="font-sans text-sm font-medium text-ink">{referralPdf?.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {referralPdf ? `${(referralPdf.size / 1024 / 1024).toFixed(2)} MB · attached` : "Not attached"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3.5 border border-line p-5">
                <Mark className="mt-0.5 size-[18px] shrink-0" strokeWidth={2.4} />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Eligio intake check</div>
                  <p className="mt-1.5 font-sans text-sm leading-[1.55] text-ink">
                    All required fields and one PDF attachment are present. This referral is ready to enter the routing queue.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button type="button" onClick={toStep1} className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  ← Back
                </button>
                <Button type="submit" variant="action" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting…" : "Submit referral →"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
