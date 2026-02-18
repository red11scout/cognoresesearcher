import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Zap,
  AlertTriangle,
  User,
  Bot,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  UseCaseWorkflowData,
  WorkflowStep,
  TargetWorkflowStep,
  WorkflowDuration,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkflowComparisonProps {
  workflow: UseCaseWorkflowData;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNIT_TO_MINUTES: Record<WorkflowDuration["unit"], number> = {
  seconds: 1 / 60,
  minutes: 1,
  hours: 60,
  days: 480, // 8-hour work day
};

/** Sum all step durations and return a total expressed in minutes. */
function calculateTotalDuration(steps: WorkflowStep[]): number {
  return steps.reduce((total, step) => {
    const multiplier = UNIT_TO_MINUTES[step.duration.unit] ?? 1;
    return total + step.duration.value * multiplier;
  }, 0);
}

/** Returns the percentage of time saved between the current and target workflows. */
function calculateTimeSavings(
  currentSteps: WorkflowStep[],
  targetSteps: WorkflowStep[],
): number {
  const currentTotal = calculateTotalDuration(currentSteps);
  const targetTotal = calculateTotalDuration(targetSteps);
  if (currentTotal === 0) return 0;
  return Math.round(((currentTotal - targetTotal) / currentTotal) * 100);
}

/** Friendly duration string: "2 hrs", "45 min", "3 days", etc. */
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

/** Tiny helper to render a step's duration label. */
function stepDurationLabel(d: WorkflowDuration): string {
  const map: Record<string, string> = {
    seconds: "sec",
    minutes: "min",
    hours: "hr",
    days: "day",
  };
  const u = map[d.unit] ?? d.unit;
  return `${d.value} ${u}${d.value !== 1 && !u.endsWith("s") ? "s" : ""}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Step number indicator circle. */
function StepCircle({
  step,
  variant,
}: {
  step: number;
  variant: "current" | "target";
}) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
        variant === "current" ? "bg-orange-500" : "bg-[#36bf78]",
      )}
    >
      {step}
    </span>
  );
}

/** A single step card in the current-state column. */
function CurrentStepCard({
  step,
  compact,
}: {
  step: WorkflowStep;
  compact: boolean;
}) {
  const highlighted = step.isBottleneck || step.isFrictionPoint;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3 transition-shadow dark:bg-slate-900",
        highlighted
          ? "border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.4)]"
          : "border-slate-200 dark:border-slate-700",
      )}
    >
      <div className="flex items-start gap-3">
        <StepCircle step={step.stepNumber} variant="current" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {step.stepName}
            </span>
            {step.isBottleneck && (
              <Badge
                variant="destructive"
                className="px-1.5 py-0 text-[10px] leading-4"
              >
                Bottleneck
              </Badge>
            )}
            {step.isFrictionPoint && (
              <Badge className="bg-orange-100 px-1.5 py-0 text-[10px] leading-4 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                Friction
              </Badge>
            )}
          </div>

          {!compact && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {step.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 px-1.5 py-0 text-[10px]"
            >
              <Clock className="h-3 w-3" />
              {stepDurationLabel(step.duration)}
            </Badge>
            <Badge
              variant="outline"
              className="gap-1 px-1.5 py-0 text-[10px] border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
            >
              <User className="h-3 w-3" />
              Manual
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A single step card in the target-state column. */
function TargetStepCard({
  step,
  compact,
}: {
  step: TargetWorkflowStep;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3 transition-shadow dark:bg-slate-900",
        step.isHumanInTheLoop
          ? "border-[#02a2fd] shadow-[0_0_0_1px_rgba(2,162,253,0.3)]"
          : step.isAIEnabled
            ? "border-emerald-300 dark:border-emerald-700"
            : "border-slate-200 dark:border-slate-700",
      )}
    >
      <div className="flex items-start gap-3">
        <StepCircle step={step.stepNumber} variant="target" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {step.stepName}
            </span>
            {step.isHumanInTheLoop && (
              <Badge className="gap-1 bg-[#02a2fd]/15 px-1.5 py-0 text-[10px] leading-4 text-[#02a2fd] dark:bg-[#02a2fd]/25">
                <User className="h-3 w-3" />
                Checkpoint
              </Badge>
            )}
            {step.agentType && (
              <Badge className="bg-[#001278]/10 px-1.5 py-0 text-[10px] leading-4 text-[#001278] dark:bg-[#001278]/30 dark:text-blue-300">
                {step.agentType}
              </Badge>
            )}
          </div>

          {!compact && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {step.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 px-1.5 py-0 text-[10px]"
            >
              <Clock className="h-3 w-3" />
              {stepDurationLabel(step.duration)}
            </Badge>
            {step.isAIEnabled && (
              <Badge className="gap-1 bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Bot className="h-3 w-3" />
                AI
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkflowComparison({
  workflow,
  compact = false,
}: WorkflowComparisonProps) {
  const {
    useCaseName,
    businessFunction,
    currentStateWorkflow,
    targetStateWorkflow,
  } = workflow;

  // Derived metrics ---------------------------------------------------------

  const currentTotalMin = useMemo(
    () => calculateTotalDuration(currentStateWorkflow),
    [currentStateWorkflow],
  );
  const targetTotalMin = useMemo(
    () => calculateTotalDuration(targetStateWorkflow),
    [targetStateWorkflow],
  );
  const savingsPercent = useMemo(
    () => calculateTimeSavings(currentStateWorkflow, targetStateWorkflow),
    [currentStateWorkflow, targetStateWorkflow],
  );
  const savedMinutes = useMemo(
    () => Math.max(0, currentTotalMin - targetTotalMin),
    [currentTotalMin, targetTotalMin],
  );

  const manualTaskCount = useMemo(
    () =>
      currentStateWorkflow.filter((s) => s.actor.type === "human").length,
    [currentStateWorkflow],
  );

  const allPainPoints = useMemo(() => {
    const set = new Set<string>();
    currentStateWorkflow.forEach((s) =>
      s.painPoints?.forEach((p) => set.add(p)),
    );
    return Array.from(set);
  }, [currentStateWorkflow]);

  const automatedTasks = useMemo(
    () => targetStateWorkflow.filter((s) => s.isAIEnabled),
    [targetStateWorkflow],
  );

  const hitlCheckpoints = useMemo(
    () => targetStateWorkflow.filter((s) => s.isHumanInTheLoop),
    [targetStateWorkflow],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-[#001278] text-white">{businessFunction}</Badge>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {useCaseName}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="font-medium">{formatDuration(currentTotalMin)}</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-[#36bf78]">
              {formatDuration(targetTotalMin)}
            </span>
          </div>
          {savingsPercent > 0 && (
            <Badge className="bg-[#36bf78] text-white">
              {savingsPercent}% faster
            </Badge>
          )}
        </div>
      </div>

      {/* ===== Two-column comparison ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- LEFT: Current State ---------- */}
        <Card className="border-orange-200 dark:border-orange-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Current Process
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manual, friction-filled workflow
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
              >
                {manualTaskCount} Manual Task{manualTaskCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {currentStateWorkflow.map((step) => (
              <CurrentStepCard
                key={step.stepId}
                step={step}
                compact={compact}
              />
            ))}

            {/* Pain Points */}
            {allPainPoints.length > 0 && (
              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-900 dark:bg-orange-950/20">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                  Pain Points
                </p>
                <ul className="space-y-1">
                  {allPainPoints.map((pp, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-orange-800 dark:text-orange-300"
                    >
                      <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                      {pp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------- RIGHT: Target State ---------- */}
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#36bf78]" />
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    AI-Powered Process
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated with human oversight
                  </p>
                </div>
              </div>
              {savedMinutes > 0 && (
                <Badge className="bg-[#36bf78] text-white">
                  {formatDuration(savedMinutes)} saved
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {targetStateWorkflow.map((step) => (
              <TargetStepCard
                key={step.stepId}
                step={step}
                compact={compact}
              />
            ))}

            {/* Automated Tasks */}
            {automatedTasks.length > 0 && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Automated Tasks
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {automatedTasks.map((t) => (
                    <Badge
                      key={t.stepId}
                      className="bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    >
                      <Bot className="mr-1 h-3 w-3" />
                      {t.stepName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Human Checkpoints */}
            {hitlCheckpoints.length > 0 && (
              <div className="mt-2 rounded-lg border border-[#02a2fd]/30 bg-[#02a2fd]/5 p-3 dark:border-[#02a2fd]/40 dark:bg-[#02a2fd]/10">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#02a2fd]">
                  Human Checkpoints
                </p>
                <ul className="space-y-1.5">
                  {hitlCheckpoints.map((cp) => (
                    <li
                      key={cp.stepId}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#02a2fd]" />
                      <span className="font-medium">{cp.stepName}</span>
                      {cp.automationLevel !== "manual" && (
                        <span className="text-slate-400">
                          ({cp.automationLevel})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default WorkflowComparison;
