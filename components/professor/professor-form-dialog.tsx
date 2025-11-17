"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAction, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useDialogState } from "@/hooks/use-dialog-state";
import {
  ProfessorFormDialogProps,
  ProfessorFormErrors,
  ProfessorFormState,
  ProfessorFormValidationMessages,
} from "@/lib/professors/types";
import {
  buildProfessorCreatePayload,
  buildProfessorUpdatePayload,
  createEmptyProfessorFormState,
  createProfessorFormStateFromDoc,
  validateProfessorForm,
} from "@/lib/professors/utils";
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
import { Switch } from "@/components/ui/switch";

export function ProfessorFormDialog({
  mode,
  professor,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ProfessorFormDialogProps) {
  const t = useTranslations("admin.professors.form");
  const router = useRouter();
  const { open, setOpen } = useDialogState({ controlledOpen, onOpenChange });

  const [formState, setFormState] = React.useState<ProfessorFormState>(() =>
    createProfessorFormStateFromDoc(professor),
  );
  const [fieldErrors, setFieldErrors] = React.useState<ProfessorFormErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const createProfessor = useAction(api.users.createProfessorWithClerk);
  const updateProfessor = useAction(api.users.updateProfessorWithClerk);

  // Real-time validation for duplicate email (only in create mode)
  const emailExists = useQuery(
    api.users.checkEmailExists,
    mode === "create" && formState.email.trim() !== ""
      ? { email: formState.email.trim() }
      : "skip",
  );

  const resetForm = React.useCallback(() => {
    setFormState(
      mode === "edit"
        ? createProfessorFormStateFromDoc(professor)
        : createEmptyProfessorFormState(),
    );
    setFieldErrors({});
    setFormError(null);
  }, [mode, professor]);

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
      setIsSubmitting(false);
    }
  };

  const handleInputChange =
    createInputChangeHandler<ProfessorFormState>(setFormState);

  const validationMessages: ProfessorFormValidationMessages = {
    firstNameRequired: t("messages.errors.firstName"),
    lastNameRequired: t("messages.errors.lastName"),
    emailRequired: t("messages.errors.email"),
    emailInvalid: t("messages.errors.emailInvalid"),
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validation = validateProfessorForm(formState, validationMessages);
    setFieldErrors(validation.errors);

    if (!validation.isValid) {
      const summary = Object.values(validation.errors)
        .filter(Boolean)
        .join("\n");
      setFormError(summary);
      return;
    }

    // Check for duplicate email in create mode
    if (mode === "create") {
      if (emailExists) {
        setFieldErrors({
          email: t("messages.errors.emailExists"),
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      if (mode === "edit" && professor) {
        const payload = buildProfessorUpdatePayload(professor, formState);
        await updateProfessor(payload);
      } else {
        const payload = buildProfessorCreatePayload(formState);
        await createProfessor(payload);
      }

      handleDialogChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("messages.errors.generic");
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTrigger = trigger ? (
    <DialogTrigger asChild>{trigger}</DialogTrigger>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
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
              <Field>
                <FieldLabel htmlFor="professor-first-name">
                  {t("fields.firstName.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="professor-first-name"
                    value={formState.firstName}
                    onChange={handleInputChange("firstName")}
                    placeholder={t("fields.firstName.placeholder")}
                    autoComplete="given-name"
                  />
                  <FieldError>{fieldErrors.firstName}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="professor-last-name">
                  {t("fields.lastName.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="professor-last-name"
                    value={formState.lastName}
                    onChange={handleInputChange("lastName")}
                    placeholder={t("fields.lastName.placeholder")}
                    autoComplete="family-name"
                  />
                  <FieldError>{fieldErrors.lastName}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="professor-email">
                  {t("fields.email.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="professor-email"
                    type="email"
                    value={formState.email}
                    onChange={handleInputChange("email")}
                    placeholder={t("fields.email.placeholder")}
                    autoComplete="email"
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
                <FieldLabel htmlFor="professor-phone">
                  {t("fields.phone.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="professor-phone"
                    value={formState.phone}
                    onChange={handleInputChange("phone")}
                    placeholder={t("fields.phone.placeholder")}
                    autoComplete="tel"
                  />
                  <FieldDescription className="text-muted-foreground">
                    {t("fields.phone.description")}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="professor-country">
                  {t("fields.country.label")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="professor-country"
                    value={formState.country}
                    onChange={handleInputChange("country")}
                    placeholder={t("fields.country.placeholder")}
                    autoComplete="country-name"
                  />
                </FieldContent>
              </Field>
            </FieldSet>

            {mode === "edit" ? (
              <>
                <FieldSeparator />
                <FieldSet>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="professor-active">
                      {t("fields.isActive.label")}
                    </FieldLabel>
                    <FieldContent>
                      <Switch
                        id="professor-active"
                        checked={formState.isActive}
                        onCheckedChange={(checked) =>
                          setFormState((prev) => ({
                            ...prev,
                            isActive: checked,
                          }))
                        }
                      />
                      <FieldDescription className="text-muted-foreground">
                        {t("fields.isActive.description")}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldSet>
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
