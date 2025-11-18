"use client";

import * as React from "react";
import { useAction } from "convex/react";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  parseJSONL,
  validateClassEnrollment,
} from "@/lib/class-enrollments/utils";
import type { ClassEnrollmentJSONL } from "@/lib/class-enrollments/types";

type ImportState = "idle" | "uploading" | "processing" | "completed";

type ImportResult = {
  classesProcessed: number;
  classesCreated: number;
  classesAlreadyExisted: number;
  enrollmentsCreated: number;
  enrollmentsUpdated: number;
  errors: Array<{
    line?: number;
    classKey?: string;
    studentCode?: string;
    type: string;
    message: string;
    data?: any;
  }>;
  warnings: string[];
};

export function ClassEnrollmentImportDialog() {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<ImportState>("idle");
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [progress, setProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const importAction = useAction(
    api.class_enrollments.importClassEnrollmentsFromJSONL,
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.endsWith(".jsonl")) {
        alert("Please select a .jsonl file");
        return;
      }
      setFile(selectedFile);
      setResult(null);
      setState("idle");
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setState("uploading");
    setProgress(10);

    try {
      // Read file content
      const content = await file.text();

      setState("processing");
      setProgress(25);

      // Parse JSONL
      let classes: ClassEnrollmentJSONL[];
      try {
        classes = parseJSONL(content);
      } catch (error) {
        alert(
          error instanceof Error ? error.message : "Failed to parse JSONL file",
        );
        setState("idle");
        return;
      }

      if (classes.length === 0) {
        alert("JSONL file is empty");
        setState("idle");
        return;
      }

      // Validate each class
      const validationErrors: string[] = [];
      for (let i = 0; i < classes.length; i++) {
        const validation = validateClassEnrollment(classes[i]);
        if (!validation.valid) {
          validationErrors.push(
            `Line ${i + 1}: ${validation.errors.join(", ")}`,
          );
        }
      }

      if (validationErrors.length > 0) {
        alert(`Validation errors:\n${validationErrors.slice(0, 5).join("\n")}`);
        setState("idle");
        return;
      }

      setProgress(50);

      // Call import action
      const importResult = await importAction({ classes });

      setProgress(100);
      setResult(importResult);
      setState("completed");
    } catch (error) {
      console.error("Import error:", error);
      alert(error instanceof Error ? error.message : "Import failed");
      setState("idle");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setState("idle");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="cursor-pointer bg-white dark:bg-dark-gunmetal"
        >
          Import Class Enrollments
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Class Enrollments</DialogTitle>
          <DialogDescription>
            Upload a JSONL file containing class enrollments with student grades
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          {/* File Upload Section */}
          {state === "idle" && (
            <div className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload a .jsonl file where each line represents a class with
                  enrolled students and their grades.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jsonl"
                  onChange={handleFileChange}
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!file}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Start Import
              </Button>
            </div>
          )}

          {/* Processing State */}
          {(state === "uploading" || state === "processing") && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">
                  {state === "uploading"
                    ? "Reading file..."
                    : "Importing classes and enrollments..."}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                This may take a few moments. Please do not close this window.
              </p>
            </div>
          )}

          {/* Results Section */}
          {state === "completed" && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Classes Processed
                  </p>
                  <p className="text-2xl font-bold">
                    {result.classesProcessed}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Classes Created
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.classesCreated}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Enrollments Created
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.enrollmentsCreated}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Enrollments Updated
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {result.enrollmentsUpdated}
                  </p>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Warnings ({result.warnings.length})
                  </h4>
                  <ScrollArea className="h-[120px] rounded-md border p-3">
                    <div className="space-y-1">
                      {result.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs"
                        >
                          {warning}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Errors ({result.errors.length})
                  </h4>
                  <ScrollArea className="h-[200px] rounded-md border p-3">
                    <div className="space-y-2">
                      {result.errors.map((error, index) => (
                        <div
                          key={index}
                          className="p-2 bg-red-50 dark:bg-red-950 rounded text-xs space-y-1"
                        >
                          <div className="font-medium text-red-600 dark:text-red-400">
                            {error.type.replace(/_/g, " ").toUpperCase()}
                          </div>
                          <div className="text-red-700 dark:text-red-300">
                            {error.message}
                          </div>
                          {error.classKey && (
                            <div className="text-red-600 dark:text-red-400 text-[10px]">
                              Class: {error.classKey}
                            </div>
                          )}
                          {error.studentCode && (
                            <div className="text-red-600 dark:text-red-400 text-[10px]">
                              Student: {error.studentCode}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Import More
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
