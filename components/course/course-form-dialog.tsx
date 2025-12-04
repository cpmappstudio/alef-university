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

  // State for creditsOverride per program
  const [programCredits, setProgramCredits] = React.useState<
    Map<string, number | undefined>
  >(new Map());

  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);
  const addCourseToProgram = useMutation(api.courses.addCourseToProgram);
  const removeCourseFromProgram = useMutation(
    api.courses.removeCourseFromProgram,
  );
  const updateCourseInProgram = useMutation(api.courses.updateCourseInProgram);

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

  // Initialize selected programs and credits when course programs are loaded
  React.useEffect(() => {
    if (mode === "edit" && coursePrograms && open) {
      const programIds = new Set(coursePrograms.map((cp) => cp.programId));
      setSelectedPrograms(programIds);
    }
  }, [coursePrograms, mode, open, setSelectedPrograms]);

  const resetForm = React.useCallback(() => {
    setFormState(createFormStateFromCourse(course));
    setFormError(null);
    // Load existing credits when in edit mode
    if (mode === "edit" && coursePrograms) {
      const creditsMap = new Map<string, number | undefined>();
      coursePrograms.forEach((cp) => {
        if (cp.credits !== undefined) {
          creditsMap.set(cp.programId, cp.credits);
        }
      });
      setProgramCredits(creditsMap);
    } else {
      setProgramCredits(new Map());
    }
  }, [course, mode, coursePrograms]);

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

  const handleProgramCreditsChange = (programId: string, value: string) => {
    const newMap = new Map(programCredits);
    if (value === "") {
      // Remove credits if empty (will be validated on submit)
      newMap.delete(programId);
    } else {
      const credits = parseInt(value, 10);
      if (!isNaN(credits) && credits > 0) {
        newMap.set(programId, credits);
      }
    }
    setProgramCredits(newMap);
  };

  const languageOptions = [
    { value: "es", label: t("options.languages.es") },
    { value: "en", label: t("options.languages.en") },
  ];

  const categoryOptions = [
    { value: "humanities", label: t("options.categories.humanities") },
    { value: "core", label: t("options.categories.core") },
    { value: "elective", label: t("options.categories.elective") },
    { value: "dmp", label: t("options.categories.dmp") },
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

    // Validate that all selected programs have credits assigned
    if (selectedPrograms.size > 0) {
      for (const programId of selectedPrograms) {
        const credits = programCredits.get(programId);
        if (!credits || credits <= 0) {
          setFormError(
            locale === "es"
              ? "Debes asignar créditos válidos (mayor a 0) a todos los programas seleccionados"
              : "You must assign valid credits (greater than 0) to all selected programs",
          );
          return;
        }
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
              credits: programCredits.get(programId)!,
            });
          } else {
            // Update existing program association with new credits
            await updateCourseInProgram({
              courseId: course._id,
              programId: programId as Id<"programs">,
              credits: programCredits.get(programId)!,
            });
          }
        }

        // Remove programs no longer selected
        for (const programId of currentSet) {
          if (!newSet.has(programId)) {
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
              credits: programCredits.get(programId)!,
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
                  <div className="mt-4 space-y-3">
                    <div className="text-sm font-medium text-foreground">
                      {t("fields.programs.selected")} ({selectedPrograms.size})
                    </div>
                    {Array.from(selectedPrograms).map((programId) => {
                      const program = allPrograms?.find(
                        (p) => p._id === programId,
                      );
                      if (!program) return null;
                      const overrideCredits = programCredits.get(programId);
                      return (
                        <div
                          key={programId}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {getCourseProgramCode(program, locale)} -{" "}
                              {getCourseProgramName(program, locale)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="3"
                              value={overrideCredits ?? ""}
                              onChange={(e) =>
                                handleProgramCreditsChange(
                                  programId,
                                  e.target.value,
                                )
                              }
                              className="w-20 h-8 text-sm"
                              required
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {locale === "es" ? "créditos" : "credits"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              removeProgram(programId);
                              const newMap = new Map(programCredits);
                              newMap.delete(programId);
                              setProgramCredits(newMap);
                            }}
                            className="p-1 rounded-full hover:bg-destructive/10 text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground">
                      {locale === "es"
                        ? "* Los créditos son obligatorios para cada programa"
                        : "* Credits are required for each program"}
                    </p>
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
                    mode === "create" && codeEsExists
                      ? t("messages.errors.codeEsExists")
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
                    mode === "create" && codeEnExists
                      ? t("messages.errors.codeEnExists")
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
