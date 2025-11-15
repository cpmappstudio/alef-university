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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/lib/forms/handlers";

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
  const [selectedPrograms, setSelectedPrograms] = React.useState<Set<string>>(
    new Set(),
  );

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

  // Initialize selected programs when course programs are loaded
  React.useEffect(() => {
    if (mode === "edit" && coursePrograms && open) {
      const programIds = new Set(coursePrograms.map((cp) => cp.programId));
      setSelectedPrograms(programIds);
    }
  }, [coursePrograms, mode, open]);

  const resetForm = React.useCallback(() => {
    setFormState(createFormStateFromCourse(course));
    setFormError(null);
  }, [course]);

  React.useEffect(() => {
    if (open) {
      resetForm();
      // If programId is provided (creating from program detail page), pre-select it
      if (programId && mode === "create") {
        setSelectedPrograms(new Set([programId]));
      } else if (mode === "create") {
        setSelectedPrograms(new Set());
      }
    }
  }, [open, resetForm, programId, mode]);

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      setFormError(null);
      setIsSubmitting(false);
      setSelectedPrograms(new Set());
    }
  };

  const toggleProgram = (programId: string) => {
    setSelectedPrograms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  const removeProgram = (programId: string) => {
    setSelectedPrograms((prev) => {
      const newSet = new Set(prev);
      newSet.delete(programId);
      return newSet;
    });
  };

  const handleInputChange =
    createInputChangeHandler<CourseFormState>(setFormState);

  const selectChangeHandler =
    createSelectChangeHandler<CourseFormState>(setFormState);

  const handleSelectChange = (field: "language" | "category") =>
    selectChangeHandler(field);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

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
          if (!currentSet.has(programId)) {
            await addCourseToProgram({
              courseId: course._id,
              programId: programId as Id<"programs">,
              isRequired: false,
              categoryOverride: undefined,
            });
          }
        }

        // Remove old programs
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
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="course-language">
                    {t("fields.language.label")} *
                  </FieldLabel>

                  <Select
                    value={formState.language}
                    onValueChange={handleSelectChange("language")}
                  >
                    <SelectTrigger id="course-language">
                      <SelectValue
                        placeholder={t("fields.language.placeholder")}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="es">
                        {t("options.languages.es")}
                      </SelectItem>

                      <SelectItem value="en">
                        {t("options.languages.en")}
                      </SelectItem>

                      <SelectItem value="both">
                        {t("options.languages.both")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="course-category">
                    {t("fields.category.label")} *
                  </FieldLabel>

                  <Select
                    value={formState.category}
                    onValueChange={handleSelectChange("category")}
                  >
                    <SelectTrigger id="course-category">
                      <SelectValue
                        placeholder={t("fields.category.placeholder")}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="humanities">
                        {t("options.categories.humanities")}
                      </SelectItem>

                      <SelectItem value="core">
                        {t("options.categories.core")}
                      </SelectItem>

                      <SelectItem value="elective">
                        {t("options.categories.elective")}
                      </SelectItem>

                      <SelectItem value="general">
                        {t("options.categories.general")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {!formState.language ? (
                <FieldDescription className="text-muted-foreground">
                  {t("messages.infoSelectLanguage")}
                </FieldDescription>
              ) : null}
            </FieldSet>

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

            {showSpanishFields ? (
              <>
                <FieldSeparator />
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="course-code-es">
                        {t("fields.codeEs.label")} *
                      </FieldLabel>
                      <Input
                        id="course-code-es"
                        value={formState.codeEs}
                        onChange={handleInputChange("codeEs")}
                        placeholder={t("fields.codeEs.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="course-name-es">
                        {t("fields.nameEs.label")} *
                      </FieldLabel>
                      <Input
                        id="course-name-es"
                        value={formState.nameEs}
                        onChange={handleInputChange("nameEs")}
                        placeholder={t("fields.nameEs.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="course-description-es">
                        {t("fields.descriptionEs.label")} *
                      </FieldLabel>
                      <Textarea
                        id="course-description-es"
                        value={formState.descriptionEs}
                        onChange={handleInputChange("descriptionEs")}
                        placeholder={t("fields.descriptionEs.placeholder")}
                        className="resize-none"
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </>
            ) : null}

            {showEnglishFields ? (
              <>
                <FieldSeparator />
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="course-code-en">
                        {t("fields.codeEn.label")} *
                      </FieldLabel>
                      <Input
                        id="course-code-en"
                        value={formState.codeEn}
                        onChange={handleInputChange("codeEn")}
                        placeholder={t("fields.codeEn.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="course-name-en">
                        {t("fields.nameEn.label")} *
                      </FieldLabel>
                      <Input
                        id="course-name-en"
                        value={formState.nameEn}
                        onChange={handleInputChange("nameEn")}
                        placeholder={t("fields.nameEn.placeholder")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="course-description-en">
                        {t("fields.descriptionEn.label")} *
                      </FieldLabel>
                      <Textarea
                        id="course-description-en"
                        value={formState.descriptionEn}
                        onChange={handleInputChange("descriptionEn")}
                        placeholder={t("fields.descriptionEn.placeholder")}
                        className="resize-none"
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </>
            ) : null}

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
