import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { DocumentUploadSection } from "@/components/DocumentUploadSection";
import eligioLogo from "@/assets/eligio-logo.png";
import apiService from "@/services/api";
import { toast } from "sonner";

const documentSections = [
  {
    title: "Referral Note",
    subtypes: ["General", "Specialist", "Emergency"],
  },
  {
    title: "Clinical Notes",
    subtypes: ["Progress Note", "Discharge Summary", "Admission Note"],
  },
  {
    title: "Imaging Notes",
    subtypes: ["MRI", "CT", "PET", "Ultrasound"],
  },
  {
    title: "Lab Results",
    subtypes: ["CBC", "CMP", "CSF", "Genetic Test", "Other"],
  },
  {
    title: "Other Test Results",
    subtypes: ["EEG", "EMG", "Sleep Study", "Other"],
  },
];

export default function ExternalProviderUpload() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFiles, setDocumentFiles] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    dateOfBirth: "",
    address: "",
    phoneNumber: "",
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentFilesChange = (title, files) => {
    setDocumentFiles((prev) => ({
      ...prev,
      [title]: files,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare files for upload
      const filesToUpload = [];
      
      Object.entries(documentFiles).forEach(([category, files]) => {
        if (files && files.length > 0) {
          filesToUpload.push({
            category,
            files: files
          });
        }
      });

      // Submit to backend
      const response = await apiService.uploadDocuments(formData, filesToUpload);
      
      // Reset form on successful submission
      setFormData({
        fullName: "",
        age: "",
        dateOfBirth: "",
        address: "",
        phoneNumber: "",
      });
      setDocumentFiles({});
      
      toast.success("Patient information submitted successfully!", {
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
        <h1 className="text-3xl font-bold mb-2">External Provider Upload</h1>
        <p className="text-muted-foreground mb-8">
          Submit patient information and medical documents
        </p>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Patient Information */}
          <Card className="p-6 border border-gray-200 border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              Patient Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <Input 
                  placeholder="John Doe" 
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Age</label>
                <Input 
                  type="number" 
                  placeholder="30" 
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
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

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  placeholder="(555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
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
            </div>
          </Card>

          {/* Document Upload Sections */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Medical Documents</h2>
            {documentSections.map((section) => (
              <DocumentUploadSection
                key={section.title}
                title={section.title}
                subtypes={section.subtypes}
                onFilesChange={(files) =>
                  handleDocumentFilesChange(section.title, files)
                }
              />
            ))}
          </div>

          <Button 
            type="submit" 
            size="lg" 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            {isSubmitting ? "Submitting..." : "Submit Patient Information"}
          </Button>
        </form>
      </div>
    </div>
  );
}
