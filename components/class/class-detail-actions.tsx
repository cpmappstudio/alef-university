"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Users, Check, PencilIcon, Trash2Icon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

interface ClassDetailActionsProps {
  classId: Id<"classes">;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ClassDetailActions({
  classId,
  onEdit,
  onDelete,
}: ClassDetailActionsProps) {
  const t = useTranslations("admin.classes.detail");
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const [selectedStudents, setSelectedStudents] = React.useState<Set<string>>(
    new Set(),
  );
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Get all students
  const allStudents = useQuery(api.classes.getAllStudents, {});

  // Get students already enrolled in this class
  const classEnrollments = useQuery(api.classes.getClassEnrollments, {
    classId,
  });

  // Mutations
  const addStudent = useMutation(api.classes.addStudentToClass);
  const removeStudent = useMutation(api.classes.removeStudentFromClass);

  // Initialize selected students
  React.useEffect(() => {
    if (classEnrollments) {
      const currentStudentIds = new Set(
        classEnrollments.map((enrollment) => enrollment.studentId),
      );
      setSelectedStudents(currentStudentIds);
    }
  }, [classEnrollments]);

  // Get student display name
  const getStudentName = (student: Doc<"users">) => {
    return `${student.firstName} ${student.lastName}`;
  };

  // Get student code
  const getStudentCode = (student: Doc<"users">) => {
    return student.studentProfile?.studentCode || "—";
  };

  // Toggle student enrollment
  const toggleStudent = async (studentId: string) => {
    if (isUpdating) return;

    const isCurrentlyEnrolled = selectedStudents.has(studentId);
    setIsUpdating(true);

    try {
      if (isCurrentlyEnrolled) {
        // Remove student
        await removeStudent({
          classId,
          studentId: studentId as Id<"users">,
        });
        setSelectedStudents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
        toast.success(t("manageStudents.studentRemoved"));
      } else {
        // Add student
        await addStudent({
          classId,
          studentId: studentId as Id<"users">,
        });
        setSelectedStudents((prev) => {
          const newSet = new Set(prev);
          newSet.add(studentId);
          return newSet;
        });
        toast.success(t("manageStudents.studentAdded"));
      }
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error(t("manageStudents.error"), {
        description: t("manageStudents.errorDescription"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 my-4">
      {onEdit && (
        <Button size="sm" onClick={onEdit} className="cursor-pointer h-9">
          {t("edit")}
          <PencilIcon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="cursor-pointer h-9"
        >
          {t("delete")}
          <Trash2Icon className="h-4 w-4 md:ml-2" />
        </Button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="default" className="cursor-pointer">
            {t("manageStudentsButton")}
            <Users className="md:ml-2" />
            {selectedStudents.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedStudents.size}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t("manageStudents.searchPlaceholder")}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>{t("manageStudents.noStudents")}</CommandEmpty>
              <CommandGroup>
                {allStudents?.map((student) => {
                  const isEnrolled = selectedStudents.has(student._id);
                  return (
                    <CommandItem
                      key={student._id}
                      value={`${getStudentCode(student)} ${getStudentName(student)} ${student.email}`}
                      onSelect={() => toggleStudent(student._id)}
                      disabled={isUpdating}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isEnrolled ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {getStudentName(student)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getStudentCode(student)} • {student.email}
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
    </div>
  );
}
