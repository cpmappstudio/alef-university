"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ClassFormDialogProps {
  mode: "create" | "edit";
  courseId: Id<"courses">;
  classId?: Id<"classes">;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ClassFormState {
  bimesterId: string;
  groupNumber: string;
  professorId: string;
}

const createEmptyFormState = (): ClassFormState => ({
  bimesterId: "",
  groupNumber: "",
  professorId: "",
});

export default function ClassFormDialog({
  mode,
  courseId,
  classId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ClassFormDialogProps) {
  const t = useTranslations("admin.courses.detail.classForm");

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [formState, setFormState] =
    React.useState<ClassFormState>(createEmptyFormState);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const bimestersQuery = useQuery(api.bimesters.getAllBimesters, {});
  const bimesters = bimestersQuery ?? [];
  const isLoadingBimesters = bimestersQuery === undefined;

  // Get all users and filter professors on client side
  const usersQuery = useQuery(api.users.getAllUsers, {});
  const allUsers = usersQuery ?? [];
  const professors = allUsers.filter((user) => user.role === "professor");
  const isLoadingUsers = usersQuery === undefined;

  const createClass = useMutation(api.classes.createClass);
  const updateClass = useMutation(api.classes.updateClass);

  // Get class data when in edit mode
  const classData = useQuery(
    api.classes.getClassById,
    mode === "edit" && classId && open ? { id: classId } : "skip",
  );

  const resetForm = React.useCallback(() => {
    if (mode === "edit" && classData) {
      setFormState({
        bimesterId: classData.bimesterId,
        groupNumber: classData.groupNumber,
        professorId: classData.professorId,
      });
    } else {
      setFormState(createEmptyFormState());
    }
    setFormError(null);
  }, [mode, classData]);

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      setFormError(null);
      setIsSubmitting(false);
    }
  };

  const handleInputChange =
    (field: keyof ClassFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelectChange =
    (field: "bimesterId" | "professorId") => (value: string) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value as ClassFormState[typeof field],
      }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // Validation
    if (!formState.bimesterId) {
      setFormError(t("messages.errors.bimesterRequired"));
      return;
    }

    if (!formState.groupNumber.trim()) {
      setFormError(t("messages.errors.groupNumberRequired"));
      return;
    }

    if (!formState.professorId) {
      setFormError(t("messages.errors.professorRequired"));
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "edit" && classId) {
        await updateClass({
          classId,
          bimesterId: formState.bimesterId as Id<"bimesters">,
          groupNumber: formState.groupNumber.trim(),
          professorId: formState.professorId as Id<"users">,
        });
      } else {
        await createClass({
          courseId,
          bimesterId: formState.bimesterId as Id<"bimesters">,
          groupNumber: formState.groupNumber.trim(),
          professorId: formState.professorId as Id<"users">,
        });
      }

      handleDialogChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("messages.errors.generic");
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBimesters = bimesters.filter((b) => b.isActive);
  const hasBimesters = bimesters.length > 0;
  const hasProfessors = professors.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="hidden">
            <DialogTitle>
              {mode === "edit" ? t("titleEdit") : t("title")}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit" ? t("descriptionEdit") : t("description")}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="class-bimester">
                    {t("fields.bimester.label")} *
                  </FieldLabel>

                  <Select
                    value={formState.bimesterId}
                    onValueChange={handleSelectChange("bimesterId")}
                    disabled={isLoadingBimesters || !hasBimesters}
                  >
                    <SelectTrigger id="class-bimester">
                      <SelectValue
                        placeholder={t("fields.bimester.placeholder")}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {bimesters.map((bimester) => (
                        <SelectItem key={bimester._id} value={bimester._id}>
                          {new Date(bimester.startDate).toLocaleDateString()} -{" "}
                          {new Date(bimester.endDate).toLocaleDateString()}
                          {bimester.isActive ? " (Active)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {activeBimesters.length > 0 && (
                    <FieldDescription className="text-muted-foreground text-sm">
                      {t("fields.bimester.description")}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="class-group">
                    {t("fields.groupNumber.label")} *
                  </FieldLabel>
                  <Input
                    id="class-group"
                    value={formState.groupNumber}
                    onChange={handleInputChange("groupNumber")}
                    placeholder={t("fields.groupNumber.placeholder")}
                  />
                  <FieldDescription className="text-muted-foreground text-sm">
                    {t("fields.groupNumber.description")}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="class-professor">
                    {t("fields.professor.label")} *
                  </FieldLabel>

                  <Select
                    value={formState.professorId}
                    onValueChange={handleSelectChange("professorId")}
                    disabled={isLoadingUsers || !hasProfessors}
                  >
                    <SelectTrigger id="class-professor">
                      <SelectValue
                        placeholder={t("fields.professor.placeholder")}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {professors.map((professor) => (
                        <SelectItem key={professor._id} value={professor._id}>
                          {professor.firstName} {professor.lastName}
                          {professor.email ? ` (${professor.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldDescription className="text-muted-foreground">
                {t("messages.autoStatus")}
              </FieldDescription>

              {!isLoadingBimesters && !hasBimesters ? (
                <FieldDescription className="text-muted-foreground">
                  {t("messages.noBimesters")}
                </FieldDescription>
              ) : null}

              {!isLoadingUsers && !hasProfessors ? (
                <FieldDescription className="text-muted-foreground">
                  {t("messages.noProfessors")}
                </FieldDescription>
              ) : null}
            </FieldSet>

            <FieldSeparator />
            {formError ? (
              <FieldSet>
                <FieldDescription className="whitespace-pre-line text-destructive">
                  {formError}
                </FieldDescription>
              </FieldSet>
            ) : null}

            <Field orientation="horizontal">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoadingBimesters ||
                  isLoadingUsers ||
                  !hasBimesters ||
                  !hasProfessors
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("buttons.loading")}
                  </>
                ) : mode === "edit" ? (
                  t("buttons.update")
                ) : (
                  t("buttons.submit")
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
