"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Settings2Icon, Check } from "lucide-react";
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
import { CourseRemoveDialog } from "@/components/program/course-remove-dialog";

interface ProgramDetailActionsProps {
  programId: Id<"programs">;
}

export default function ProgramDetailActions({
  programId,
}: ProgramDetailActionsProps) {
  const t = useTranslations("admin.programs.detail");
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const [selectedCourses, setSelectedCourses] = React.useState<Set<string>>(
    new Set(),
  );
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false);
  const [courseToRemove, setCourseToRemove] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  // Get all courses
  const allCourses = useQuery(api.courses.getAllCourses, {});

  // Get courses already in this program
  const programCourses = useQuery(api.courses.getCoursesByProgram, {
    programId,
  });

  // Mutations
  const addCourse = useMutation(api.courses.addCourseToProgram);
  const removeCourse = useMutation(api.courses.removeCourseFromProgram);

  // Initialize selected courses
  React.useEffect(() => {
    if (programCourses) {
      const currentCourseIds = new Set(
        programCourses.map((course) => course._id),
      );
      setSelectedCourses(currentCourseIds);
    }
  }, [programCourses]);

  // Get course display name
  const getCourseName = (course: Doc<"courses">) => {
    if (locale === "es") {
      return course.nameEs || course.nameEn || "—";
    }
    return course.nameEn || course.nameEs || "—";
  };

  // Get course code
  const getCourseCode = (course: Doc<"courses">) => {
    if (locale === "es") {
      return course.codeEs || course.codeEn || "—";
    }
    return course.codeEn || course.codeEs || "—";
  };

  // Toggle course selection
  const toggleCourse = async (courseId: string) => {
    if (isUpdating) return;

    const isCurrentlySelected = selectedCourses.has(courseId);

    if (isCurrentlySelected) {
      // Show confirmation dialog before removing
      const course = allCourses?.find((c) => c._id === courseId);
      if (course) {
        setCourseToRemove({
          id: courseId,
          name: `${getCourseCode(course)} - ${getCourseName(course)}`,
        });
        setRemoveDialogOpen(true);
      }
    } else {
      // Add course directly (no confirmation needed)
      await handleAddCourse(courseId);
    }
  };

  // Handle adding a course
  const handleAddCourse = async (courseId: string) => {
    setIsUpdating(true);
    try {
      await addCourse({
        courseId: courseId as Id<"courses">,
        programId,
        isRequired: true,
        credits: 3, // Default credits - can be adjusted later
      });
      setSelectedCourses((prev) => {
        const newSet = new Set(prev);
        newSet.add(courseId);
        return newSet;
      });
      toast.success(t("manageCourses.courseAdded"));
    } catch (error) {
      console.error("Error adding course:", error);
      toast.error(t("manageCourses.error"), {
        description: t("manageCourses.errorDescription"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle removing a course (after confirmation)
  const handleRemoveCourse = async () => {
    if (!courseToRemove) return;

    setIsUpdating(true);
    try {
      await removeCourse({
        courseId: courseToRemove.id as Id<"courses">,
        programId,
      });
      setSelectedCourses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(courseToRemove.id);
        return newSet;
      });
      toast.success(t("manageCourses.courseRemoved"));
      setCourseToRemove(null);
    } catch (error) {
      console.error("Error removing course:", error);
      toast.error(t("manageCourses.error"), {
        description: t("manageCourses.errorDescription"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <CourseRemoveDialog
        courseName={courseToRemove?.name ?? ""}
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={handleRemoveCourse}
        isRemoving={isUpdating}
      />

      <div className="flex gap-2 my-4 ">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="default" className="cursor-pointer">
              {t("manageCoursesButton")}
              <Settings2Icon className="md:ml-2" />
              {selectedCourses.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedCourses.size}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={t("manageCourses.searchPlaceholder")}
                className="h-9"
              />
              <CommandList>
                <CommandEmpty>{t("manageCourses.noCourses")}</CommandEmpty>
                <CommandGroup>
                  {allCourses?.map((course) => {
                    const isSelected = selectedCourses.has(course._id);
                    return (
                      <CommandItem
                        key={course._id}
                        value={`${getCourseCode(course)} ${getCourseName(course)}`}
                        onSelect={() => toggleCourse(course._id)}
                        disabled={isUpdating}
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
                            {getCourseCode(course)} - {getCourseName(course)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {course.credits} {t("manageCourses.credits")}
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
    </>
  );
}
