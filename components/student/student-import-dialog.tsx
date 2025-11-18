"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useAction } from "convex/react";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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

type ImportResult = {
  studentCode: string;
  email: string;
  status: "success" | "error";
  error?: string;
};

type ImportState = "idle" | "uploading" | "processing" | "completed";

export function StudentImportDialog() {
  const t = useTranslations("admin.students.import");
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<ImportState>("idle");
  const [file, setFile] = React.useState<File | null>(null);
  const [results, setResults] = React.useState<ImportResult[]>([]);
  const [progress, setProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const importStudents = useAction(api.users.importStudentsFromJSONL);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.endsWith(".jsonl")) {
        alert(t("errors.invalidFileType"));
        return;
      }
      setFile(selectedFile);
      setResults([]);
      setState("idle");
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setState("uploading");
    setProgress(0);

    try {
      // Read file content
      const content = await file.text();
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        alert(t("errors.emptyFile"));
        setState("idle");
        return;
      }

      // Parse JSONL
      const students = [];
      for (let i = 0; i < lines.length; i++) {
        try {
          const student = JSON.parse(lines[i]);
          students.push(student);
        } catch (error) {
          alert(t("errors.invalidJSON", { line: i + 1 }));
          setState("idle");
          return;
        }
      }

      setState("processing");
      setProgress(25);

      // Call import action
      const importResults = await importStudents({ students });

      setProgress(100);
      setResults(importResults);
      setState("completed");
    } catch (error) {
      console.error("Import error:", error);
      alert(error instanceof Error ? error.message : t("errors.importFailed"));
      setState("idle");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults([]);
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

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="cursor-pointer bg-white dark:bg-dark-gunmetal"
        >
          <Upload className="mr-2 h-4 w-4" />
          {t("triggerButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader className="hidden">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Section */}
          {state === "idle" && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>{t("fileRequirements")}</AlertDescription>
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
                {t("startImport")}
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
                    ? t("states.reading")
                    : t("states.importing")}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results Section */}
          {state === "completed" && results.length > 0 && (
            <div className="space-y-4">
              {errorCount > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t("results.errorDetails")}
                  </h4>
                  <ScrollArea className="h-[200px] rounded-md border p-3">
                    <div className="space-y-2">
                      {results
                        .filter((r) => r.status === "error")
                        .map((result, index) => (
                          <div
                            key={index}
                            className="p-2 bg-red-50 dark:bg-red-950 rounded text-xs space-y-1"
                          >
                            <div className="font-medium">
                              {result.studentCode} - {result.email}
                            </div>
                            <div className="text-red-600 dark:text-red-400">
                              {result.error}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  {t("actions.importMore")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
