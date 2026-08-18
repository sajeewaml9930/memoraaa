"use client";

import { useEffect, useRef, useState } from "react";
import { FileAudio, Mic, RotateCcw, Square, Upload, X } from "lucide-react";

const MAX_RECORDING_SECONDS = 300;

type AudioRecorderModalProps = {
  isOpen: boolean;
  isUploading: boolean;
  uploadProgress: number;
  onClose: () => void;
  onUpload: (file: File) => void;
};

function getSupportedAudioMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "audio/webm";
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function AudioRecorderModal({
  isOpen,
  isUploading,
  uploadProgress,
  onClose,
  onUpload,
}: AudioRecorderModalProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [isOpen, audioUrl]);

  useEffect(() => {
    if (!isRecording || elapsedSeconds < MAX_RECORDING_SECONDS) {
      return;
    }

    stopRecording();
  }, [elapsedSeconds, isRecording]);

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !window.MediaRecorder) {
      setError("This browser does not support voice recording.");
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const mimeType = getSupportedAudioMimeType();
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const normalizedMimeType = mimeType.split(";")[0].trim();
        const blob = new Blob(chunks, { type: normalizedMimeType || "audio/webm" });
        const fileName = `voice-message-${Date.now()}.${normalizedMimeType.includes("mp4") ? "m4a" : normalizedMimeType.includes("webm") ? "webm" : "mp3"}`;
        const nextFile = new File([blob], fileName, { type: normalizedMimeType || "audio/webm" });

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        setAudioFile(nextFile);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setElapsedSeconds(0);
      setAudioFile(null);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((currentSeconds) => currentSeconds + 1);
      }, 1000);
    } catch (error) {
      console.error("Voice recording error:", error);
      setError("Microphone access was denied or unavailable.");
    }
  };

  const handleUpload = () => {
    if (!audioFile) {
      return;
    }

    onUpload(audioFile);
    onClose();
  };

  const handleSelectAudioFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const normalizedMimeType = file.type.split(";")[0].trim().toLowerCase();
    if (!normalizedMimeType.startsWith("audio/")) {
      setError("Please choose a valid audio file.");
      event.target.value = "";
      return;
    }

    setAudioFile(new File([file], file.name, { type: normalizedMimeType }));
    setAudioUrl(URL.createObjectURL(file));
    setError(null);
    onUpload(file);
    onClose();
    event.target.value = "";
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">Voice message</p>
            <p className="text-sm text-gray-500">Record up to 5 minutes</p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close recorder"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-5 rounded-2xl bg-gray-50 p-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-2xl font-semibold text-gray-900">
            <Mic className={isRecording ? "text-red-500" : "text-gray-700"} size={22} />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <div className="mb-3 flex items-center justify-center gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-600"
              >
                <Mic size={16} />
                Start recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black"
              >
                <Square size={14} fill="currentColor" />
                Stop recording
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <FileAudio size={16} />
              Choose file
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleSelectAudioFile}
          />

          {audioUrl && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-left">
              <audio controls src={audioUrl} className="w-full" />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl);
                    }
                    setAudioFile(null);
                    setAudioUrl(null);
                    setElapsedSeconds(0);
                  }}
                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <RotateCcw size={14} />
                  Re-record
                </button>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!audioFile || isUploading}
                  className="ml-auto flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  <Upload size={14} />
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Uploading voice message</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
