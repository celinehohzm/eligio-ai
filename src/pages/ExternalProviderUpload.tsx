import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DocumentUploadSection, UploadedFile } from '@/components/DocumentUploadSection';
import eligioLogo from '@/assets/eligio-logo.png';

interface FormData {
  fullName: string;
  age: string;
  dateOfBirth: Date | undefined;
  address: string;
  phoneNumber: string;
}

const DOCUMENT_SECTIONS = {
  referralNote: {
    title: 'Referral Note',
    subtypes: ['General', 'Specialist', 'Emergency'],
  },
  clinicalNotes: {
    title: 'Clinical Notes',
    subtypes: ['Progress Note', 'Discharge Summary', 'Admission Note'],
  },
  imagingNotes: {
    title: 'Imaging Notes',
    subtypes: ['MRI', 'CT', 'PET', 'Ultrasound'],
  },
  labResults: {
    title: 'Lab Results',
    subtypes: ['CBC', 'CMP', 'CSF', 'Genetic Test', 'Other'],
  },
  otherTestResults: {
    title: 'Other Test Results',
    subtypes: ['EEG', 'EMG', 'Sleep Study', 'Other'],
  },
};

const ExternalProviderUpload = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    age: '',
    dateOfBirth: undefined,
    address: '',
    phoneNumber: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: UploadedFile[];
  }>({
    referralNote: [],
    clinicalNotes: [],
    imagingNotes: [],
    labResults: [],
    otherTestResults: [],
  });

  const handleInputChange = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]]
        .filter((x) => x)
        .join('-');
    }
    return value;
  };

  const handlePhoneChange = (value: string) => {
    handleInputChange('phoneNumber', formatPhoneNumber(value));
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      toast.error('Please enter patient full name');
      return false;
    }
    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 150) {
      toast.error('Please enter a valid age (1-150)');
      return false;
    }
    if (!formData.dateOfBirth) {
      toast.error('Please select date of birth');
      return false;
    }
    if (!formData.address.trim()) {
      toast.error('Please enter patient address');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error('Please enter phone number');
      return false;
    }
    return true;
  };

  const uploadFileToStorage = async (
    file: File,
    patientId: string,
    sectionName: string,
    subtype: string
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${sectionName}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('patient-documents')
      .upload(fileName, file);

    if (error) throw error;
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const allFiles = Object.values(uploadedFiles).flat();
    if (allFiles.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert patient submission
      const { data: patientData, error: patientError } = await supabase
        .from('patient_submissions')
        .insert({
          full_name: formData.fullName,
          age: parseInt(formData.age),
          date_of_birth: format(formData.dateOfBirth!, 'yyyy-MM-dd'),
          address: formData.address,
          phone_number: formData.phoneNumber,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // Upload files and create document records
      const uploadPromises = Object.entries(uploadedFiles).flatMap(([sectionKey, files]) =>
        files.map(async (fileData) => {
          try {
            const filePath = await uploadFileToStorage(
              fileData.file,
              patientData.id,
              sectionKey,
              fileData.subtype
            );

            const { error: docError } = await supabase
              .from('patient_documents')
              .insert({
                patient_submission_id: patientData.id,
                section_name: sectionKey,
                document_subtype: fileData.subtype,
                file_name: fileData.file.name,
                file_path: filePath,
                file_size: fileData.file.size,
                mime_type: fileData.file.type,
                upload_status: 'uploaded',
              });

            if (docError) throw docError;

            // Update file status
            setUploadedFiles((prev) => ({
              ...prev,
              [sectionKey]: prev[sectionKey].map((f) =>
                f.id === fileData.id ? { ...f, status: 'uploaded' as const } : f
              ),
            }));
          } catch (error) {
            console.error('File upload error:', error);
            setUploadedFiles((prev) => ({
              ...prev,
              [sectionKey]: prev[sectionKey].map((f) =>
                f.id === fileData.id
                  ? { ...f, status: 'error' as const, error: 'Upload failed' }
                  : f
              ),
            }));
            throw error;
          }
        })
      );

      await Promise.all(uploadPromises);

      toast.success('Patient submission completed successfully!');
      
      // Reset form
      setFormData({
        fullName: '',
        age: '',
        dateOfBirth: undefined,
        address: '',
        phoneNumber: '',
      });
      setUploadedFiles({
        referralNote: [],
        clinicalNotes: [],
        imagingNotes: [],
        labResults: [],
        otherTestResults: [],
      });
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-1 md:space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm font-medium">Back</span>
            </Link>
            <div className="h-4 md:h-6 w-px bg-gray-300" />
            <div className="flex items-center space-x-1 md:space-x-2">
              <img src={eligioLogo} alt="Eligio AI" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              <h1 className="text-lg md:text-xl font-bold text-gray-900">External Provider Upload</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Full Name *
                </label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter patient full name"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Age *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="150"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="Enter age"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Date of Birth *
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.dateOfBirth && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dateOfBirth ? (
                          format(formData.dateOfBirth, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dateOfBirth}
                        onSelect={(date) => handleInputChange('dateOfBirth', date)}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Address *
                </label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter patient address"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="555-555-5555"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Document Upload Sections */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Document Uploads</h2>
            
            {Object.entries(DOCUMENT_SECTIONS).map(([key, section]) => (
              <DocumentUploadSection
                key={key}
                title={section.title}
                subtypes={section.subtypes}
                files={uploadedFiles[key]}
                onFilesChange={(files) =>
                  setUploadedFiles((prev) => ({ ...prev, [key]: files }))
                }
              />
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Submit Patient Information
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExternalProviderUpload;
