"use client";

import * as React from "react";

type UseDialogStateOptions = {
  controlledOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialOpen?: boolean;
};

export function useDialogState({
  controlledOpen,
  onOpenChange,
  initialOpen = false,
}: UseDialogStateOptions) {
  const [internalOpen, setInternalOpen] = React.useState(initialOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpenHandler = onOpenChange ?? setInternalOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      setOpenHandler(nextOpen);
    },
    [setOpenHandler],
  );

  return { open, setOpen };
}
