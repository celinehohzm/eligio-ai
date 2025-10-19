import { useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UploadedFile {
  id: string;
  file: File;
  subtype: string;
  status: "pending" | "uploaded" | "error";
}

interface DocumentUploadSectionProps {
  title: string;
  subtypes: string[];
  onFilesChange: (files: UploadedFile[]) => void;
}

export const DocumentUploadSection = ({
  title,
  subtypes,
  onFilesChange,
}: DocumentUploadSectionProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedSubtype, setSelectedSubtype] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || !selectedSubtype) return;

    const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      subtype: selectedSubtype,
      status: "pending",
    }));

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setSelectedSubtype("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemove = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const acceptedTypes = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

  return (
    <Card className="p-6 bg-white border border-gray-200 border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>

      <div className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Document Subtype
            </label>
            <Select value={selectedSubtype} onValueChange={setSelectedSubtype}>
              <SelectTrigger>
                <SelectValue placeholder="Select subtype" />
              </SelectTrigger>
              <SelectContent>
                {subtypes.map((subtype) => (
                  <SelectItem key={subtype} value={subtype}>
                    {subtype}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <input
              type="file"
              multiple
              accept={acceptedTypes}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id={`file-${title}`}
              disabled={!selectedSubtype}
            />
            <label htmlFor={`file-${title}`}>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedSubtype}
                asChild
              >
                <span className="cursor-pointer">
                  <Upload className="mr-2" />
                  Select Files
                </span>
              </Button>
            </label>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          } ${!selectedSubtype ? "opacity-50 cursor-not-allowed" : ""}`}
          onDrop={selectedSubtype ? handleDrop : undefined}
          onDragOver={(e) => {
            if (selectedSubtype) {
              e.preventDefault();
              setIsDragging(true);
            }
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {selectedSubtype
              ? "Drag and drop files here, or click Select Files"
              : "Select a subtype first"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOC, DOCX, JPG, PNG
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Files</h4>
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.file.name}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {file.subtype}
                    </Badge>
                    <Badge
                      variant={
                        file.status === "uploaded"
                          ? "default"
                          : file.status === "error"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {file.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
