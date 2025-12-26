import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Download,
  ArrowRight,
  Loader2,
  FileType,
  FileUp,
} from "lucide-react";

type ConversionType = "word-to-pdf" | "pdf-to-word" | "txt-to-pdf" | "pdf-to-txt";

const conversionOptions: { value: ConversionType; label: string; fromExt: string; toExt: string }[] = [
  { value: "word-to-pdf", label: "Word to PDF", fromExt: ".docx", toExt: ".pdf" },
  { value: "pdf-to-word", label: "PDF to Word", fromExt: ".pdf", toExt: ".docx" },
  { value: "txt-to-pdf", label: "Text to PDF", fromExt: ".txt", toExt: ".pdf" },
  { value: "pdf-to-txt", label: "PDF to Text", fromExt: ".pdf", toExt: ".txt" },
];

function getAcceptedTypes(conversionType: ConversionType): string {
  switch (conversionType) {
    case "word-to-pdf":
      return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "pdf-to-word":
    case "pdf-to-txt":
      return ".pdf,application/pdf";
    case "txt-to-pdf":
      return ".txt,text/plain";
    default:
      return "*";
  }
}

export default function FileConverter() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState<ConversionType>("word-to-pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedFileName, setConvertedFileName] = useState<string>("");

  const conversionMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: ConversionType }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversionType", type);
      
      const response = await fetch("/api/convert-file", {
        method: "POST",
        headers: {
          "x-session-id": localStorage.getItem("sessionId") || "",
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Conversion failed");
      }
      
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fileName = disposition?.match(/filename="(.+)"/)?.[1] || "converted_file";
      return { blob, fileName };
    },
    onSuccess: ({ blob, fileName }) => {
      setConvertedBlob(blob);
      setConvertedFileName(fileName);
      toast({ title: "File converted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Conversion failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const option = conversionOptions.find(o => o.value === selectedConversion);
    if (!option) return;

    const expectedExt = option.fromExt;
    const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
    
    if (fileExt !== expectedExt) {
      toast({ 
        title: "Invalid file type", 
        description: `Please upload a ${expectedExt} file for ${option.label} conversion.`, 
        variant: "destructive" 
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setConvertedBlob(null);
    setConvertedFileName("");
  }, [selectedConversion, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleConvert = () => {
    if (!selectedFile) return;
    conversionMutation.mutate({ file: selectedFile, type: selectedConversion });
  };

  const handleDownload = () => {
    if (!convertedBlob) return;
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = convertedFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setConvertedBlob(null);
    setConvertedFileName("");
  };

  const currentOption = conversionOptions.find(o => o.value === selectedConversion);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="page-title">
          <FileType className="w-6 h-6 text-primary" />
          File Converter
        </h1>
        <p className="text-muted-foreground mt-1">
          Convert your documents between different formats
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Conversion Type</CardTitle>
          <CardDescription>
            Choose the format you want to convert your file to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {conversionOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedConversion === option.value ? "default" : "outline"}
                onClick={() => {
                  setSelectedConversion(option.value);
                  setSelectedFile(null);
                  setConvertedBlob(null);
                }}
                className="flex items-center gap-2"
                data-testid={`button-conversion-${option.value}`}
              >
                <Badge variant="secondary" className="text-xs">
                  {option.fromExt}
                </Badge>
                <ArrowRight className="w-4 h-4" />
                <Badge variant="secondary" className="text-xs">
                  {option.toExt}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Upload a {currentOption?.fromExt} file to convert to {currentOption?.toExt}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-converter"
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-2">
                Drop your {currentOption?.fromExt} file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Maximum file size: 10MB
              </p>
              <input
                type="file"
                id="converter-file-input"
                className="hidden"
                accept={getAcceptedTypes(selectedConversion)}
                onChange={(e) => handleFileSelect(e.target.files)}
                data-testid="input-file-converter"
              />
              <Button asChild>
                <label htmlFor="converter-file-input" className="cursor-pointer" data-testid="button-browse-converter">
                  <FileUp className="w-4 h-4 mr-2" />
                  Browse Files
                </label>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <FileText className="w-10 h-10 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" data-testid="text-selected-file">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset">
                  Change File
                </Button>
              </div>

              {!convertedBlob ? (
                <Button
                  onClick={handleConvert}
                  disabled={conversionMutation.isPending}
                  className="w-full"
                  data-testid="button-convert"
                >
                  {conversionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Convert to {currentOption?.toExt}
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <FileText className="w-10 h-10 text-green-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-green-700 dark:text-green-400" data-testid="text-converted-file">
                        {convertedFileName}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        Conversion complete
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleDownload} className="flex-1" data-testid="button-download-converted">
                      <Download className="w-4 h-4 mr-2" />
                      Download Converted File
                    </Button>
                    <Button variant="outline" onClick={handleReset} data-testid="button-convert-another">
                      Convert Another
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
