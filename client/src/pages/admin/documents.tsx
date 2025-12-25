import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FileText, FileType, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Document } from "@shared/schema";

export default function AdminDocuments() {
  const [search, setSearch] = useState("");

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/admin/documents'],
  });

  const filteredDocs = documents?.filter(doc => 
    doc.fileName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word') || fileType.includes('docx')) return 'DOCX';
    return 'TXT';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-documents-title">Document Management</h1>
        <p className="text-muted-foreground mt-1">View all uploaded documents across the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>{documents?.length ?? 0} total documents</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-documents"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No documents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocs.map((doc) => (
                      <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-muted">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="font-medium truncate max-w-[200px]">
                              {doc.fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getFileIcon(doc.fileType)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={doc.status === 'completed' ? 'default' : doc.status === 'processing' ? 'secondary' : 'outline'}
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
