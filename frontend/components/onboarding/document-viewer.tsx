import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Eye, EyeOff } from "lucide-react";

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  status: 'pending' | 'reviewing' | 'signed';
  signedAt?: string;
  signatureHash?: string;
}

interface DocumentViewerProps {
  document: Document;
  onSign?: (documentId: string) => void;
  isSigning?: boolean;
}

export function DocumentViewer({ document, onSign, isSigning }: DocumentViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3; // Mock for demo

  const handleDownload = () => {
    // Mock download - in real implementation, trigger actual download
    const link = document.createElement('a');
    link.href = document.url;
    link.download = `${document.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'reviewing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'signed':
        return 'Signed';
      case 'reviewing':
        return 'Under Review';
      default:
        return 'Pending Signature';
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-500" />
            <div>
              <CardTitle className="text-lg">{document.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{document.description}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(document.status)}`}>
            {getStatusText(document.status)}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Document
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                View Document
              </>
            )}
          </Button>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>

            {document.status === 'pending' && onSign && (
              <Button
                onClick={() => onSign(document.id)}
                disabled={isSigning}
                size="sm"
              >
                {isSigning ? 'Signing...' : 'Sign Document'}
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border rounded-lg bg-white p-4">
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {document.title}
              </h3>
              <p className="text-gray-600 mb-4">
                Document preview would be displayed here using PDF.js
              </p>

              {/* Mock document content for demo */}
              <div className="bg-gray-100 p-6 rounded-lg text-left max-w-2xl mx-auto">
                <h4 className="font-bold text-lg mb-4">Document Content Preview</h4>
                <p className="text-sm text-gray-700 mb-3">
                  This is a preview of the {document.title}. In a full implementation,
                  this would display the actual PDF content using PDF.js for rendering.
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  The document contains important legal terms and conditions that
                  govern your participation in the tokenized real estate investment platform.
                </p>
                <p className="text-sm text-gray-700">
                  By signing this document, you acknowledge that you have read,
                  understood, and agree to be bound by all terms and conditions herein.
                </p>
              </div>

              {/* Page navigation */}
              <div className="flex justify-center items-center space-x-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {document.signedAt && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Signed on:</strong> {new Date(document.signedAt).toLocaleDateString()} at{' '}
              {new Date(document.signedAt).toLocaleTimeString()}
            </p>
            {document.signatureHash && (
              <p className="text-xs text-green-600 mt-1">
                Signature Hash: {document.signatureHash.substring(0, 20)}...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
