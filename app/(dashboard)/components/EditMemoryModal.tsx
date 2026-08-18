"use client";

import { useEffect, useState } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit memory</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

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
            <input
              type="date"
              value={memoryDate}
              onChange={(event) => setMemoryDate(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !content.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
