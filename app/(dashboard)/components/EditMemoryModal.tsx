"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface EditMemoryModalProps {
  isOpen: boolean;
  initialContent: string;
  initialDate: string;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (payload: { content: string; memoryDate: string }) => Promise<void> | void;
}

export default function EditMemoryModal({
  isOpen,
  initialContent,
  initialDate,
  isSaving = false,
  onClose,
  onSave,
}: EditMemoryModalProps) {
  const [content, setContent] = useState(initialContent);
  const [memoryDate, setMemoryDate] = useState(initialDate);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setMemoryDate(initialDate);
    }
  }, [isOpen, initialContent, initialDate]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    await onSave({ content: trimmedContent, memoryDate });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle>Edit memory</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Memory text</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Write your memory..."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Date</span>
            <Input
              type="date"
              value={memoryDate}
              onChange={(event) => setMemoryDate(event.target.value)}
              className="h-10 bg-gray-50 text-gray-900"
            />
          </label>
        </div>

        <DialogFooter className="mt-6 border-0 bg-transparent p-0">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !content.trim()}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
