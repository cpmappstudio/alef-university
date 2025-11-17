export type FormOption = {
  value: string;
  label: string;
};

export type SelectFieldConfig = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  options: FormOption[];
};

export type LanguageCategorySectionProps = {
  fields: SelectFieldConfig[];
  noCategoriesMessage?: ReactNode;
  showLanguageHint?: boolean;
  languageHint?: ReactNode;
};

export type LocalizedFieldConfig = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  type?: "input" | "textarea";
  error?: string;
};

export type LocalizedFieldGroupProps = {
  showSpanishFields: boolean;
  showEnglishFields: boolean;
  spanishFields: LocalizedFieldConfig[];
  englishFields: LocalizedFieldConfig[];
};
