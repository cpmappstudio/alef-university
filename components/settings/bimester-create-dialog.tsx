"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export function BimesterCreateDialog() {
  const tPage = useTranslations("admin.settings.bimestersPage");
  const locale = useLocale();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
  );
  const [gradeDeadline, setGradeDeadline] = React.useState<Date | undefined>(
    undefined,
  );
  const [isCreating, setIsCreating] = React.useState(false);
  const createBimester = useMutation(api.bimesters.createBimester);

  const dateLocale = locale === "es" ? es : enUS;

  const handleCreateBimester = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(tPage("messages.nameRequired"));
      return;
    }

    if (!dateRange?.from || !dateRange?.to || !gradeDeadline) {
      toast.error(tPage("messages.allDatesRequired"));
      return;
    }

    try {
      setIsCreating(true);
      await createBimester({
        name: name.trim(),
        startDate: dateRange.from.getTime(),
        endDate: dateRange.to.getTime(),
        gradeDeadline: gradeDeadline.getTime(),
      });
      toast.success(tPage("messages.createSuccess"));
      setIsDialogOpen(false);
      setName("");
      setDateRange(undefined);
      setGradeDeadline(undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tPage("messages.createError");
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="max-w-fit">
          {tPage("dialog.trigger")}
          <Plus className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <form onSubmit={handleCreateBimester}>
          <DialogHeader className="hidden">
            <DialogTitle>{tPage("dialog.title")}</DialogTitle>
            <DialogDescription>{tPage("dialog.description")}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <FieldSet>
              <FieldGroup>
                {/* Name Field */}
                <Field>
                  <FieldLabel htmlFor="name">
                    {tPage("dialog.nameLabel")} *
                  </FieldLabel>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={tPage("dialog.namePlaceholder")}
                    disabled={isCreating}
                  />
                </Field>

                {/* Date Range Picker */}
                <Field>
                  <FieldLabel htmlFor="date-range">
                    {tPage("dialog.dateRangeLabel")} *
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground",
                        )}
                        disabled={isCreating}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "PP", {
                                locale: dateLocale,
                              })}{" "}
                              -{" "}
                              {format(dateRange.to, "PP", {
                                locale: dateLocale,
                              })}
                            </>
                          ) : (
                            format(dateRange.from, "PP", { locale: dateLocale })
                          )
                        ) : (
                          <span>{tPage("dialog.selectDateRange")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        disabled={isCreating}
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>

                {/* Grade Deadline */}
                <Field>
                  <FieldLabel htmlFor="grade-deadline">
                    {tPage("dialog.gradeDeadlineLabel")} *
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !gradeDeadline && "text-muted-foreground",
                        )}
                        disabled={isCreating}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {gradeDeadline ? (
                          format(gradeDeadline, "PPP", { locale: dateLocale })
                        ) : (
                          <span>{tPage("dialog.selectDate")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={gradeDeadline}
                        onSelect={setGradeDeadline}
                        disabled={(date) =>
                          isCreating ||
                          (dateRange?.to ? date < dateRange.to : false)
                        }
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              </FieldGroup>
            </FieldSet>

            <Field orientation="horizontal">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tPage("dialog.creating")}
                  </>
                ) : (
                  tPage("dialog.create")
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
