"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
  validateStudentForm,
} from "@/lib/students/utils";
import { createInputChangeHandler } from "@/lib/forms/utils";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
  const [programOpen, setProgramOpen] = React.useState(false);

  const createStudent = useAction(api.users.createStudentWithClerk);
  const updateStudent = useAction(api.users.updateStudentWithClerk);
  const programs = useQuery(api.programs.getAllPrograms, { isActive: true });

  // Real-time validation for duplicates (only in create mode)
  const studentCodeExists = useQuery(
    api.users.checkStudentCodeExists,
    mode === "create" && formState.studentCode.trim() !== ""
      ? { studentCode: formState.studentCode.trim() }
      : "skip",
  );

  const emailExists = useQuery(
    api.users.checkEmailExists,
    mode === "create" && formState.email.trim() !== ""
      ? { email: formState.email.trim() }
      : "skip",
  );

  React.useEffect(() => {
    if (open) {
      setFormState(createStudentFormStateFromDoc(student));
      setFieldErrors({});
      setFormError(null);
    }
  }, [open, student]);

  const handleInputChange = createInputChangeHandler(setFormState);

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

    // Check for duplicates in create mode
    if (mode === "create") {
      if (studentCodeExists) {
        setFieldErrors({
          studentCode: t("messages.errors.studentCodeExists"),
        });
        return;
      }
      if (emailExists) {
        setFieldErrors({
          email: t("messages.errors.emailExists"),
        });
        return;
      }
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="hidden">
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
                  {mode === "create" &&
                    formState.email.trim() !== "" &&
                    emailExists && (
                      <FieldError>
                        {t("messages.errors.emailExists")}
                      </FieldError>
                    )}
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
                  {mode === "create" &&
                    formState.studentCode.trim() !== "" &&
                    studentCodeExists && (
                      <FieldError>
                        {t("messages.errors.studentCodeExists")}
                      </FieldError>
                    )}
                  <FieldError>{fieldErrors.studentCode}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-program">
                  {t("fields.program.label")}
                </FieldLabel>
                <FieldContent>
                  <Popover open={programOpen} onOpenChange={setProgramOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={programOpen}
                        className="w-full justify-between"
                      >
                        {formState.programId
                          ? (() => {
                              const selectedProgram = programs?.find(
                                (p) => p._id === formState.programId,
                              );
                              if (!selectedProgram)
                                return t("fields.program.placeholder");
                              const code =
                                locale === "es"
                                  ? selectedProgram.codeEs ||
                                    selectedProgram.codeEn
                                  : selectedProgram.codeEn ||
                                    selectedProgram.codeEs;
                              const name =
                                locale === "es"
                                  ? selectedProgram.nameEs ||
                                    selectedProgram.nameEn
                                  : selectedProgram.nameEn ||
                                    selectedProgram.nameEs;
                              return `${code} - ${name}`;
                            })()
                          : t("fields.program.placeholder")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={t("fields.program.searchPlaceholder")}
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>
                            {t("fields.program.noPrograms")}
                          </CommandEmpty>
                          <CommandGroup>
                            {(programs ?? []).map((program) => {
                              const code =
                                locale === "es"
                                  ? program.codeEs || program.codeEn
                                  : program.codeEn || program.codeEs;
                              const name =
                                locale === "es"
                                  ? program.nameEs || program.nameEn
                                  : program.nameEn || program.nameEs;
                              const isSelected =
                                formState.programId === program._id;
                              return (
                                <CommandItem
                                  key={program._id}
                                  value={`${code} ${name}`}
                                  onSelect={() => {
                                    setFormState((prev) => ({
                                      ...prev,
                                      programId: isSelected ? "" : program._id,
                                    }));
                                    setProgramOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {code} - {name}
                                    </div>
                                    {program.degree && (
                                      <div className="text-sm text-muted-foreground">
                                        {program.degree}
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FieldError>{fieldErrors.programId}</FieldError>
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
