import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  FileVideo,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";

import { TranscriptionOptions } from "../types";


// ============================================================
// TYPES
// ============================================================

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;

  onUploadVideo: (
    file: File,
    options: TranscriptionOptions
  ) => Promise<void>;

  onTranscribeTextScript: (
    script: string,
    options: TranscriptionOptions
  ) => Promise<void>;

  isProcessing: boolean;
  processingMsg: string;
}

type UploadTab = "file" | "script";


// ============================================================
// CONSTANTS
// ============================================================

const MAX_FILE_SIZE =
  500 * 1024 * 1024; // 500 MB

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
];

const ACCEPTED_TYPES = [
  ...ACCEPTED_VIDEO_TYPES,
  ...ACCEPTED_AUDIO_TYPES,
];

const ACCEPT_ATTRIBUTE =
  [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/webm",
    "audio/ogg",
  ].join(",");


// ============================================================
// HELPERS
// ============================================================

function formatFileSize(
  bytes: number
): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024)
  );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 1)} ${
    units[index] || "GB"
  }`;
}


function isAcceptedFile(
  file: File
): boolean {
  return (
    ACCEPTED_TYPES.includes(
      file.type
    ) ||
    file.type.startsWith(
      "video/"
    ) ||
    file.type.startsWith(
      "audio/"
    )
  );
}


function getFileCategory(
  file: File
): "video" | "audio" {
  return file.type.startsWith(
    "audio/"
  )
    ? "audio"
    : "video";
}


function getExtension(
  filename: string
): string {
  const parts =
    filename.split(".");

  return parts.length > 1
    ? parts[
        parts.length - 1
      ].toUpperCase()
    : "FILE";
}


// ============================================================
// COMPONENT
// ============================================================

export const UploadModal: React.FC<
  UploadModalProps
> = ({
  isOpen,
  onClose,
  onUploadVideo,
  onTranscribeTextScript,
  isProcessing,
  processingMsg,
}) => {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const previewUrlRef =
    useRef<string | null>(null);


  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------

  const [activeTab, setActiveTab] =
    useState<UploadTab>("file");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [textScript, setTextScript] =
    useState("");

  const [isDragging, setIsDragging] =
    useState(false);

  const [error, setError] =
    useState("");

  const [options, setOptions] =
    useState<TranscriptionOptions>({
      language: "auto",
      removeFillerWords: true,
      correctGrammar: true,
      autoHighlightKeywords: true,
      autoAddEmojis: true,
      wordsPerChunk: 3,
    });


  // ==========================================================
  // CLEANUP
  // ==========================================================

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        null;
    }

    setPreviewUrl(null);
  }, []);


  const resetUpload = useCallback(() => {
    clearPreview();

    setSelectedFile(null);
    setTextScript("");
    setError("");
    setIsDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [clearPreview]);


  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }
    };
  }, []);


  useEffect(() => {
    if (!isOpen) {
      resetUpload();
    }
  }, [
    isOpen,
    resetUpload,
  ]);


  // ==========================================================
  // FILE VALIDATION
  // ==========================================================

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!isAcceptedFile(file)) {
        return "Unsupported file type. Please upload MP4, WebM, MOV, MKV, MP3, WAV, OGG, or another supported audio/video file.";
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        return `File is too large. Maximum supported size is ${formatFileSize(
          MAX_FILE_SIZE
        )}.`;
      }

      if (file.size === 0) {
        return "This file appears to be empty.";
      }

      return null;
    },
    []
  );


  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  const selectFile = useCallback(
    (file: File) => {
      setError("");

      const validationError =
        validateFile(file);

      if (validationError) {
        setSelectedFile(null);
        clearPreview();
        setError(
          validationError
        );
        return;
      }

      clearPreview();

      setSelectedFile(file);

      const objectUrl =
        URL.createObjectURL(file);

      previewUrlRef.current =
        objectUrl;

      setPreviewUrl(
        objectUrl
      );
    },
    [
      validateFile,
      clearPreview,
    ]
  );


  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    selectFile(file);
  };


  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    if (isProcessing) {
      return;
    }

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    selectFile(file);
  };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async () => {
      setError("");

      try {
        if (
          activeTab === "file"
        ) {
          if (!selectedFile) {
            setError(
              "Please select a video or audio file first."
            );

            return;
          }

          await onUploadVideo(
            selectedFile,
            options
          );

          return;
        }

        if (
          !textScript.trim()
        ) {
          setError(
            "Please enter your speech script."
          );

          return;
        }

        await onTranscribeTextScript(
          textScript.trim(),
          options
        );
      } catch (err) {
        console.error(
          "Caption generation failed:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while generating captions."
        );
      }
    };


  // ==========================================================
  // TAB SWITCH
  // ==========================================================

  const switchTab = (
    tab: UploadTab
  ) => {
    if (isProcessing) {
      return;
    }

    setError("");
    setActiveTab(tab);
  };


  // ==========================================================
  // SAMPLE SCRIPT
  // ==========================================================

  const useTenglishSample =
    () => {
      setTextScript(
        "Namaste friends! Eeroju mana video lo viral short reels ela create cheyalo chuddam. Super AI tools vadochu!"
      );

      setOptions(
        (previous) => ({
          ...previous,
          language:
            "Tenglish",
        })
      );

      setError("");
    };


  const useTeluguSample =
    () => {
      setTextScript(
        "నమస్కారం! ఈ రోజు వీడియోలో మనం AI క్యాప్షన్స్ మరియు వైరల్ రీల్స్ ఎలా చేయాలో చూద్దాం."
      );

      setOptions(
        (previous) => ({
          ...previous,
          language:
            "Telugu",
        })
      );

      setError("");
    };


  // ==========================================================
  // KEYBOARD
  // ==========================================================

  const handleKeyDown = (
    event: React.KeyboardEvent
  ) => {
    if (
      event.key === "Escape" &&
      !isProcessing
    ) {
      onClose();
    }
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  if (!isOpen) {
    return null;
  }


  const canSubmit =
    !isProcessing &&
    (
      activeTab === "file"
        ? Boolean(
            selectedFile
          )
        : Boolean(
            textScript.trim()
          )
    );


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >

      {/* ======================================================
          MODAL
      ====================================================== */}

      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">


        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>

            <div>
              <h2
                id="upload-modal-title"
                className="text-sm font-bold text-white"
              >
                AI Caption Studio
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Turn speech into viral captions
              </p>
            </div>

          </div>


          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>

        </div>


        {/* ====================================================
            BODY
        ==================================================== */}

        <div className="flex-1 overflow-y-auto p-5">

          <div className="space-y-5">


            {/* ==================================================
                TABS
            ================================================== */}

            <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-1">

              <button
                type="button"
                onClick={() =>
                  switchTab("file")
                }
                className={[
                  "rounded-lg py-2.5 text-xs font-bold transition",
                  activeTab === "file"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-500 hover:text-white",
                ].join(" ")}
              >
                Upload Media
              </button>


              <button
                type="button"
                onClick={() =>
                  switchTab("script")
                }
                className={[
                  "rounded-lg py-2.5 text-xs font-bold transition",
                  activeTab === "script"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-500 hover:text-white",
                ].join(" ")}
              >
                Paste Script
              </button>

            </div>


            {/* ==================================================
                FILE UPLOAD
            ================================================== */}

            {activeTab ===
              "file" && (
              <div className="space-y-3">

                <div
                  onDragEnter={(event) => {
                    event.preventDefault();

                    if (!isProcessing) {
                      setIsDragging(
                        true
                      );
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();

                    if (!isProcessing) {
                      setIsDragging(
                        true
                      );
                    }
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();

                    /*
                     * Only remove dragging state when
                     * leaving the actual drop zone.
                     */
                    if (
                      event.currentTarget ===
                      event.target
                    ) {
                      setIsDragging(
                        false
                      );
                    }
                  }}
                  onDrop={handleDrop}
                  onClick={() =>
                    !isProcessing &&
                    inputRef.current?.click()
                  }
                  className={[
                    "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-5 transition-all",
                    isDragging
                      ? "scale-[1.01] border-indigo-400 bg-indigo-500/10"
                      : selectedFile
                        ? "border-emerald-500/60 bg-emerald-500/5"
                        : "border-white/10 bg-white/[0.025] hover:border-indigo-500/60 hover:bg-indigo-500/[0.04]",
                    isProcessing
                      ? "cursor-not-allowed opacity-60"
                      : "",
                  ].join(" ")}
                >

                  <input
                    ref={inputRef}
                    type="file"
                    accept={
                      ACCEPT_ATTRIBUTE
                    }
                    onChange={
                      handleFileSelect
                    }
                    disabled={
                      isProcessing
                    }
                    className="hidden"
                  />


                  {selectedFile ? (
                    <div className="space-y-4">

                      {/* Preview */}

                      {getFileCategory(
                        selectedFile
                      ) === "video" &&
                      previewUrl ? (
                        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">

                          <video
                            src={
                              previewUrl
                            }
                            controls
                            muted
                            playsInline
                            className="max-h-64 w-full object-contain"
                          />

                        </div>
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-xl border border-white/10 bg-black/30">

                          <FileAudio className="h-12 w-12 text-indigo-400" />

                        </div>
                      )}


                      {/* File info */}

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">

                          {getFileCategory(
                            selectedFile
                          ) === "video" ? (
                            <FileVideo className="h-5 w-5" />
                          ) : (
                            <FileAudio className="h-5 w-5" />
                          )}

                        </div>


                        <div className="min-w-0 flex-1">

                          <p className="truncate text-xs font-bold text-white">
                            {
                              selectedFile.name
                            }
                          </p>

                          <p className="mt-1 text-[10px] text-emerald-400">
                            {formatFileSize(
                              selectedFile.size
                            )}
                            {" • "}
                            {
                              getExtension(
                                selectedFile.name
                              )
                            }
                            {" • Ready"}
                          </p>

                        </div>


                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            resetUpload();
                          }}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">

                      <div className={[
                        "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border transition",
                        isDragging
                          ? "border-indigo-400 bg-indigo-500/20"
                          : "border-white/10 bg-white/5",
                      ].join(" ")}>

                        <Upload
                          className={[
                            "h-7 w-7",
                            isDragging
                              ? "text-indigo-300"
                              : "text-indigo-400",
                          ].join(" ")}
                        />

                      </div>


                      <p className="text-sm font-bold text-white">
                        Drop your video here
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        or click to browse your device
                      </p>


                      <div className="mt-4 flex flex-wrap justify-center gap-1.5">

                        {[
                          "MP4",
                          "WebM",
                          "MOV",
                          "MKV",
                          "MP3",
                          "WAV",
                        ].map(
                          (format) => (
                            <span
                              key={
                                format
                              }
                              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-slate-500"
                            >
                              {format}
                            </span>
                          )
                        )}

                      </div>


                      <p className="mt-3 text-[10px] text-slate-600">
                        Maximum file size: 500 MB
                      </p>

                    </div>
                  )}

                </div>

              </div>
            )}


            {/* ==================================================
                SCRIPT
            ================================================== */}

            {activeTab ===
              "script" && (
              <div className="space-y-3">

                <div className="flex items-center justify-between">

                  <label className="text-xs font-bold text-slate-300">
                    Spoken Speech
                  </label>


                  <div className="flex gap-1.5">

                    <button
                      type="button"
                      onClick={
                        useTenglishSample
                      }
                      disabled={
                        isProcessing
                      }
                      className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[9px] font-bold text-indigo-300 transition hover:bg-indigo-500/20"
                    >
                      Tenglish Sample
                    </button>


                    <button
                      type="button"
                      onClick={
                        useTeluguSample
                      }
                      disabled={
                        isProcessing
                      }
                      className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-300 transition hover:bg-amber-500/20"
                    >
                      Telugu Sample
                    </button>

                  </div>

                </div>


                <textarea
                  rows={7}
                  value={
                    textScript
                  }
                  onChange={(event) =>
                    setTextScript(
                      event.target.value
                    )
                  }
                  disabled={
                    isProcessing
                  }
                  placeholder="Paste the exact speech spoken in your video..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-white outline-none transition placeholder:text-slate-700 focus:border-indigo-500/60"
                />


                <div className="flex justify-between text-[10px] text-slate-600">

                  <span>
                    {textScript.length.toLocaleString()} characters
                  </span>

                  <span>
                    AI will split the script into timed caption chunks
                  </span>

                </div>

              </div>
            )}


            {/* ==================================================
                AI SETTINGS
            ================================================== */}

            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">

              <div className="flex items-center gap-2">

                <Sparkles className="h-4 w-4 text-amber-400" />

                <div>

                  <h3 className="text-xs font-bold text-white">
                    AI Caption Settings
                  </h3>

                  <p className="text-[10px] text-slate-600">
                    Configure how your captions are generated
                  </p>

                </div>

              </div>


              {/* Language + words */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>

                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Language
                  </label>

                  <select
                    value={
                      options.language
                    }
                    disabled={
                      isProcessing
                    }
                    onChange={(event) =>
                      setOptions(
                        (
                          previous
                        ) => ({
                          ...previous,
                          language:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-indigo-500/60"
                  >
                    <option value="auto">
                      Auto Detect
                    </option>

                    <option value="Telugu">
                      Telugu
                    </option>

                    <option value="Tenglish">
                      Tenglish
                    </option>

                    <option value="Hinglish">
                      Hinglish
                    </option>

                    <option value="English">
                      English
                    </option>

                    <option value="Hindi">
                      Hindi
                    </option>

                    <option value="Tamil">
                      Tamil
                    </option>

                    <option value="Kannada">
                      Kannada
                    </option>

                    <option value="Malayalam">
                      Malayalam
                    </option>

                    <option value="Spanish">
                      Spanish
                    </option>

                    <option value="French">
                      French
                    </option>

                    <option value="German">
                      German
                    </option>

                    <option value="Portuguese">
                      Portuguese
                    </option>

                    <option value="Japanese">
                      Japanese
                    </option>

                  </select>

                </div>


                <div>

                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Words Per Caption
                  </label>

                  <select
                    value={
                      options.wordsPerChunk
                    }
                    disabled={
                      isProcessing
                    }
                    onChange={(event) =>
                      setOptions(
                        (
                          previous
                        ) => ({
                          ...previous,
                          wordsPerChunk:
                            Number(
                              event
                                .target
                                .value
                            ),
                        })
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-indigo-500/60"
                  >

                    <option value={1}>
                      1 — Word Pop
                    </option>

                    <option value={2}>
                      2 — Hormozi
                    </option>

                    <option value={3}>
                      3 — TikTok
                    </option>

                    <option value={4}>
                      4 — Readable
                    </option>

                  </select>

                </div>

              </div>


              {/* =================================================
                  CHECKBOXES
              ================================================= */}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                <AIOption
                  label="Remove filler words"
                  description="Remove um, uh, like..."
                  checked={
                    options.removeFillerWords
                  }
                  disabled={
                    isProcessing
                  }
                  onChange={(value) =>
                    setOptions(
                      (
                        previous
                      ) => ({
                        ...previous,
                        removeFillerWords:
                          value,
                      })
                    )
                  }
                />


                <AIOption
                  label="Highlight keywords"
                  description="Emphasize important words"
                  checked={
                    options.autoHighlightKeywords
                  }
                  disabled={
                    isProcessing
                  }
                  onChange={(value) =>
                    setOptions(
                      (
                        previous
                      ) => ({
                        ...previous,
                        autoHighlightKeywords:
                          value,
                      })
                    )
                  }
                />


                <AIOption
                  label="Add emojis"
                  description="Contextual emoji suggestions"
                  checked={
                    options.autoAddEmojis
                  }
                  disabled={
                    isProcessing
                  }
                  onChange={(value) =>
                    setOptions(
                      (
                        previous
                      ) => ({
                        ...previous,
                        autoAddEmojis:
                          value,
                      })
                    )
                  }
                />


                <AIOption
                  label="Fix grammar"
                  description="Clean grammar & punctuation"
                  checked={
                    options.correctGrammar
                  }
                  disabled={
                    isProcessing
                  }
                  onChange={(value) =>
                    setOptions(
                      (
                        previous
                      ) => ({
                        ...previous,
                        correctGrammar:
                          value,
                      })
                    )
                  }
                />

              </div>

            </section>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">

                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />

                <p className="text-xs leading-relaxed text-rose-300">
                  {error}
                </p>

              </div>
            )}


            {/* ==================================================
                PROCESSING
            ================================================== */}

            {isProcessing && (
              <div className="overflow-hidden rounded-2xl border border-indigo-500/30 bg-indigo-500/5">

                <div className="flex items-center gap-3 p-4">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">

                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />

                  </div>


                  <div className="min-w-0">

                    <p className="text-xs font-bold text-white">
                      {processingMsg ||
                        "Generating AI captions..."}
                    </p>

                    <p className="mt-1 text-[10px] text-indigo-300/70">
                      Extracting speech, timestamps,
                      keywords and caption styling.
                    </p>

                  </div>

                </div>


                <div className="h-0.5 overflow-hidden bg-indigo-950">

                  <div className="h-full w-1/3 animate-[loading_1.5s_ease-in-out_infinite] bg-indigo-500" />

                </div>

              </div>
            )}

          </div>

        </div>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-5 py-4">

          <div className="hidden text-[10px] text-slate-600 sm:block">

            AI-powered word-level captions

          </div>


          <div className="ml-auto flex items-center gap-2">

            <button
              type="button"
              onClick={onClose}
              disabled={
                isProcessing
              }
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>


            <button
              type="button"
              onClick={() =>
                void handleSubmit()
              }
              disabled={
                !canSubmit
              }
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >

              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Captions
                </>
              )}

            </button>

          </div>

        </div>

      </div>


      {/* ======================================================
          INLINE STYLES
      ====================================================== */}

      <style>
        {`
          @keyframes loading {
            0% {
              transform: translateX(-100%);
            }

            50% {
              transform: translateX(150%);
            }

            100% {
              transform: translateX(350%);
            }
          }
        `}
      </style>

    </div>
  );
};


// ============================================================
// AI OPTION COMPONENT
// ============================================================

interface AIOptionProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (
    value: boolean
  ) => void;
}


const AIOption: React.FC<
  AIOptionProps
> = ({
  label,
  description,
  checked,
  disabled,
  onChange,
}) => {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
        checked
          ? "border-indigo-500/30 bg-indigo-500/5"
          : "border-white/5 bg-black/20 hover:border-white/10",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "",
      ].join(" ")}
    >

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        className="h-4 w-4 rounded border-slate-700 bg-black text-indigo-600 focus:ring-0 focus:ring-offset-0"
      />


      <div className="min-w-0">

        <p className="text-[11px] font-bold text-slate-200">
          {label}
        </p>

        <p className="mt-0.5 text-[9px] text-slate-600">
          {description}
        </p>

      </div>

    </label>
  );
};


export default UploadModal;
