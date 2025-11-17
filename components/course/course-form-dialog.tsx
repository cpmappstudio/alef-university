"use client";

import * as React from "react";
import { Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CourseFormDialogProps,
  CourseFormState,
  CourseFormValidationMessages,
} from "@/lib/courses/types";
import {
  buildCourseCreatePayload,
  buildCourseUpdatePayload,
  createEmptyCourseFormState,
  createFormStateFromCourse,
  getCourseProgramCode,
  getCourseProgramName,
  getLanguageVisibility,
  validateCourseForm,
} from "@/lib/courses/utils";
import { useDialogState } from "@/hooks/use-dialog-state";
import {
  createInputChangeHandler,
  createSelectChangeHandler,
} from "@/lib/forms/utils";
import { LanguageCategorySection } from "@/components/forms/language-category-section";
import { LocalizedFieldGroup } from "@/components/forms/localized-field-group";
import { useProgramSelection } from "@/hooks/use-program-selection";

export function CourseFormDialog({
  mode,
  course,
  programId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CourseFormDialogProps) {
  const t = useTranslations("admin.courses.form");
  const locale = useLocale();
  const { open, setOpen } = useDialogState({
    controlledOpen,
    onOpenChange,
  });

  const [formState, setFormState] = React.useState<CourseFormState>(
    createEmptyCourseFormState,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const {
    selectedPrograms,
    setSelectedPrograms,
    toggleProgram,
    removeProgram,
    resetSelection,
  } = useProgramSelection(mode === "create" ? programId : undefined);

  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);
  const addCourseToProgram = useMutation(api.courses.addCourseToProgram);
  const removeCourseFromProgram = useMutation(
    api.courses.removeCourseFromProgram,
  );

  const allPrograms = useQuery(api.programs.getAllPrograms, {});

  // Get associated programs for this course when in edit mode
  const coursePrograms = useQuery(
    api.courses.getCoursePrograms,
    mode === "edit" && course?._id ? { courseId: course._id } : "skip",
  );

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    formState.language,
  );

  // Real-time validation for duplicate codes (only in create mode)
  // Checks if code exists in ANY language field of ANY course
  const codeEsExists = useQuery(
    api.courses.checkCourseCodeExists,
    mode === "create" && formState.codeEs.trim() !== ""
      ? { code: formState.codeEs.trim() }
      : "skip",
  );

  const codeEnExists = useQuery(
    api.courses.checkCourseCodeExists,
    mode === "create" && formState.codeEn.trim() !== ""
      ? { code: formState.codeEn.trim() }
      : "skip",
  );

  // Initialize selected programs when course programs are loaded
  React.useEffect(() => {
    if (mode === "edit" && coursePrograms && open) {
      const programIds = new Set(coursePrograms.map((cp) => cp.programId));
      setSelectedPrograms(programIds);
    }
  }, [coursePrograms, mode, open, setSelectedPrograms]);

  const resetForm = React.useCallback(() => {
    setFormState(createFormStateFromCourse(course));
    setFormError(null);
  }, [course]);

  React.useEffect(() => {
    if (open) {
      resetForm();
      // If programId is provided (creating from program detail page), pre-select it
      if (mode === "create") {
        setSelectedPrograms(programId ? new Set([programId]) : new Set());
      }
    }
  }, [open, resetForm, programId, mode, setSelectedPrograms]);

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      setFormError(null);
      setIsSubmitting(false);
      resetSelection(mode === "create" && programId ? [programId] : undefined);
    }
  };

  const handleInputChange =
    createInputChangeHandler<CourseFormState>(setFormState);

  const selectChangeHandler =
    createSelectChangeHandler<CourseFormState>(setFormState);

  const handleSelectChange = (field: "language" | "category") =>
    selectChangeHandler(field);

  const languageOptions = [
    { value: "es", label: t("options.languages.es") },
    { value: "en", label: t("options.languages.en") },
  ];

  const categoryOptions = [
    { value: "humanities", label: t("options.categories.humanities") },
    { value: "core", label: t("options.categories.core") },
    { value: "elective", label: t("options.categories.elective") },
    { value: "general", label: t("options.categories.general") },
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // Check for duplicate codes in create mode
    if (mode === "create") {
      if (codeEsExists) {
        setFormError(t("messages.errors.codeExists"));
        return;
      }
      if (codeEnExists) {
        setFormError(t("messages.errors.codeExists"));
        return;
      }
    }

    const validationMessages: CourseFormValidationMessages = {
      languageRequired: t("messages.errors.language"),
      categoryRequired: t("messages.errors.category"),
      codeEsRequired: t("messages.errors.codeEs"),
      nameEsRequired: t("messages.errors.nameEs"),
      descriptionEsRequired: t("messages.errors.descriptionEs"),
      codeEnRequired: t("messages.errors.codeEn"),
      nameEnRequired: t("messages.errors.nameEn"),
      descriptionEnRequired: t("messages.errors.descriptionEn"),
      creditsPositive: t("messages.errors.credits"),
    };

    const validation = validateCourseForm(formState, validationMessages);

    if (!validation.isValid) {
      setFormError(Object.values(validation.errors).filter(Boolean).join("\n"));
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "edit" && course?._id) {
        const updatePayload = buildCourseUpdatePayload(course._id, formState);
        await updateCourse(updatePayload);

        // Update program associations for edit mode
        const currentPrograms = coursePrograms?.map((cp) => cp.programId) || [];
        const currentSet = new Set(currentPrograms);
        const newSet = selectedPrograms;

        // Add new programs
        for (const programId of newSet) {
          if (!currentSet.has(programId as Id<"programs">)) {
            await addCourseToProgram({
              courseId: course._id,
              programId: programId as Id<"programs">,
              isRequired: false,
              categoryOverride: undefined,
            });
          }
        }

        // Remove old programs
        for (const programId of currentPrograms) {
          if (!newSet.has(programId as string)) {
            await removeCourseFromProgram({
              courseId: course._id,
              programId: programId as Id<"programs">,
            });
          }
        }
      } else {
        const createPayload = buildCourseCreatePayload(formState);
        const courseId = await createCourse(createPayload);

        // Associate course with selected programs
        if (courseId) {
          for (const programId of selectedPrograms) {
            await addCourseToProgram({
              courseId: courseId,
              programId: programId as Id<"programs">,
              isRequired: false,
              categoryOverride: undefined,
            });
          }
        }

        if (!formState.isActive && courseId) {
          const updatePayload = buildCourseUpdatePayload(courseId, formState);
          await updateCourse(updatePayload);
        }
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
            <LanguageCategorySection
              fields={[
                {
                  id: "course-language",
                  label: `${t("fields.language.label")} *`,
                  placeholder: t("fields.language.placeholder"),
                  value: formState.language,
                  onValueChange: handleSelectChange("language"),
                  options: languageOptions,
                },
                {
                  id: "course-category",
                  label: `${t("fields.category.label")} *`,
                  placeholder: t("fields.category.placeholder"),
                  value: formState.category,
                  onValueChange: handleSelectChange("category"),
                  options: categoryOptions,
                },
              ]}
              showLanguageHint={!formState.language}
              languageHint={
                <FieldDescription className="text-muted-foreground">
                  {t("messages.infoSelectLanguage")}
                </FieldDescription>
              }
            />

            <FieldSeparator />
            <FieldSet>
              <Field>
                <FieldLabel>{t("fields.programs.label")}</FieldLabel>
                <FieldDescription className="text-muted-foreground">
                  {t("fields.programs.description")}
                </FieldDescription>

                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                      type="button"
                    >
                      {t("fields.programs.placeholder")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder={t("fields.programs.search")}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>
                          {t("fields.programs.noPrograms")}
                        </CommandEmpty>
                        <CommandGroup>
                          {allPrograms?.map((program) => {
                            const isSelected = selectedPrograms.has(
                              program._id,
                            );
                            return (
                              <CommandItem
                                key={program._id}
                                value={`${getCourseProgramCode(program, locale)} ${getCourseProgramName(program, locale)}`}
                                onSelect={() => toggleProgram(program._id)}
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
                                    {getCourseProgramCode(program, locale)} -{" "}
                                    {getCourseProgramName(program, locale)}
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedPrograms.size > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(selectedPrograms).map((programId) => {
                      const program = allPrograms?.find(
                        (p) => p._id === programId,
                      );
                      if (!program) return null;
                      return (
                        <Badge
                          key={programId}
                          variant="secondary"
                          className="gap-1"
                        >
                          {getCourseProgramCode(program, locale)} -{" "}
                          {getCourseProgramName(program, locale)}
                          <button
                            type="button"
                            onClick={() => removeProgram(programId)}
                            className="ml-1 rounded-full hover:bg-muted"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </Field>
            </FieldSet>

            <LocalizedFieldGroup
              showSpanishFields={showSpanishFields}
              showEnglishFields={showEnglishFields}
              spanishFields={[
                {
                  id: "course-code-es",
                  label: `${t("fields.codeEs.label")} *`,
                  placeholder: t("fields.codeEs.placeholder"),
                  value: formState.codeEs,
                  onChange: handleInputChange("codeEs"),
                  error:
                    mode === "create" &&
                    formState.codeEs.trim() !== "" &&
                    codeEsExists
                      ? t("messages.errors.codeExists")
                      : undefined,
                },
                {
                  id: "course-name-es",
                  label: `${t("fields.nameEs.label")} *`,
                  placeholder: t("fields.nameEs.placeholder"),
                  value: formState.nameEs,
                  onChange: handleInputChange("nameEs"),
                },
                {
                  id: "course-description-es",
                  label: `${t("fields.descriptionEs.label")} *`,
                  placeholder: t("fields.descriptionEs.placeholder"),
                  value: formState.descriptionEs,
                  onChange: handleInputChange("descriptionEs"),
                  type: "textarea",
                },
              ]}
              englishFields={[
                {
                  id: "course-code-en",
                  label: `${t("fields.codeEn.label")} *`,
                  placeholder: t("fields.codeEn.placeholder"),
                  value: formState.codeEn,
                  onChange: handleInputChange("codeEn"),
                  error:
                    mode === "create" &&
                    formState.codeEn.trim() !== "" &&
                    codeEnExists
                      ? t("messages.errors.codeExists")
                      : undefined,
                },
                {
                  id: "course-name-en",
                  label: `${t("fields.nameEn.label")} *`,
                  placeholder: t("fields.nameEn.placeholder"),
                  value: formState.nameEn,
                  onChange: handleInputChange("nameEn"),
                },
                {
                  id: "course-description-en",
                  label: `${t("fields.descriptionEn.label")} *`,
                  placeholder: t("fields.descriptionEn.placeholder"),
                  value: formState.descriptionEn,
                  onChange: handleInputChange("descriptionEn"),
                  type: "textarea",
                },
              ]}
            />

            <FieldSeparator />
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="course-credits">
                    {t("fields.credits.label")} *
                  </FieldLabel>
                  <Input
                    id="course-credits"
                    value={formState.credits}
                    onChange={handleInputChange("credits")}
                    placeholder={t("fields.credits.placeholder")}
                    inputMode="numeric"
                  />
                </Field>
              </FieldGroup>
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
