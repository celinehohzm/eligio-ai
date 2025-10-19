import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DocumentUploadSection } from "@/components/DocumentUploadSection";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import eligioLogo from "@/assets/eligio-logo.png";

const formSchema = z.object({
  fullName: z.string()
    .min(1, "Full name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .trim(),
  age: z.coerce.number().min(0, "Age must be positive").max(150, "Invalid age"),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  address: z.string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be less than 500 characters")
    .trim(),
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Please enter a valid phone number (10-15 digits)")
    .trim(),
});

type FormData = z.infer<typeof formSchema>;

interface UploadedFile {
  id: string;
  file: File;
  subtype: string;
  status: "pending" | "uploaded" | "error";
}

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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<
    Record<string, UploadedFile[]>
  >({});

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      age: 0,
      address: "",
      phoneNumber: "",
    },
  });

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  const handleDocumentFilesChange = (title: string, files: UploadedFile[]) => {
    setDocumentFiles((prev) => ({
      ...prev,
      [title]: files,
    }));
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Insert patient submission
      const { data: submission, error: submissionError } = await (supabase as any)
        .from("patient_submissions")
        .insert({
          full_name: data.fullName,
          age: data.age,
          date_of_birth: format(data.dateOfBirth, "yyyy-MM-dd"),
          address: data.address,
          phone_number: data.phoneNumber,
        })
        .select()
        .single();

      if (submissionError) throw submissionError;
      if (!submission) throw new Error("Failed to create submission");

      // Upload all documents
      const uploadPromises: Promise<any>[] = [];

      for (const [sectionTitle, files] of Object.entries(documentFiles)) {
        for (const fileData of files) {
          const filePath = `${submission.id}/${sectionTitle}/${fileData.id}-${fileData.file.name}`;

          // Upload to storage
          const uploadPromise = supabase.storage
            .from("patient-documents")
            .upload(filePath, fileData.file)
            .then(({ error: uploadError }) => {
              if (uploadError) throw uploadError;

              // Insert document metadata
              return (supabase as any).from("patient_documents").insert({
                patient_submission_id: submission.id,
                file_name: fileData.file.name,
                file_path: filePath,
                file_size: fileData.file.size,
                mime_type: fileData.file.type,
                section_name: sectionTitle,
                document_subtype: fileData.subtype,
                upload_status: "uploaded",
              });
            });

          uploadPromises.push(uploadPromise);
        }
      }

      await Promise.all(uploadPromises);

      toast({
        title: "Success",
        description: "Patient information and documents uploaded successfully",
      });

      // Reset form
      form.reset();
      setDocumentFiles({});
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload. Please try again.",
        variant: "destructive",
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Patient Information */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-6 text-gray-900">
                Patient Information
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(555) 123-4567"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Main St, City, State, ZIP"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
        </Form>
      </div>
    </div>
  );
}
