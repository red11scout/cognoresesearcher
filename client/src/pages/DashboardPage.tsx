import { useState } from 'react';
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Dashboard from "@/components/Dashboard";
import { mapReportToDashboardData } from "@/lib/dashboardMapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, GitCompare, Calculator, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ShareModal } from "@/components/dashboard/share-modal";

export default function DashboardPage() {
  const [, params] = useRoute("/dashboard/:reportId");
  const [, setLocation] = useLocation();
  const reportId = params?.reportId;
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);

  const { data: report, isLoading, error } = useQuery<any>({
    queryKey: [`/api/reports/${reportId}`],
    enabled: !!reportId,
  });

  const handleShareUrl = () => {
    setShowShareModal(true);
  };

  const handleViewHTMLReport = () => {
    if (!reportId) return;
    window.open(`/reports/${reportId}/html`, '_blank');
    toast({
      title: "Opening HTML Report",
      description: "The detailed HTML report is opening in a new tab.",
    });
  };

  const handleDownloadWorkshopPDF = () => {
    // Download the BlueAlly AI Workshop Preview PDF
    const link = document.createElement('a');
    link.href = '/attached_assets/BlueAlly_AI_Workshop_Preview_1766077840782.pdf';
    link.download = 'BlueAlly_AI_Workshop_Preview.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Workshop Details Downloaded",
      description: "BlueAlly AI Workshop Preview PDF has been downloaded.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 space-y-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-16 w-1/3 bg-gray-200" />
          <Skeleton className="h-96 w-full bg-gray-200" />
          <Skeleton className="h-64 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Report Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">
              The report you are looking for does not exist or has been removed.
            </p>
            <Button 
              onClick={() => setLocation("/")} 
              variant="outline"
              data-testid="button-return-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboardData = mapReportToDashboardData(report);

  return (
    <>
      {/* Feature Navigation */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/report?company=${encodeURIComponent(report?.companyName || '')}`)}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Full Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/reports/${reportId}/workflows`)}
          >
            <GitCompare className="h-4 w-4 mr-1.5" />
            Workflow Comparisons
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/whatif/${reportId}`)}
          >
            <Calculator className="h-4 w-4 mr-1.5" />
            What-If Analysis
          </Button>
        </div>
      </div>
      <Dashboard
        data={dashboardData}
        onShareUrl={handleShareUrl}
        onDownloadWorkshopPDF={handleDownloadWorkshopPDF}
        onViewHTMLReport={handleViewHTMLReport}
      />
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        reportData={{ companyName: report.companyName, analysisData: report.analysisData }}
      />
    </>
  );
}
