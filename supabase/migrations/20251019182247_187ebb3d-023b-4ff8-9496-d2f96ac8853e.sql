-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false);

-- Create patient submissions table
CREATE TABLE IF NOT EXISTS public.patient_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on patient_submissions
ALTER TABLE public.patient_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (can be restricted later based on auth requirements)
CREATE POLICY "Allow public access to patient submissions"
ON public.patient_submissions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create patient documents table
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_submission_id UUID NOT NULL REFERENCES public.patient_submissions(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  document_subtype TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on patient_documents
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow public access to patient documents"
ON public.patient_documents
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_patient_documents_submission_id ON public.patient_documents(patient_submission_id);
CREATE INDEX idx_patient_documents_section ON public.patient_documents(section_name);

-- Storage policies for patient-documents bucket
CREATE POLICY "Allow public upload to patient documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'patient-documents');

CREATE POLICY "Allow public read access to patient documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'patient-documents');

CREATE POLICY "Allow public update to patient documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'patient-documents');

CREATE POLICY "Allow public delete from patient documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'patient-documents');

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for patient_submissions
CREATE TRIGGER update_patient_submissions_updated_at
BEFORE UPDATE ON public.patient_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();