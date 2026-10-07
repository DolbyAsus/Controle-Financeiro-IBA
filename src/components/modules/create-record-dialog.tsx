"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  buttonLabel: string;
  title: string;
  description?: string;
  disabled?: boolean;
  children: ReactNode;
};

export function CreateRecordDialog({
  buttonLabel,
  title,
  description = "Campos marcados com * são obrigatórios.",
  disabled = false,
  children,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="w-full sm:w-auto" disabled={disabled} />}>
        <Plus className="size-4" aria-hidden="true" />
        {buttonLabel}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
