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
import { Textarea } from "@/components/ui/textarea";

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
  getLanguageVisibility,
  validateCourseForm,
} from "@/lib/courses/utils";

export function CourseFormDialog({
  mode,
  course,
  programId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CourseFormDialogProps) {
  const t = useTranslations("admin.courses.form");

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [formState, setFormState] = React.useState<CourseFormState>(
    createEmptyCourseFormState,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);
  const addCourseToProgram = useMutation(api.courses.addCourseToProgram);

  const { showSpanishFields, showEnglishFields } = getLanguageVisibility(
    formState.language,
  );

  const resetForm = React.useCallback(() => {
    setFormState(createFormStateFromCourse(course));
    setFormError(null);
  }, [course]);

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
    (field: keyof CourseFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelectChange =
    (field: "language" | "category") => (value: string) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value as CourseFormState[typeof field],
      }));
    };

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
      } else {
        const createPayload = buildCourseCreatePayload(formState);
        const courseId = await createCourse(createPayload);

        // If programId is provided, associate course with program
        if (programId && courseId) {
          await addCourseToProgram({
            courseId: courseId,
            programId: programId,
            isRequired: false,
            categoryOverride: undefined,
          });
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
