"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  /** Accessible name. Rendered visually hidden; keep your own visible heading. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Classes for the dialog panel (width, padding, surface). */
  className?: string;
  /** Tailwind z-index class, so stacked modals keep their order. */
  z?: string;
  /** Bottom sheet on mobile, centred from `sm` up. */
  sheet?: boolean;
  /** When false, Escape and outside clicks do not close it. */
  dismissable?: boolean;
  overlayClassName?: string;
}

export function Modal({
  title,
  onClose,
  children,
  className,
  z = "z-[60]",
  sheet = false,
  dismissable = true,
  overlayClassName = "bg-black/60",
}: ModalProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && dismissable) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cn("fixed inset-0", overlayClassName, z)} />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 w-full max-w-md -translate-x-1/2 outline-none",
            sheet
              ? "bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
              : "bottom-4 w-[calc(100%-2rem)] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
            z,
            className,
          )}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
