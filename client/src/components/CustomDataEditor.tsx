import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Lightbulb, AlertTriangle, Layers } from "lucide-react";
import { AI_PRIMITIVE_NAMES } from "@shared/taxonomy";
import type { CustomTheme, CustomFrictionPoint, CustomUseCase } from "@shared/schema";

interface CustomDataEditorProps {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
  editItem?: { id: string; dataType: string; dataJson: any };
}

// Default empty forms
const emptyTheme: Omit<CustomTheme, "isCustom"> = {
  "Strategic Theme": "",
  "Primary Driver Impact": "",
  "Secondary Driver": "",
  "Current State": "",
  "Target State": "",
};

const emptyFriction: Omit<CustomFrictionPoint, "isCustom" | "Loaded Hourly Rate" | "Estimated Annual Cost ($)" | "Cost Formula" | "Role ID" | "Primary Driver Impact"> = {
  "Function": "",
  "Sub-Function": "",
  "Role": "",
  "Friction Point": "",
  "Annual Hours": 0,
  "Hourly Rate": 0,
  "Severity": "Medium",
  "Strategic Theme": "",
};

const emptyUseCase: Omit<CustomUseCase, "isCustom" | "ID" | "Primary Agentic Pattern" | "Alternative Agentic Pattern"> = {
  "Use Case Name": "",
  "Description": "",
  "Function": "",
  "Sub-Function": "",
  "AI Primitives": "",
  "Strategic Theme": "",
  "Target Friction": "",
  "Human-in-the-Loop Checkpoint": "",
};

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const;

const BENEFITS_LOADING = 1.35;

// Field-level error type
interface FieldErrors {
  [key: string]: string;
}

export function CustomDataEditor({
  reportId,
  isOpen,
  onClose,
  editItem,
}: CustomDataEditorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine active tab from editItem or default
  const [activeTab, setActiveTab] = useState<string>(
    editItem?.dataType === "friction_point"
      ? "friction"
      : editItem?.dataType === "use_case"
        ? "usecase"
        : "theme"
  );

  // Form state for each type
  const [themeForm, setThemeForm] = useState(emptyTheme);
  const [frictionForm, setFrictionForm] = useState(emptyFriction);
  const [useCaseForm, setUseCaseForm] = useState(emptyUseCase);
  const [selectedPrimitives, setSelectedPrimitives] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Populate form if editing
  useEffect(() => {
    if (editItem) {
      const { dataType, dataJson } = editItem;
      if (dataType === "theme") {
        setThemeForm({
          "Strategic Theme": dataJson["Strategic Theme"] || "",
          "Primary Driver Impact": dataJson["Primary Driver Impact"] || "",
          "Secondary Driver": dataJson["Secondary Driver"] || "",
          "Current State": dataJson["Current State"] || "",
          "Target State": dataJson["Target State"] || "",
        });
        setActiveTab("theme");
      } else if (dataType === "friction_point") {
        setFrictionForm({
          "Function": dataJson["Function"] || "",
          "Sub-Function": dataJson["Sub-Function"] || "",
          "Role": dataJson["Role"] || "",
          "Friction Point": dataJson["Friction Point"] || "",
          "Annual Hours": dataJson["Annual Hours"] || 0,
          "Hourly Rate": dataJson["Hourly Rate"] || 0,
          "Severity": dataJson["Severity"] || "Medium",
          "Strategic Theme": dataJson["Strategic Theme"] || "",
        });
        setActiveTab("friction");
      } else if (dataType === "use_case") {
        setUseCaseForm({
          "Use Case Name": dataJson["Use Case Name"] || "",
          "Description": dataJson["Description"] || "",
          "Function": dataJson["Function"] || "",
          "Sub-Function": dataJson["Sub-Function"] || "",
          "AI Primitives": dataJson["AI Primitives"] || "",
          "Strategic Theme": dataJson["Strategic Theme"] || "",
          "Target Friction": dataJson["Target Friction"] || "",
          "Human-in-the-Loop Checkpoint": dataJson["Human-in-the-Loop Checkpoint"] || "",
        });
        // Parse primitives string into array for checkbox selection
        const primStr = dataJson["AI Primitives"] || "";
        setSelectedPrimitives(
          primStr
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        );
        setActiveTab("usecase");
      }
    } else {
      // Reset forms for new creation
      setThemeForm({ ...emptyTheme });
      setFrictionForm({ ...emptyFriction });
      setUseCaseForm({ ...emptyUseCase });
      setSelectedPrimitives([]);
    }
    setErrors({});
  }, [editItem, isOpen]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { dataType: string; dataJson: any }) => {
      const res = await apiRequest("POST", `/api/reports/${reportId}/custom-data`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/custom-data`] });
      toast({
        title: "Created successfully",
        description: "Your custom data has been added to the report.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; dataJson: any }) => {
      const res = await apiRequest("PUT", `/api/custom-data/${payload.id}`, { dataJson: payload.dataJson });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/custom-data`] });
      toast({
        title: "Updated successfully",
        description: "Your custom data has been updated.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setThemeForm({ ...emptyTheme });
    setFrictionForm({ ...emptyFriction });
    setUseCaseForm({ ...emptyUseCase });
    setSelectedPrimitives([]);
    setErrors({});
    onClose();
  };

  // Validate theme form
  function validateTheme(): boolean {
    const errs: FieldErrors = {};
    if (!themeForm["Strategic Theme"].trim()) errs["Strategic Theme"] = "Theme name is required";
    if (!themeForm["Primary Driver Impact"].trim()) errs["Primary Driver Impact"] = "Primary driver is required";
    if (!themeForm["Current State"].trim()) errs["Current State"] = "Current state is required";
    if (!themeForm["Target State"].trim()) errs["Target State"] = "Target state is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Validate friction point form
  function validateFriction(): boolean {
    const errs: FieldErrors = {};
    if (!frictionForm["Function"].trim()) errs["Function"] = "Function is required";
    if (!frictionForm["Sub-Function"].trim()) errs["Sub-Function"] = "Sub-function is required";
    if (!frictionForm["Role"].trim()) errs["Role"] = "Role is required";
    if (!frictionForm["Friction Point"].trim()) errs["Friction Point"] = "Friction description is required";
    if (!frictionForm["Annual Hours"] || frictionForm["Annual Hours"] <= 0) errs["Annual Hours"] = "Annual hours must be greater than 0";
    if (!frictionForm["Hourly Rate"] || frictionForm["Hourly Rate"] <= 0) errs["Hourly Rate"] = "Hourly rate must be greater than 0";
    if (!frictionForm["Severity"]) errs["Severity"] = "Severity is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Validate use case form
  function validateUseCase(): boolean {
    const errs: FieldErrors = {};
    if (!useCaseForm["Use Case Name"].trim()) errs["Use Case Name"] = "Use case name is required";
    if (!useCaseForm["Description"].trim()) errs["Description"] = "Description is required";
    if (!useCaseForm["Function"].trim()) errs["Function"] = "Function is required";
    if (!useCaseForm["Sub-Function"].trim()) errs["Sub-Function"] = "Sub-function is required";
    if (selectedPrimitives.length === 0) errs["AI Primitives"] = "Select at least one AI primitive";
    if (!useCaseForm["Target Friction"].trim()) errs["Target Friction"] = "Target friction is required";
    if (!useCaseForm["Human-in-the-Loop Checkpoint"].trim()) errs["Human-in-the-Loop Checkpoint"] = "HITL checkpoint is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Build the final JSON for each type with computed fields
  function buildThemeJson(): CustomTheme {
    return {
      isCustom: true,
      "Strategic Theme": themeForm["Strategic Theme"].trim(),
      "Primary Driver Impact": themeForm["Primary Driver Impact"].trim(),
      "Secondary Driver": themeForm["Secondary Driver"].trim(),
      "Current State": themeForm["Current State"].trim(),
      "Target State": themeForm["Target State"].trim(),
    };
  }

  function buildFrictionJson(): CustomFrictionPoint {
    const loadedRate = Math.round(frictionForm["Hourly Rate"] * BENEFITS_LOADING * 100) / 100;
    const annualCost = Math.round(frictionForm["Annual Hours"] * loadedRate);
    return {
      isCustom: true,
      "Function": frictionForm["Function"].trim(),
      "Sub-Function": frictionForm["Sub-Function"].trim(),
      "Role": frictionForm["Role"].trim(),
      "Friction Point": frictionForm["Friction Point"].trim(),
      "Annual Hours": frictionForm["Annual Hours"],
      "Hourly Rate": frictionForm["Hourly Rate"],
      "Loaded Hourly Rate": loadedRate,
      "Severity": frictionForm["Severity"],
      "Strategic Theme": frictionForm["Strategic Theme"].trim(),
      "Primary Driver Impact": frictionForm["Strategic Theme"].trim(),
      "Estimated Annual Cost ($)": `$${annualCost.toLocaleString()}`,
      "Cost Formula": `${frictionForm["Annual Hours"]} hrs x $${loadedRate}/hr (loaded)`,
    };
  }

  function buildUseCaseJson(): CustomUseCase {
    return {
      isCustom: true,
      "ID": `CU-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      "Use Case Name": useCaseForm["Use Case Name"].trim(),
      "Description": useCaseForm["Description"].trim(),
      "Function": useCaseForm["Function"].trim(),
      "Sub-Function": useCaseForm["Sub-Function"].trim(),
      "AI Primitives": selectedPrimitives.join(", "),
      "Strategic Theme": useCaseForm["Strategic Theme"].trim(),
      "Target Friction": useCaseForm["Target Friction"].trim(),
      "Human-in-the-Loop Checkpoint": useCaseForm["Human-in-the-Loop Checkpoint"].trim(),
    };
  }

  // Submit handler
  function handleSubmit() {
    let dataType: string;
    let dataJson: any;

    if (activeTab === "theme") {
      if (!validateTheme()) return;
      dataType = "theme";
      dataJson = buildThemeJson();
    } else if (activeTab === "friction") {
      if (!validateFriction()) return;
      dataType = "friction_point";
      dataJson = buildFrictionJson();
    } else {
      if (!validateUseCase()) return;
      dataType = "use_case";
      dataJson = buildUseCaseJson();
    }

    if (editItem) {
      updateMutation.mutate({ id: editItem.id, dataJson });
    } else {
      createMutation.mutate({ dataType, dataJson });
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Primitive toggle helper
  function togglePrimitive(name: string) {
    setSelectedPrimitives((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  // Error display helper
  function FieldError({ field }: { field: string }) {
    if (!errors[field]) return null;
    return <p className="text-xs text-red-500 mt-1">{errors[field]}</p>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#001278]">
            <Plus className="h-5 w-5" />
            {editItem ? "Edit Custom Data" : "Add Custom Data"}
          </DialogTitle>
          <DialogDescription>
            Add your own strategic themes, friction points, or use cases to the analysis.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setErrors({}); }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="theme" className="flex items-center gap-1.5" disabled={!!editItem}>
              <Lightbulb className="h-3.5 w-3.5" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="friction" className="flex items-center gap-1.5" disabled={!!editItem}>
              <AlertTriangle className="h-3.5 w-3.5" />
              Friction Point
            </TabsTrigger>
            <TabsTrigger value="usecase" className="flex items-center gap-1.5" disabled={!!editItem}>
              <Layers className="h-3.5 w-3.5" />
              Use Case
            </TabsTrigger>
          </TabsList>

          {/* ========== THEME FORM ========== */}
          <TabsContent value="theme" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Strategic Theme *</Label>
              <Input
                id="theme-name"
                placeholder="e.g., Digital Customer Experience Transformation"
                value={themeForm["Strategic Theme"]}
                onChange={(e) => setThemeForm((f) => ({ ...f, "Strategic Theme": e.target.value }))}
              />
              <FieldError field="Strategic Theme" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme-primary">Primary Driver *</Label>
                <Input
                  id="theme-primary"
                  placeholder="e.g., Revenue Growth"
                  value={themeForm["Primary Driver Impact"]}
                  onChange={(e) => setThemeForm((f) => ({ ...f, "Primary Driver Impact": e.target.value }))}
                />
                <FieldError field="Primary Driver Impact" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-secondary">Secondary Driver</Label>
                <Input
                  id="theme-secondary"
                  placeholder="e.g., Customer Retention"
                  value={themeForm["Secondary Driver"]}
                  onChange={(e) => setThemeForm((f) => ({ ...f, "Secondary Driver": e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-current">Current State *</Label>
              <Textarea
                id="theme-current"
                placeholder="Describe the current state of this area..."
                value={themeForm["Current State"]}
                onChange={(e) => setThemeForm((f) => ({ ...f, "Current State": e.target.value }))}
                rows={3}
              />
              <FieldError field="Current State" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-target">Target State *</Label>
              <Textarea
                id="theme-target"
                placeholder="Describe the desired future state..."
                value={themeForm["Target State"]}
                onChange={(e) => setThemeForm((f) => ({ ...f, "Target State": e.target.value }))}
                rows={3}
              />
              <FieldError field="Target State" />
            </div>
          </TabsContent>

          {/* ========== FRICTION POINT FORM ========== */}
          <TabsContent value="friction" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="friction-function">Function *</Label>
                <Input
                  id="friction-function"
                  placeholder="e.g., Sales"
                  value={frictionForm["Function"]}
                  onChange={(e) => setFrictionForm((f) => ({ ...f, "Function": e.target.value }))}
                />
                <FieldError field="Function" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friction-subfunction">Sub-Function *</Label>
                <Input
                  id="friction-subfunction"
                  placeholder="e.g., Lead Qualification"
                  value={frictionForm["Sub-Function"]}
                  onChange={(e) => setFrictionForm((f) => ({ ...f, "Sub-Function": e.target.value }))}
                />
                <FieldError field="Sub-Function" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="friction-role">Role *</Label>
                <Input
                  id="friction-role"
                  placeholder="e.g., Sales Development Rep"
                  value={frictionForm["Role"]}
                  onChange={(e) => setFrictionForm((f) => ({ ...f, "Role": e.target.value }))}
                />
                <FieldError field="Role" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friction-theme">Strategic Theme</Label>
                <Input
                  id="friction-theme"
                  placeholder="e.g., Revenue Acceleration"
                  value={frictionForm["Strategic Theme"]}
                  onChange={(e) => setFrictionForm((f) => ({ ...f, "Strategic Theme": e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="friction-desc">Friction Description *</Label>
              <Textarea
                id="friction-desc"
                placeholder="Describe the operational friction or pain point..."
                value={frictionForm["Friction Point"]}
                onChange={(e) => setFrictionForm((f) => ({ ...f, "Friction Point": e.target.value }))}
                rows={3}
              />
              <FieldError field="Friction Point" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="friction-hours">Annual Hours *</Label>
                <Input
                  id="friction-hours"
                  type="number"
                  min={0}
                  placeholder="e.g., 2080"
                  value={frictionForm["Annual Hours"] || ""}
                  onChange={(e) =>
                    setFrictionForm((f) => ({
                      ...f,
                      "Annual Hours": parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <FieldError field="Annual Hours" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friction-rate">Hourly Rate ($) *</Label>
                <Input
                  id="friction-rate"
                  type="number"
                  min={0}
                  step={5}
                  placeholder="e.g., 75"
                  value={frictionForm["Hourly Rate"] || ""}
                  onChange={(e) =>
                    setFrictionForm((f) => ({
                      ...f,
                      "Hourly Rate": parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <FieldError field="Hourly Rate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friction-severity">Severity *</Label>
                <Select
                  value={frictionForm["Severity"]}
                  onValueChange={(val) =>
                    setFrictionForm((f) => ({
                      ...f,
                      "Severity": val as typeof frictionForm["Severity"],
                    }))
                  }
                >
                  <SelectTrigger id="friction-severity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((sev) => (
                      <SelectItem key={sev} value={sev}>
                        {sev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError field="Severity" />
              </div>
            </div>

            {/* Computed cost preview */}
            {frictionForm["Annual Hours"] > 0 && frictionForm["Hourly Rate"] > 0 && (
              <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                <span className="font-medium text-[#001278]">Estimated Annual Cost: </span>
                <span className="font-semibold text-[#36bf78]">
                  ${Math.round(frictionForm["Annual Hours"] * frictionForm["Hourly Rate"] * BENEFITS_LOADING).toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-2">
                  ({frictionForm["Annual Hours"]} hrs x ${(frictionForm["Hourly Rate"] * BENEFITS_LOADING).toFixed(2)}/hr loaded)
                </span>
              </div>
            )}
          </TabsContent>

          {/* ========== USE CASE FORM ========== */}
          <TabsContent value="usecase" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="uc-name">Use Case Name *</Label>
              <Input
                id="uc-name"
                placeholder="e.g., AI-Powered Lead Scoring and Prioritization"
                value={useCaseForm["Use Case Name"]}
                onChange={(e) => setUseCaseForm((f) => ({ ...f, "Use Case Name": e.target.value }))}
              />
              <FieldError field="Use Case Name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uc-desc">Description *</Label>
              <Textarea
                id="uc-desc"
                placeholder="Describe what this AI use case does and its expected impact..."
                value={useCaseForm["Description"]}
                onChange={(e) => setUseCaseForm((f) => ({ ...f, "Description": e.target.value }))}
                rows={3}
              />
              <FieldError field="Description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uc-function">Function *</Label>
                <Input
                  id="uc-function"
                  placeholder="e.g., Sales"
                  value={useCaseForm["Function"]}
                  onChange={(e) => setUseCaseForm((f) => ({ ...f, "Function": e.target.value }))}
                />
                <FieldError field="Function" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uc-subfunction">Sub-Function *</Label>
                <Input
                  id="uc-subfunction"
                  placeholder="e.g., Lead Management"
                  value={useCaseForm["Sub-Function"]}
                  onChange={(e) => setUseCaseForm((f) => ({ ...f, "Sub-Function": e.target.value }))}
                />
                <FieldError field="Sub-Function" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uc-theme">Strategic Theme</Label>
                <Input
                  id="uc-theme"
                  placeholder="e.g., Revenue Acceleration"
                  value={useCaseForm["Strategic Theme"]}
                  onChange={(e) => setUseCaseForm((f) => ({ ...f, "Strategic Theme": e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uc-friction">Target Friction *</Label>
                <Input
                  id="uc-friction"
                  placeholder="e.g., Manual lead qualification"
                  value={useCaseForm["Target Friction"]}
                  onChange={(e) => setUseCaseForm((f) => ({ ...f, "Target Friction": e.target.value }))}
                />
                <FieldError field="Target Friction" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uc-hitl">Human-in-the-Loop Checkpoint *</Label>
              <Input
                id="uc-hitl"
                placeholder="e.g., Manager reviews AI-scored leads before outreach"
                value={useCaseForm["Human-in-the-Loop Checkpoint"]}
                onChange={(e) =>
                  setUseCaseForm((f) => ({ ...f, "Human-in-the-Loop Checkpoint": e.target.value }))
                }
              />
              <FieldError field="Human-in-the-Loop Checkpoint" />
            </div>

            {/* AI Primitives multi-select with checkboxes */}
            <div className="space-y-2">
              <Label>AI Primitives *</Label>
              <div className="rounded-lg border p-3 space-y-2">
                {AI_PRIMITIVE_NAMES.map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <Checkbox
                      id={`prim-${name}`}
                      checked={selectedPrimitives.includes(name)}
                      onCheckedChange={() => togglePrimitive(name)}
                    />
                    <label
                      htmlFor={`prim-${name}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedPrimitives.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedPrimitives.map((p) => (
                    <Badge
                      key={p}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => togglePrimitive(p)}
                    >
                      {p}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              <FieldError field="AI Primitives" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ backgroundColor: "#02a2fd", borderColor: "#02a2fd" }}
            className="text-white"
          >
            {isSubmitting
              ? "Saving..."
              : editItem
                ? "Update"
                : "Add to Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
