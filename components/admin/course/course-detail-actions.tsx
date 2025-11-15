"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import ClassFormDialog from "./class-form-dialog";

interface CourseDetailActionsProps {
  courseId: Id<"courses">;
}

export default function CourseDetailActions({
  courseId,
}: CourseDetailActionsProps) {
  const t = useTranslations("admin.courses.detail");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  return (
    <div className="flex gap-2 my-4 ">
      <ClassFormDialog
        courseId={courseId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        trigger={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("createClass")}
          </Button>
        }
      />
    </div>
  );
}
