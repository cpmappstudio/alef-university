"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAction, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useDialogState } from "@/hooks/use-dialog-state";
import {
  StudentFormDialogProps,
  StudentFormErrors,
  StudentFormState,
} from "@/lib/students/types";
import {
  buildStudentCreatePayload,
  buildStudentUpdatePayload,
  createEmptyStudentFormState,
  createStudentFormStateFromDoc,
  studentStatuses,
  validateStudentForm,
} from "@/lib/students/utils";
import { createInputChangeHandler } from "@/lib/forms/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function StudentFormDialog({
  mode,
  student,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: StudentFormDialogProps) {
  const t = useTranslations("admin.students.form");
  const locale = useLocale();
  const router = useRouter();
  const { open, setOpen } = useDialogState({ controlledOpen, onOpenChange });

  const [formState, setFormState] = React.useState<StudentFormState>(() =>
    createStudentFormStateFromDoc(student),
  );
  const [fieldErrors, setFieldErrors] = React.useState<StudentFormErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const createStudent = useAction(api.users.createStudentWithClerk);
  const updateStudent = useAction(api.users.updateStudentWithClerk);
  const programs = useQuery(api.programs.getAllPrograms, { isActive: true });

  React.useEffect(() => {
    if (open) {
      setFormState(createStudentFormStateFromDoc(student));
      setFieldErrors({});
      setFormError(null);
    }
  }, [open, student]);

  const handleInputChange = createInputChangeHandler(setFormState);

  const handleStatusChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      status: value as StudentFormState["status"],
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const validation = validateStudentForm(formState);
    if (Object.keys(validation).length > 0) {
      const mappedErrors: StudentFormErrors = {};
      (Object.keys(validation) as (keyof StudentFormErrors)[]).forEach(
        (key) => {
          mappedErrors[key] = t(`messages.errors.${key}`);
        },
      );
      setFieldErrors(mappedErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await createStudent(buildStudentCreatePayload(formState));
      } else if (student) {
        await updateStudent(buildStudentUpdatePayload(student, formState));
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("messages.errors.generic");
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("title") : t("titleEdit")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? t("description") : t("descriptionEdit")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldSet>
              <Field>
                <FieldLabel htmlFor="student-first-name">
                  {t("fields.firstName.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="student-first-name"
                    value={formState.firstName}
                    onChange={handleInputChange("firstName")}
                  />
                  <FieldError>{fieldErrors.firstName}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-last-name">
                  {t("fields.lastName.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="student-last-name"
                    value={formState.lastName}
                    onChange={handleInputChange("lastName")}
                  />
                  <FieldError>{fieldErrors.lastName}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-email">
                  {t("fields.email.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="student-email"
                    type="email"
                    value={formState.email}
                    onChange={handleInputChange("email")}
                    disabled={mode === "edit"}
                  />
                  <FieldError>{fieldErrors.email}</FieldError>
                </FieldContent>
              </Field>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <Field>
                <FieldLabel htmlFor="student-code">
                  {t("fields.studentCode.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="student-code"
                    value={formState.studentCode}
                    onChange={handleInputChange("studentCode")}
                  />
                  <FieldDescription>
                    {t("fields.studentCode.description")}
                  </FieldDescription>
                  <FieldError>{fieldErrors.studentCode}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-program">
                  {t("fields.program.label")}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={formState.programId}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, programId: value }))
                    }
                  >
                    <SelectTrigger id="student-program">
                      <SelectValue
                        placeholder={t("fields.program.placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(programs ?? []).map((program) => {
                        const label =
                          locale === "es"
                            ? program.nameEs || program.nameEn || ""
                            : program.nameEn || program.nameEs || "";
                        return (
                          <SelectItem key={program._id} value={program._id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldErrors.programId}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-enrollment-date">
                  {t("fields.enrollmentDate.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="student-enrollment-date"
                    type="date"
                    value={formState.enrollmentDate}
                    onChange={handleInputChange("enrollmentDate")}
                  />
                  <FieldError>{fieldErrors.enrollmentDate}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-status">
                  {t("fields.status.label")}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={formState.status ?? "active"}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger id="student-status">
                      <SelectValue
                        placeholder={t("fields.status.placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {studentStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(`fields.status.options.${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldErrors.status}</FieldError>
                </FieldContent>
              </Field>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <Field>
                <FieldLabel htmlFor="student-phone">
                  {t("fields.phone.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="student-phone"
                    value={formState.phone}
                    onChange={handleInputChange("phone")}
                  />
                  <FieldDescription>
                    {t("fields.phone.description")}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-country">
                  {t("fields.country.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="student-country"
                    value={formState.country}
                    onChange={handleInputChange("country")}
                  />
                </FieldContent>
              </Field>
            </FieldSet>

            {mode === "edit" ? (
              <>
                <FieldSeparator />
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="student-active">
                    {t("fields.isActive.label")}
                  </FieldLabel>
                  <FieldContent>
                    <Switch
                      id="student-active"
                      checked={formState.isActive}
                      onCheckedChange={(checked) =>
                        setFormState((prev) => ({ ...prev, isActive: checked }))
                      }
                    />
                    <FieldDescription>
                      {t("fields.isActive.description")}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </>
            ) : null}

            {formError ? (
              <>
                <FieldSeparator />
                <FieldError>{formError}</FieldError>
              </>
            ) : null}

            <Field orientation="horizontal">
              <Button type="submit" disabled={isSubmitting}>
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
