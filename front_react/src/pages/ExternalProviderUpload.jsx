import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import eligioLogo from "@/assets/eligio-logo.png";
import apiService from "@/services/api";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdf";

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
      const referralPacketText = await extractPdfText(referralPdf);
      const response = await apiService.uploadDocuments(formData, referralPdf, referralPacketText);
      
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center space-x-2">
              <img src={eligioLogo} alt="Eligio AI" className="w-12 h-12 object-contain" />
              <h1 className="text-xl font-bold text-gray-900">Eligio AI</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Referral Upload</h1>
        <p className="text-muted-foreground mb-8">
          Submit a referral with one PDF attachment
        </p>

        <form onSubmit={onSubmit} className="space-y-8">
          <Card className="p-6 border border-gray-200 border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Patient Information</h2>
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
                <label className="block text-sm font-medium mb-2">Referring Dr</label>
                <Input
                  placeholder="Dr. Jane Smith"
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

          <Card className="p-6 border border-gray-200 border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Referral PDF</h2>
            <div className="space-y-4">
              <input
                id="referral-pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="referral-pdf-upload">
                <Button type="button" variant="outline" asChild>
                  <span className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Select PDF
                  </span>
                </Button>
              </label>

              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <p className="text-sm text-gray-600">Upload one PDF referral packet.</p>
                <p className="mt-1 text-xs text-gray-500">PDF only</p>
              </div>

              {referralPdf && (
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{referralPdf.name}</p>
                    <p className="text-xs text-gray-500">
                      {(referralPdf.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Button 
            type="submit" 
            size="lg" 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            {isSubmitting ? "Submitting..." : "Submit Referral"}
          </Button>
        </form>
      </div>
    </div>
  );
}
