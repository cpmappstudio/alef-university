"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import type { Id } from "@/convex/_generated/dataModel";

interface BimesterEditDialogProps {
  bimesterId: Id<"bimesters">;
  initialName: string;
  initialStartDate: number;
  initialEndDate: number;
  initialGradeDeadline: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BimesterEditDialog({
  bimesterId,
  initialName,
  initialStartDate,
  initialEndDate,
  initialGradeDeadline,
  open,
  onOpenChange,
}: BimesterEditDialogProps) {
  const tPage = useTranslations("admin.settings.bimestersPage");
  const locale = useLocale();
  const [name, setName] = React.useState(initialName);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(initialStartDate),
    to: new Date(initialEndDate),
  });
  const [gradeDeadline, setGradeDeadline] = React.useState<Date | undefined>(
    new Date(initialGradeDeadline),
  );
  const [isUpdating, setIsUpdating] = React.useState(false);
  const updateBimester = useMutation(api.bimesters.updateBimester);

  const dateLocale = locale === "es" ? es : enUS;

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(initialName);
      setDateRange({
        from: new Date(initialStartDate),
        to: new Date(initialEndDate),
      });
      setGradeDeadline(new Date(initialGradeDeadline));
    }
  }, [
    open,
    initialName,
    initialStartDate,
    initialEndDate,
    initialGradeDeadline,
  ]);

  const handleUpdateBimester = async (e: React.FormEvent) => {
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
      setIsUpdating(true);
      await updateBimester({
        bimesterId,
        name: name.trim(),
        startDate: dateRange.from.getTime(),
        endDate: dateRange.to.getTime(),
        gradeDeadline: gradeDeadline.getTime(),
      });
      toast.success(tPage("messages.updateSuccess"));
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tPage("messages.updateError");
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <form onSubmit={handleUpdateBimester}>
          <DialogHeader className="hidden">
            <DialogTitle>{tPage("editDialog.title")}</DialogTitle>
            <DialogDescription>
              {tPage("editDialog.description")}
            </DialogDescription>
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
                    disabled={isUpdating}
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
                        disabled={isUpdating}
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
                        disabled={isUpdating}
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
                        disabled={isUpdating}
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
                          isUpdating ||
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
              <div className="flex gap-2">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {tPage("editDialog.updating")}
                    </>
                  ) : (
                    tPage("editDialog.update")
                  )}
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
