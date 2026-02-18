import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  Layers,
  Filter,
  X,
  ArrowRight,
  Zap,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { WorkflowComparison } from "@/components/WorkflowComparison";
import type {
  UseCaseWorkflowData,
  WorkflowExportData,
  WorkflowStep,
  WorkflowDuration,
  AgenticPattern,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Duration helpers (mirrored from WorkflowComparison for summary stats)
// ---------------------------------------------------------------------------

const UNIT_TO_MINUTES: Record<WorkflowDuration["unit"], number> = {
  seconds: 1 / 60,
  minutes: 1,
  hours: 60,
  days: 480,
};

function calculateTotalDuration(steps: WorkflowStep[]): number {
  return steps.reduce((total, step) => {
    const multiplier = UNIT_TO_MINUTES[step.duration.unit] ?? 1;
    return total + step.duration.value * multiplier;
  }, 0);
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 480) {
    const hrs = Math.floor(minutes / 60);
    const rem = Math.round(minutes % 60);
    return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
  }
  const days = Math.round((minutes / 480) * 10) / 10;
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// ---------------------------------------------------------------------------
// Compact workflow card (grid tile)
// ---------------------------------------------------------------------------

interface WorkflowCardProps {
  workflow: UseCaseWorkflowData;
  onClick: () => void;
}

function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const currentMin = calculateTotalDuration(workflow.currentStateWorkflow);
  const targetMin = calculateTotalDuration(workflow.targetStateWorkflow);
  const savedMin = Math.max(0, currentMin - targetMin);
  const savingsPercent =
    currentMin > 0
      ? Math.round(((currentMin - targetMin) / currentMin) * 100)
      : 0;

  const aiSteps = workflow.targetStateWorkflow.filter((s) => s.isAIEnabled);
  const bottlenecks = workflow.currentStateWorkflow.filter(
    (s) => s.isBottleneck,
  );

  return (
    <Card
      className="cursor-pointer border-slate-200 transition-all hover:border-[#02a2fd] hover:shadow-lg dark:border-slate-700 dark:hover:border-[#02a2fd]"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Badge className="mb-2 bg-[#001278] text-white text-[10px]">
              {workflow.businessFunction}
            </Badge>
            <CardTitle className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
              {workflow.useCaseName}
            </CardTitle>
          </div>
          {savingsPercent > 0 && (
            <Badge className="shrink-0 bg-[#36bf78] text-white text-xs">
              {savingsPercent}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Time comparison */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-orange-500" />
          <span className="font-medium">{formatDuration(currentMin)}</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-medium text-[#36bf78]">
            {formatDuration(targetMin)}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-1.5">
          {workflow.agenticPattern && (
            <Badge
              variant="outline"
              className="gap-1 px-1.5 py-0 text-[10px] border-[#001278]/30 text-[#001278] dark:border-[#001278]/50 dark:text-blue-300"
            >
              {workflow.agenticPattern}
            </Badge>
          )}
          {aiSteps.length > 0 && (
            <Badge className="gap-1 bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Bot className="h-3 w-3" />
              {aiSteps.length} AI
            </Badge>
          )}
          {bottlenecks.length > 0 && (
            <Badge className="gap-1 bg-orange-100 px-1.5 py-0 text-[10px] text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <AlertTriangle className="h-3 w-3" />
              {bottlenecks.length}
            </Badge>
          )}
        </div>

        {/* Time saved */}
        {savedMin > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#36bf78]">
            <Zap className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatDuration(savedMin)} saved</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Summary stats bar
// ---------------------------------------------------------------------------

interface SummaryStatsProps {
  workflows: UseCaseWorkflowData[];
}

function SummaryStats({ workflows }: SummaryStatsProps) {
  const stats = useMemo(() => {
    let totalCurrentMin = 0;
    let totalTargetMin = 0;
    let totalSavingsPercent = 0;

    workflows.forEach((w) => {
      const curr = calculateTotalDuration(w.currentStateWorkflow);
      const tgt = calculateTotalDuration(w.targetStateWorkflow);
      totalCurrentMin += curr;
      totalTargetMin += tgt;
      if (curr > 0) {
        totalSavingsPercent += ((curr - tgt) / curr) * 100;
      }
    });

    const totalSavedMin = Math.max(0, totalCurrentMin - totalTargetMin);
    const avgImprovement =
      workflows.length > 0
        ? Math.round(totalSavingsPercent / workflows.length)
        : 0;

    return {
      count: workflows.length,
      totalSavedMin,
      avgImprovement,
    };
  }, [workflows]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="border-[#001278]/20 bg-[#001278]/5 dark:border-[#001278]/40 dark:bg-[#001278]/10">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001278]/10 dark:bg-[#001278]/20">
            <Layers className="h-5 w-5 text-[#001278] dark:text-blue-300" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#001278] dark:text-blue-300">
              {stats.count}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Workflows
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#36bf78]/20 bg-[#36bf78]/5 dark:border-[#36bf78]/40 dark:bg-[#36bf78]/10">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#36bf78]/10 dark:bg-[#36bf78]/20">
            <Clock className="h-5 w-5 text-[#36bf78]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#36bf78]">
              {formatDuration(stats.totalSavedMin)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Total Time Saved
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#02a2fd]/20 bg-[#02a2fd]/5 dark:border-[#02a2fd]/40 dark:bg-[#02a2fd]/10">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#02a2fd]/10 dark:bg-[#02a2fd]/20">
            <TrendingUp className="h-5 w-5 text-[#02a2fd]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#02a2fd]">
              {stats.avgImprovement}%
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Avg Improvement
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WorkflowComparisons() {
  const [, params] = useRoute("/reports/:reportId/workflows");
  const [, setLocation] = useLocation();
  const reportId = params?.reportId;

  // Filter state
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [patternFilter, setPatternFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");

  // Detail dialog state
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<UseCaseWorkflowData | null>(null);

  // Fetch workflow data
  const {
    data: exportData,
    isLoading,
    error,
  } = useQuery<WorkflowExportData>({
    queryKey: [`/api/reports/${reportId}/workflows`],
    enabled: !!reportId,
  });

  // Also fetch the report for strategic theme info
  const { data: report } = useQuery<any>({
    queryKey: [`/api/reports/${reportId}`],
    enabled: !!reportId,
  });

  const workflows = exportData?.workflowData ?? [];

  // Extract distinct filter values
  const filterOptions = useMemo(() => {
    const themes = new Set<string>();
    const patterns = new Set<string>();
    const functions = new Set<string>();

    // Get strategic themes from the report analysis data
    const analysis = report?.analysisData as any;
    if (analysis?.steps) {
      const step1 = analysis.steps.find((s: any) => s.step === 1);
      if (step1?.themes) {
        step1.themes.forEach((t: any) => {
          const name =
            t["Strategic Theme"] || t.theme || t.name;
          if (name) themes.add(name);
        });
      }
    }

    workflows.forEach((w) => {
      if (w.businessFunction) functions.add(w.businessFunction);
      if (w.agenticPattern) patterns.add(w.agenticPattern);
    });

    return {
      themes: Array.from(themes).sort(),
      patterns: Array.from(patterns).sort(),
      functions: Array.from(functions).sort(),
    };
  }, [workflows, report]);

  // Apply filters
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      if (functionFilter !== "all" && w.businessFunction !== functionFilter) {
        return false;
      }
      if (patternFilter !== "all" && w.agenticPattern !== patternFilter) {
        return false;
      }
      // Theme filtering: match against use case name or business function heuristically,
      // or check the patternMapping if available
      if (themeFilter !== "all") {
        // A simple approach: check if any related field contains the theme text
        const wStr =
          `${w.useCaseName} ${w.businessFunction} ${w.patternRationale ?? ""}`.toLowerCase();
        if (!wStr.includes(themeFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [workflows, themeFilter, patternFilter, functionFilter]);

  const activeFilterCount = [themeFilter, patternFilter, functionFilter].filter(
    (f) => f !== "all",
  ).length;

  const clearFilters = () => {
    setThemeFilter("all");
    setPatternFilter("all");
    setFunctionFilter("all");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950 sm:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-10 w-72 bg-gray-200" />
          <Skeleton className="h-5 w-96 bg-gray-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 bg-gray-200" />
            <Skeleton className="h-24 bg-gray-200" />
            <Skeleton className="h-24 bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 bg-gray-200" />
            <Skeleton className="h-56 bg-gray-200" />
            <Skeleton className="h-56 bg-gray-200" />
            <Skeleton className="h-56 bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !exportData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">
              {error ? "Error Loading Workflows" : "No Workflow Data"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {error
                ? "Failed to load workflow comparison data. The workflows may not have been generated yet."
                : "No workflow data found for this report. Generate workflows first using the report page."}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation(`/dashboard/${reportId}`)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
        {/* ===== Header ===== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Button
                onClick={() => setLocation(`/dashboard/${reportId}`)}
                variant="ghost"
                size="sm"
                className="gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
              {exportData.companyName && (
                <Badge
                  variant="outline"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  {exportData.companyName}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Workflow Comparisons
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current vs AI-powered process workflows across all use cases
            </p>
          </div>
        </div>

        {/* ===== Summary Stats ===== */}
        <SummaryStats workflows={filteredWorkflows} />

        {/* ===== Filters ===== */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="bg-[#02a2fd] text-white text-[10px] px-1.5 py-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>

              <div className="flex flex-1 flex-wrap gap-2">
                {filterOptions.themes.length > 0 && (
                  <Select value={themeFilter} onValueChange={setThemeFilter}>
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="Strategic Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Themes</SelectItem>
                      {filterOptions.themes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filterOptions.patterns.length > 0 && (
                  <Select
                    value={patternFilter}
                    onValueChange={setPatternFilter}
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="Agentic Pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patterns</SelectItem>
                      {filterOptions.patterns.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filterOptions.functions.length > 0 && (
                  <Select
                    value={functionFilter}
                    onValueChange={setFunctionFilter}
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="Business Function" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Functions</SelectItem>
                      {filterOptions.functions.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {activeFilterCount > 0 && (
                  <Button
                    onClick={clearFilters}
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-slate-500"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filteredWorkflows.length} of {workflows.length} workflows
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ===== Workflow Grid ===== */}
        {filteredWorkflows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No workflows match the current filters
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Try adjusting or clearing the filters above
              </p>
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.useCaseId}
                workflow={workflow}
                onClick={() => setSelectedWorkflow(workflow)}
              />
            ))}
          </div>
        )}

        {/* ===== Detail Dialog ===== */}
        <Dialog
          open={!!selectedWorkflow}
          onOpenChange={(open) => {
            if (!open) setSelectedWorkflow(null);
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedWorkflow?.useCaseName}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                Full workflow comparison detail view
              </DialogDescription>
            </DialogHeader>
            {selectedWorkflow && (
              <div className="mt-4">
                <WorkflowComparison workflow={selectedWorkflow} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
