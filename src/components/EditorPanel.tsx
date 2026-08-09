import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  AlignLeft,
  Clock,
  Download,
  FileText,
  Highlighter,
  Layers,
  Merge,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Smile,
  Sparkles,
  Split,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";

import {
  CaptionSegment,
  CaptionStyle,
  CaptionWord,
} from "../types";

import { DEFAULT_STYLE_PRESETS } from "../data/stylePresets";

import {
  downloadFile,
  formatTimestamp,
  generatePlainTranscript,
  generateSrt,
  generateVtt,
  rechunkSegments,
  shiftAllTimestamps,
} from "../utils/captionUtils";


// ============================================================
// TYPES
// ============================================================

interface EditorPanelProps {
  segments: CaptionSegment[];
  setSegments: React.Dispatch<
    React.SetStateAction<CaptionSegment[]>
  >;

  currentStyle: CaptionStyle;
  setCurrentStyle: React.Dispatch<
    React.SetStateAction<CaptionStyle>
  >;

  currentTime: number;
  onSeek: (time: number) => void;

  onAiEnhance: (
    action: string,
    options?: Record<string, unknown>
  ) => Promise<void>;

  isAiProcessing: boolean;

  onOpenExport: () => void;
}


// ============================================================
// CONSTANTS
// ============================================================

const MIN_WORD_DURATION = 0.05;
const DEFAULT_SEGMENT_DURATION = 2;
const SEGMENT_GAP = 0.2;

const FONT_WEIGHTS: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
};

const POSITION_DEFAULTS = {
  top: 12,
  center: 50,
  bottom: 18,
} as const;


// ============================================================
// HELPERS
// ============================================================

const roundTime = (value: number): number =>
  Number(Math.max(0, value).toFixed(2));


const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;


const wordsToText = (words: CaptionWord[]): string =>
  words
    .map((word) => word.word.trim())
    .filter(Boolean)
    .join(" ");


const createEvenWordTimings = (
  words: CaptionWord[],
  start: number,
  end: number
): CaptionWord[] => {
  if (!words.length) return [];

  const safeStart = roundTime(start);
  const safeEnd = Math.max(
    safeStart + MIN_WORD_DURATION,
    roundTime(end)
  );

  const duration =
    (safeEnd - safeStart) / words.length;

  return words.map((word, index) => ({
    ...word,
    start: roundTime(
      safeStart + index * duration
    ),
    end:
      index === words.length - 1
        ? safeEnd
        : roundTime(
            safeStart + (index + 1) * duration
          ),
  }));
};


const normalizeWordTimings = (
  words: CaptionWord[]
): CaptionWord[] => {
  if (!words.length) return [];

  const result = [...words].sort(
    (a, b) => a.start - b.start
  );

  return result.map((word, index) => {
    const next = result[index + 1];

    let start = Math.max(0, word.start);
    let end = Math.max(
      start + MIN_WORD_DURATION,
      word.end
    );

    if (next) {
      end = Math.min(end, next.start);
    }

    if (end <= start) {
      end = start + MIN_WORD_DURATION;
    }

    return {
      ...word,
      start: roundTime(start),
      end: roundTime(end),
    };
  });
};


// ============================================================
// COMPONENT
// ============================================================

export const EditorPanel: React.FC<
  EditorPanelProps
> = ({
  segments,
  setSegments,
  currentStyle,
  setCurrentStyle,
  currentTime,
  onSeek,
  onAiEnhance,
  isAiProcessing,
  onOpenExport,
}) => {
  const [activeTab, setActiveTab] = useState<
    "subtitles" | "styles" | "ai" | "export"
  >("subtitles");

  const [expandedSegId, setExpandedSegId] =
    useState<string | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [customAiPrompt, setCustomAiPrompt] =
    useState("");

  const [showBatchTools, setShowBatchTools] =
    useState(false);


  // ==========================================================
  // FILTERING
  // ==========================================================

  const filteredSegments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return segments;
    }

    return segments.filter((segment) =>
      segment.text
        .toLowerCase()
        .includes(query)
    );
  }, [segments, searchQuery]);


  // ==========================================================
  // SEGMENT TEXT EDIT
  // ==========================================================

  const handleSegmentTextChange = useCallback(
    (id: string, text: string) => {
      setSegments((previous) =>
        previous.map((segment) => {
          if (segment.id !== id) {
            return segment;
          }

          const newWords = text
            .trim()
            .split(/\s+/)
            .filter(Boolean);

          if (!newWords.length) {
            return {
              ...segment,
              text: "",
              words: [],
            };
          }

          const oldWords = segment.words ?? [];

          const words: CaptionWord[] =
            newWords.map((word, index) => {
              const oldWord = oldWords[index];

              return {
                id:
                  oldWord?.id ??
                  createId(`word-${id}`),

                word,

                start:
                  oldWord?.start ??
                  segment.start,

                end:
                  oldWord?.end ??
                  segment.end,

                isHighlight:
                  oldWord?.isHighlight,

                highlightColor:
                  oldWord?.highlightColor,

                emoji:
                  oldWord?.emoji,
              };
            });

          return {
            ...segment,
            text,
            words: createEvenWordTimings(
              words,
              segment.start,
              segment.end
            ),
          };
        })
      );
    },
    [setSegments]
  );


  // ==========================================================
  // WORD UPDATE
  // ==========================================================

  const handleWordChange = useCallback(
    (
      segmentId: string,
      wordId: string,
      updates: Partial<CaptionWord>
    ) => {
      setSegments((previous) =>
        previous.map((segment) => {
          if (segment.id !== segmentId) {
            return segment;
          }

          let updatedWords =
            segment.words.map((word) =>
              word.id === wordId
                ? { ...word, ...updates }
                : word
            );

          updatedWords =
            normalizeWordTimings(updatedWords);

          if (!updatedWords.length) {
            return segment;
          }

          return {
            ...segment,

            start:
              updatedWords[0].start,

            end:
              updatedWords[
                updatedWords.length - 1
              ].end,

            text:
              wordsToText(updatedWords),

            words: updatedWords,
          };
        })
      );
    },
    [setSegments]
  );


  // ==========================================================
  // DELETE WORD
  // ==========================================================

  const handleDeleteWord = useCallback(
    (
      segmentId: string,
      wordId: string
    ) => {
      setSegments((previous) =>
        previous.map((segment) => {
          if (segment.id !== segmentId) {
            return segment;
          }

          const remaining =
            segment.words.filter(
              (word) => word.id !== wordId
            );

          if (!remaining.length) {
            return {
              ...segment,
              text: "",
              words: [],
            };
          }

          return {
            ...segment,

            start:
              remaining[0].start,

            end:
              remaining[remaining.length - 1]
                .end,

            text:
              wordsToText(remaining),

            words: remaining,
          };
        })
      );
    },
    [setSegments]
  );


  // ==========================================================
  // ADD WORD
  // ==========================================================

  const handleAddWordAfter = useCallback(
    (
      segmentId: string,
      wordId: string
    ) => {
      setSegments((previous) =>
        previous.map((segment) => {
          if (segment.id !== segmentId) {
            return segment;
          }

          const index =
            segment.words.findIndex(
              (word) => word.id === wordId
            );

          if (index === -1) {
            return segment;
          }

          const words = [...segment.words];

          const current = words[index];
          const next = words[index + 1];

          const availableEnd = next
            ? next.start
            : current.end + 0.4;

          const availableDuration =
            availableEnd - current.end;

          const newStart =
            current.end +
            Math.min(
              0.02,
              Math.max(
                0,
                availableDuration / 3
              )
            );

          const newEnd =
            next?.start ??
            newStart + 0.3;

          const newWord: CaptionWord = {
            id: createId("inserted-word"),
            word: "New",
            start: roundTime(newStart),
            end: roundTime(
              Math.max(
                newStart + MIN_WORD_DURATION,
                newEnd
              )
            ),
          };

          words.splice(index + 1, 0, newWord);

          return {
            ...segment,
            text: wordsToText(words),
            words,
          };
        })
      );
    },
    [setSegments]
  );


  // ==========================================================
  // AUTO SYNC WORDS
  // ==========================================================

  const handleAutoDistributeWords =
    useCallback(
      (segmentId: string) => {
        setSegments((previous) =>
          previous.map((segment) => {
            if (
              segment.id !== segmentId ||
              !segment.words.length
            ) {
              return segment;
            }

            return {
              ...segment,
              words: createEvenWordTimings(
                segment.words,
                segment.start,
                segment.end
              ),
            };
          })
        );
      },
      [setSegments]
    );


  // ==========================================================
  // SPLIT SEGMENT
  // ==========================================================

  const handleSplitSegment = useCallback(
    (
      segmentId: string,
      splitIndex: number
    ) => {
      setSegments((previous) => {
        const index =
          previous.findIndex(
            (segment) =>
              segment.id === segmentId
          );

        if (index === -1) {
          return previous;
        }

        const segment = previous[index];

        if (
          splitIndex <= 0 ||
          splitIndex >= segment.words.length
        ) {
          return previous;
        }

        const firstWords =
          segment.words.slice(0, splitIndex);

        const secondWords =
          segment.words.slice(splitIndex);

        if (
          !firstWords.length ||
          !secondWords.length
        ) {
          return previous;
        }

        const firstSegment: CaptionSegment = {
          id: createId("segment"),
          start: firstWords[0].start,
          end:
            firstWords[
              firstWords.length - 1
            ].end,
          text: wordsToText(firstWords),
          words: firstWords,
        };

        const secondSegment: CaptionSegment = {
          id: createId("segment"),
          start: secondWords[0].start,
          end:
            secondWords[
              secondWords.length - 1
            ].end,
          text: wordsToText(secondWords),
          words: secondWords,
        };

        const result = [...previous];

        result.splice(
          index,
          1,
          firstSegment,
          secondSegment
        );

        return result;
      });
    },
    [setSegments]
  );


  // ==========================================================
  // MERGE SEGMENTS
  // ==========================================================

  const handleMergeNext = useCallback(
    (segmentId: string) => {
      setSegments((previous) => {
        const index =
          previous.findIndex(
            (segment) =>
              segment.id === segmentId
          );

        if (
          index === -1 ||
          index >= previous.length - 1
        ) {
          return previous;
        }

        const first = previous[index];
        const second = previous[index + 1];

        const words = [
          ...first.words,
          ...second.words,
        ];

        const merged: CaptionSegment = {
          id: createId("merged-segment"),
          start: Math.min(
            first.start,
            second.start
          ),
          end: Math.max(
            first.end,
            second.end
          ),
          text: wordsToText(words),
          words,
        };

        const result = [...previous];

        result.splice(
          index,
          2,
          merged
        );

        return result;
      });
    },
    [setSegments]
  );


  // ==========================================================
  // DELETE SEGMENT
  // ==========================================================

  const handleDeleteSegment = useCallback(
    (segmentId: string) => {
      setSegments((previous) =>
        previous.filter(
          (segment) =>
            segment.id !== segmentId
        )
      );

      setExpandedSegId((current) =>
        current === segmentId
          ? null
          : current
      );
    },
    [setSegments]
  );


  // ==========================================================
  // ADD SEGMENT
  // ==========================================================

  const handleAddSegment = useCallback(() => {
    setSegments((previous) => {
      const last =
        previous[previous.length - 1];

      const start = last
        ? roundTime(
            last.end + SEGMENT_GAP
          )
        : 0;

      const end = roundTime(
        start + DEFAULT_SEGMENT_DURATION
      );

      const words: CaptionWord[] = [
        {
          id: createId("word"),
          word: "New",
          start,
          end: roundTime(start + 0.6),
        },
        {
          id: createId("word"),
          word: "Caption",
          start: roundTime(start + 0.6),
          end: roundTime(start + 1.3),
          isHighlight: true,
          highlightColor: "#FFE600",
          emoji: "✨",
        },
        {
          id: createId("word"),
          word: "Text",
          start: roundTime(start + 1.3),
          end,
        },
      ];

      const segment: CaptionSegment = {
        id: createId("segment"),
        start,
        end,
        text: "New Caption Text",
        words,
      };

      return [
        ...previous,
        segment,
      ];
    });
  }, [setSegments]);


  // ==========================================================
  // RECHUNK
  // ==========================================================

  const handleRechunk = useCallback(
    (wordsPerChunk: number) => {
      setCurrentStyle((previous) => ({
        ...previous,
        wordsPerChunk,
      }));

      setSegments(
        rechunkSegments(
          segments,
          wordsPerChunk
        )
      );
    },
    [
      segments,
      setSegments,
      setCurrentStyle,
    ]
  );


  // ==========================================================
  // SHIFT TIMESTAMPS
  // ==========================================================

  const handleShiftTimestamps =
    useCallback(
      (offset: number) => {
        setSegments(
          shiftAllTimestamps(
            segments,
            offset
          )
        );
      },
      [segments, setSegments]
    );


  // ==========================================================
  // CASE TRANSFORMATION
  // ==========================================================

  const handleTransformCase =
    useCallback(
      (
        mode:
          | "upper"
          | "lower"
          | "title"
      ) => {
        setSegments((previous) =>
          previous.map((segment) => {
            const words =
              segment.words.map(
                (word) => {
                  let value =
                    word.word;

                  if (mode === "upper") {
                    value =
                      value.toUpperCase();
                  }

                  if (mode === "lower") {
                    value =
                      value.toLowerCase();
                  }

                  if (mode === "title") {
                    value =
                      value
                        .charAt(0)
                        .toUpperCase() +
                      value
                        .slice(1)
                        .toLowerCase();
                  }

                  return {
                    ...word,
                    word: value,
                  };
                }
              );

            return {
              ...segment,
              words,
              text: wordsToText(words),
            };
          })
        );
      },
      [setSegments]
    );


  // ==========================================================
  // UPDATE STYLE
  // ==========================================================

  const updateStyle =
    useCallback(
      <K extends keyof CaptionStyle>(
        key: K,
        value: CaptionStyle[K]
      ) => {
        setCurrentStyle((previous) => ({
          ...previous,
          [key]: value,
        }));
      },
      [setCurrentStyle]
    );


  // ==========================================================
  // AI
  // ==========================================================

  const runAiAction = useCallback(
    async (action: string) => {
      if (
        isAiProcessing ||
        !segments.length
      ) {
        return;
      }

      await onAiEnhance(action);
    },
    [
      isAiProcessing,
      segments.length,
      onAiEnhance,
    ]
  );


  const runCustomAi = useCallback(
    async () => {
      const prompt =
        customAiPrompt.trim();

      if (
        !prompt ||
        isAiProcessing ||
        !segments.length
      ) {
        return;
      }

      await onAiEnhance(
        "custom_prompt",
        { prompt }
      );
    },
    [
      customAiPrompt,
      isAiProcessing,
      segments.length,
      onAiEnhance,
    ]
  );


  // ==========================================================
  // TAB BUTTON
  // ==========================================================

  const tabs = [
    {
      id: "subtitles" as const,
      label: `Captions (${segments.length})`,
      icon: FileText,
    },
    {
      id: "styles" as const,
      label: "Style & Presets",
      icon: Palette,
    },
    {
      id: "ai" as const,
      label: "AI Magic",
      icon: Sparkles,
    },
    {
      id: "export" as const,
      label: "Export",
      icon: Download,
    },
  ];


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#09090b] shadow-sm">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="border-b border-zinc-800 bg-[#09090b] p-2">
        <div className="flex w-full gap-1.5">

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={[
                  "flex flex-1 items-center",
                  "justify-center gap-1.5",
                  "rounded-lg px-3 py-1.5",
                  "text-xs font-medium",
                  "transition-all",
                  "cursor-pointer",
                  active
                    ? "border border-zinc-700 bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />

                <span className="hidden sm:inline">
                  {tab.label}
                </span>
              </button>
            );
          })}

        </div>
      </div>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">


        {/* ====================================================
            SUBTITLES
        ==================================================== */}

        {activeTab === "subtitles" && (
          <div className="space-y-3">

            {/* Search / Actions */}

            <div className="space-y-2">

              <div className="flex gap-2">

                <div className="relative flex-1">

                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                    placeholder="Search captions..."
                    className="w-full rounded-lg border border-zinc-800 bg-[#020203] py-1.5 pl-8 pr-3 text-xs text-white outline-none transition focus:border-lime-500"
                  />

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setShowBatchTools(
                      (value) => !value
                    )
                  }
                  className={[
                    "flex items-center gap-1",
                    "rounded-lg border px-2.5 py-1.5",
                    "text-xs font-medium",
                    "transition-all",
                    showBatchTools
                      ? "border-zinc-700 bg-zinc-800 text-white"
                      : "border-zinc-800 bg-[#020203] text-zinc-400 hover:text-white",
                  ].join(" ")}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Batch
                </button>


                <button
                  type="button"
                  onClick={handleAddSegment}
                  className="flex items-center gap-1 rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-lime-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>

              </div>


              {/* Batch Tools */}

              {showBatchTools && (
                <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">

                  {/* Timestamp */}

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <span className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      Shift Sync
                    </span>

                    <div className="flex gap-1">
                      {[-0.5, -0.1, 0.1, 0.5].map(
                        (value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              handleShiftTimestamps(
                                value
                              )
                            }
                            className="rounded bg-zinc-800 px-2 py-1 font-mono text-[11px] text-zinc-200 transition hover:bg-zinc-700"
                          >
                            {value > 0
                              ? `+${value}s`
                              : `${value}s`}
                          </button>
                        )
                      )}
                    </div>

                  </div>


                  {/* Words */}

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <span className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                      <Layers className="h-3.5 w-3.5 text-emerald-400" />
                      Words / Line
                    </span>

                    <div className="flex gap-1">

                      {[1, 2, 3, 4, 5].map(
                        (number) => (
                          <button
                            key={number}
                            type="button"
                            onClick={() =>
                              handleRechunk(
                                number
                              )
                            }
                            className={[
                              "rounded px-2 py-1",
                              "font-mono text-[11px]",
                              currentStyle.wordsPerChunk ===
                              number
                                ? "bg-lime-500 font-bold text-black"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
                            ].join(" ")}
                          >
                            {number}
                          </button>
                        )
                      )}

                    </div>

                  </div>


                  {/* Case */}

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <span className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                      <Type className="h-3.5 w-3.5 text-indigo-400" />
                      Text Case
                    </span>

                    <div className="flex gap-1">

                      <button
                        type="button"
                        onClick={() =>
                          handleTransformCase(
                            "upper"
                          )
                        }
                        className="rounded bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-200 hover:bg-zinc-700"
                      >
                        UPPER
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleTransformCase(
                            "title"
                          )
                        }
                        className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200 hover:bg-zinc-700"
                      >
                        Title
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleTransformCase(
                            "lower"
                          )
                        }
                        className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200 hover:bg-zinc-700"
                      >
                        lower
                      </button>

                    </div>

                  </div>

                </div>
              )}

            </div>


            {/* Empty */}

            {!filteredSegments.length && (
              <div className="py-16 text-center text-zinc-500">

                <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />

                <p className="font-semibold text-zinc-300">
                  No Captions Found
                </p>

                <p className="mt-1 text-xs">
                  Try another search or add a caption.
                </p>

              </div>
            )}


            {/* Caption List */}

            <div className="space-y-3">

              {filteredSegments.map(
                (segment, filteredIndex) => {
                  const active =
                    currentTime >=
                      segment.start - 0.05 &&
                    currentTime <=
                      segment.end + 0.15;

                  const expanded =
                    expandedSegId ===
                    segment.id;

                  const originalIndex =
                    segments.findIndex(
                      (item) =>
                        item.id ===
                        segment.id
                    );

                  return (
                    <div
                      key={segment.id}
                      className={[
                        "rounded-lg border p-3",
                        "transition-all",
                        active
                          ? "border-lime-500/60 bg-zinc-900 ring-1 ring-lime-500/20"
                          : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80",
                      ].join(" ")}
                    >

                      {/* Header */}

                      <div className="mb-2 flex items-center justify-between gap-2">

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              onSeek(
                                segment.start
                              )
                            }
                            className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300 transition hover:bg-lime-500 hover:text-black"
                          >
                            <Play className="h-2.5 w-2.5 fill-current" />

                            {formatTimestamp(
                              segment.start,
                              "display"
                            )}

                            {" – "}

                            {formatTimestamp(
                              segment.end,
                              "display"
                            )}
                          </button>

                          <span className="text-[10px] text-zinc-500">
                            #
                            {originalIndex >= 0
                              ? originalIndex + 1
                              : filteredIndex + 1}
                          </span>

                        </div>


                        <div className="flex items-center gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSegId(
                                expanded
                                  ? null
                                  : segment.id
                              )
                            }
                            className={[
                              "rounded px-2 py-0.5",
                              "border text-[10px]",
                              expanded
                                ? "border-lime-500 bg-lime-500 font-bold text-black"
                                : "border-zinc-700 text-zinc-400 hover:text-white",
                            ].join(" ")}
                          >
                            {expanded
                              ? "Hide Words"
                              : `Words (${segment.words.length})`}
                          </button>

                          <button
                            type="button"
                            disabled={
                              originalIndex ===
                              segments.length - 1
                            }
                            onClick={() =>
                              handleMergeNext(
                                segment.id
                              )
                            }
                            className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-lime-400 disabled:opacity-30"
                            title="Merge with next"
                          >
                            <Merge className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSegment(
                                segment.id
                              )
                            }
                            className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-400"
                            title="Delete caption"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                        </div>

                      </div>


                      {/* Text */}

                      <textarea
                        value={segment.text}
                        onChange={(event) =>
                          handleSegmentTextChange(
                            segment.id,
                            event.target.value
                          )
                        }
                        rows={2}
                        spellCheck
                        className="w-full resize-none rounded-lg border border-white/10 bg-[#020203] p-2.5 text-sm font-medium leading-relaxed text-zinc-100 outline-none transition focus:border-lime-500"
                      />


                      {/* WORD EDITOR */}

                      {expanded && (
                        <div className="mt-3 space-y-2.5 border-t border-white/10 pt-3">

                          <div className="flex items-center justify-between">

                            <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-300">
                              <AlignLeft className="h-3.5 w-3.5 text-lime-500" />
                              Word Timeline
                              {" "}
                              ({segment.words.length})
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleAutoDistributeWords(
                                  segment.id
                                )
                              }
                              className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-lime-500 hover:text-black"
                            >
                              Auto-Sync
                            </button>

                          </div>


                          {segment.words.map(
                            (word, wordIndex) => {
                              const wordActive =
                                currentTime >=
                                  word.start -
                                    0.04 &&
                                currentTime <=
                                  word.end +
                                    0.04;

                              return (
                                <div
                                  key={
                                    word.id ??
                                    wordIndex
                                  }
                                  className={[
                                    "rounded-lg border p-2",
                                    "transition-all",
                                    wordActive
                                      ? "border-lime-500/80 bg-zinc-900 ring-1 ring-lime-500/30"
                                      : "border-white/10 bg-[#020203]",
                                  ].join(" ")}
                                >

                                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center">

                                    {/* Word */}

                                    <div className="flex min-w-0 flex-1 items-center gap-1.5">

                                      <button
                                        type="button"
                                        onClick={() =>
                                          onSeek(
                                            word.start
                                          )
                                        }
                                        className="shrink-0 rounded bg-zinc-800 p-1 text-zinc-400 hover:bg-lime-500 hover:text-black"
                                      >
                                        <Play className="h-2.5 w-2.5 fill-current" />
                                      </button>

                                      <input
                                        type="text"
                                        value={word.word}
                                        onChange={(
                                          event
                                        ) =>
                                          handleWordChange(
                                            segment.id,
                                            word.id,
                                            {
                                              word: event
                                                .target
                                                .value,
                                            }
                                          )
                                        }
                                        className="w-full rounded border border-white/10 bg-black px-2 py-1 text-xs font-bold text-white outline-none focus:border-lime-500"
                                      />

                                    </div>


                                    {/* Timing */}

                                    <div className="flex items-center gap-1 font-mono text-[10px]">

                                      <span className="text-zinc-500">
                                        In
                                      </span>

                                      <input
                                        type="number"
                                        min={0}
                                        step={0.05}
                                        value={word.start}
                                        onChange={(
                                          event
                                        ) =>
                                          handleWordChange(
                                            segment.id,
                                            word.id,
                                            {
                                              start:
                                                Math.max(
                                                  0,
                                                  Number(
                                                    event
                                                      .target
                                                      .value
                                                  )
                                                ),
                                            }
                                          )
                                        }
                                        className="w-16 rounded border border-white/10 bg-black px-1 py-0.5 text-center text-zinc-200 outline-none focus:border-lime-500"
                                      />

                                      <span className="text-zinc-500">
                                        Out
                                      </span>

                                      <input
                                        type="number"
                                        min={0}
                                        step={0.05}
                                        value={word.end}
                                        onChange={(
                                          event
                                        ) =>
                                          handleWordChange(
                                            segment.id,
                                            word.id,
                                            {
                                              end:
                                                Math.max(
                                                  0,
                                                  Number(
                                                    event
                                                      .target
                                                      .value
                                                  )
                                                ),
                                            }
                                          )
                                        }
                                        className="w-16 rounded border border-white/10 bg-black px-1 py-0.5 text-center text-zinc-200 outline-none focus:border-lime-500"
                                      />

                                    </div>


                                    {/* Controls */}

                                    <div className="flex items-center justify-end gap-1.5">

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleWordChange(
                                            segment.id,
                                            word.id,
                                            {
                                              isHighlight:
                                                !word.isHighlight,
                                            }
                                          )
                                        }
                                        className={[
                                          "rounded px-2 py-0.5",
                                          "text-[10px] font-bold",
                                          word.isHighlight
                                            ? "bg-lime-500 text-black"
                                            : "bg-white/10 text-zinc-400 hover:bg-white/20",
                                        ].join(" ")}
                                      >
                                        Highlight
                                      </button>


                                      {word.isHighlight && (
                                        <input
                                          type="color"
                                          value={
                                            word.highlightColor ??
                                            "#FFE600"
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            handleWordChange(
                                              segment.id,
                                              word.id,
                                              {
                                                highlightColor:
                                                  event
                                                    .target
                                                    .value,
                                              }
                                            )
                                          }
                                          className="h-6 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
                                        />
                                      )}


                                      <input
                                        type="text"
                                        maxLength={2}
                                        placeholder="🔥"
                                        value={
                                          word.emoji ??
                                          ""
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          handleWordChange(
                                            segment.id,
                                            word.id,
                                            {
                                              emoji:
                                                event
                                                  .target
                                                  .value,
                                            }
                                          )
                                        }
                                        className="w-9 rounded border border-white/10 bg-black py-0.5 text-center text-xs outline-none focus:border-lime-500"
                                      />


                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAddWordAfter(
                                            segment.id,
                                            word.id
                                          )
                                        }
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-lime-400"
                                        title="Add word"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>


                                      {wordIndex >
                                        0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSplitSegment(
                                              segment.id,
                                              wordIndex
                                            )
                                          }
                                          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
                                          title="Split caption"
                                        >
                                          <Split className="h-3.5 w-3.5" />
                                        </button>
                                      )}


                                      <button
                                        type="button"
                                        disabled={
                                          segment
                                            .words
                                            .length <=
                                          1
                                        }
                                        onClick={() =>
                                          handleDeleteWord(
                                            segment.id,
                                            word.id
                                          )
                                        }
                                        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-30"
                                        title="Delete word"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>

                                    </div>

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          </div>
        )}


        {/* ====================================================
            STYLES
        ==================================================== */}

        {activeTab === "styles" && (
          <div className="space-y-6">

            <div>

              <div className="mb-3 flex items-center justify-between">

                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Caption Styles
                </h3>

                <span className="text-[10px] text-zinc-500">
                  Click to apply
                </span>

              </div>


              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {DEFAULT_STYLE_PRESETS.map(
                  (preset) => {
                    const selected =
                      currentStyle.id ===
                      preset.id;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setCurrentStyle(
                            preset
                          )
                        }
                        className={[
                          "rounded-2xl border p-3",
                          "text-left transition-all",
                          selected
                            ? "border-indigo-500 bg-indigo-950/50 ring-2 ring-indigo-500/30"
                            : "border-white/10 bg-[#08080c] hover:border-indigo-500/50",
                        ].join(" ")}
                      >

                        <div className="mb-2 flex items-center justify-between">

                          <span className="text-xs font-bold text-white">
                            {preset.name}
                          </span>

                          {selected && (
                            <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[8px] font-bold uppercase text-white">
                              Active
                            </span>
                          )}

                        </div>


                        <div
                          className="flex h-20 items-center justify-center overflow-hidden rounded-xl border border-white/10"
                          style={{
                            background:
                              preset.backgroundColor ===
                              "transparent"
                                ? "#111113"
                                : preset.backgroundColor,
                          }}
                        >

                          <div className="flex items-center gap-1.5">

                            {[
                              "This",
                              "Viral",
                              "Style",
                            ].map(
                              (
                                word,
                                index
                              ) => (
                                <span
                                  key={word}
                                  style={{
                                    fontFamily:
                                      preset.fontFamily,
                                    fontSize: 14,
                                    fontWeight:
                                      FONT_WEIGHTS[
                                        preset
                                          .fontWeight
                                      ] ??
                                      700,
                                    color:
                                      index ===
                                      1
                                        ? preset.highlightColor ??
                                          "#FFE600"
                                        : preset.textColor,
                                    textTransform:
                                      preset.textTransform as React.CSSProperties["textTransform"],
                                  }}
                                >
                                  {word}

                                  {index ===
                                    1 &&
                                    preset.showEmojis &&
                                    " 🔥"}
                                </span>
                              )
                            )}

                          </div>

                        </div>


                        <div className="mt-2 flex items-center justify-between gap-2">

                          <p className="line-clamp-1 text-[10px] text-zinc-500">
                            {preset.description}
                          </p>

                          <span className="shrink-0 text-[9px] text-indigo-400">
                            {preset.animation}
                          </span>

                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* CUSTOMIZATION */}

            <div className="border-t border-zinc-800 pt-5">

              <h3 className="mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                Fine-Tune Style
              </h3>


              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Font */}

                <label className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Font Family
                  </span>

                  <select
                    value={
                      currentStyle.fontFamily
                    }
                    onChange={(event) =>
                      updateStyle(
                        "fontFamily",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-slate-950 p-2 text-zinc-200 outline-none"
                  >
                    <option value="Impact, sans-serif">
                      Impact
                    </option>

                    <option value="Arial Black, sans-serif">
                      Arial Black
                    </option>

                    <option value="Plus Jakarta Sans, sans-serif">
                      Plus Jakarta Sans
                    </option>

                    <option value="Trebuchet MS, sans-serif">
                      Trebuchet MS
                    </option>

                    <option value="system-ui, sans-serif">
                      System Sans
                    </option>
                  </select>
                </label>


                {/* Font Size */}

                <label className="text-xs">
                  <div className="mb-1 flex justify-between text-zinc-400">
                    <span>Font Size</span>
                    <span>
                      {currentStyle.fontSize}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min={18}
                    max={64}
                    value={
                      currentStyle.fontSize
                    }
                    onChange={(event) =>
                      updateStyle(
                        "fontSize",
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full accent-indigo-500"
                  />
                </label>


                {/* Words */}

                <div className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Words Per Line
                  </span>

                  <div className="flex rounded-lg border border-zinc-800 bg-slate-950 p-1">

                    {[1, 2, 3, 4, 5].map(
                      (number) => (
                        <button
                          key={number}
                          type="button"
                          onClick={() =>
                            handleRechunk(
                              number
                            )
                          }
                          className={[
                            "flex-1 rounded py-1",
                            currentStyle.wordsPerChunk ===
                            number
                              ? "bg-indigo-600 text-white"
                              : "text-zinc-400 hover:text-white",
                          ].join(" ")}
                        >
                          {number}
                        </button>
                      )
                    )}

                  </div>
                </div>


                {/* Transform */}

                <label className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Text Case
                  </span>

                  <select
                    value={
                      currentStyle.textTransform
                    }
                    onChange={(event) =>
                      updateStyle(
                        "textTransform",
                        event.target.value as CaptionStyle["textTransform"]
                      )
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-slate-950 p-2 text-zinc-200 outline-none"
                  >
                    <option value="uppercase">
                      UPPERCASE
                    </option>
                    <option value="capitalize">
                      Capitalize
                    </option>
                    <option value="lowercase">
                      lowercase
                    </option>
                    <option value="none">
                      Original
                    </option>
                  </select>
                </label>


                {/* Position */}

                <div className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Position
                  </span>

                  <div className="flex rounded-lg border border-zinc-800 bg-slate-950 p-1">

                    {(
                      [
                        "top",
                        "center",
                        "bottom",
                      ] as const
                    ).map((position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() =>
                          setCurrentStyle(
                            (previous) => ({
                              ...previous,
                              position,
                              verticalOffset:
                                POSITION_DEFAULTS[
                                  position
                                ],
                            })
                          )
                        }
                        className={[
                          "flex-1 rounded py-1 capitalize",
                          currentStyle.position ===
                          position
                            ? "bg-lime-500 font-bold text-black"
                            : "text-zinc-400 hover:text-white",
                        ].join(" ")}
                      >
                        {position}
                      </button>
                    ))}

                  </div>
                </div>


                {/* Offset */}

                <label className="text-xs">
                  <div className="mb-1 flex justify-between text-zinc-400">
                    <span>Vertical Offset</span>

                    <span className="font-mono text-lime-500">
                      {currentStyle.verticalOffset ??
                        POSITION_DEFAULTS[
                          currentStyle.position
                        ]}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={2}
                    max={88}
                    value={
                      currentStyle.verticalOffset ??
                      POSITION_DEFAULTS[
                        currentStyle.position
                      ]
                    }
                    onChange={(event) =>
                      updateStyle(
                        "verticalOffset",
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full accent-lime-500"
                  />
                </label>


                {/* Animation */}

                <label className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Active Word Animation
                  </span>

                  <select
                    value={
                      currentStyle.animation
                    }
                    onChange={(event) =>
                      updateStyle(
                        "animation",
                        event.target.value as CaptionStyle["animation"]
                      )
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-slate-950 p-2 text-zinc-200 outline-none"
                  >
                    <option value="bounce">
                      Bounce
                    </option>
                    <option value="pop">
                      Pop
                    </option>
                    <option value="highlight">
                      Highlight Box
                    </option>
                    <option value="fade">
                      Fade
                    </option>
                    <option value="none">
                      Static
                    </option>
                  </select>
                </label>


                {/* Text Color */}

                <label className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Text Color
                  </span>

                  <div className="flex gap-2">

                    <input
                      type="color"
                      value={
                        currentStyle.textColor
                      }
                      onChange={(event) =>
                        updateStyle(
                          "textColor",
                          event.target.value
                        )
                      }
                      className="h-8 w-8 cursor-pointer rounded"
                    />

                    <input
                      type="text"
                      value={
                        currentStyle.textColor
                      }
                      onChange={(event) =>
                        updateStyle(
                          "textColor",
                          event.target.value
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-slate-950 px-2 text-white"
                    />

                  </div>
                </label>


                {/* Highlight */}

                <label className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Highlight Color
                  </span>

                  <div className="flex gap-2">

                    <input
                      type="color"
                      value={
                        currentStyle.highlightColor
                      }
                      onChange={(event) =>
                        updateStyle(
                          "highlightColor",
                          event.target.value
                        )
                      }
                      className="h-8 w-8 cursor-pointer rounded"
                    />

                    <input
                      type="text"
                      value={
                        currentStyle.highlightColor
                      }
                      onChange={(event) =>
                        updateStyle(
                          "highlightColor",
                          event.target.value
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-slate-950 px-2 text-white"
                    />

                  </div>
                </label>


                {/* Stroke */}

                <label className="text-xs">
                  <div className="mb-1 flex justify-between text-zinc-400">
                    <span>Stroke Width</span>
                    <span>
                      {currentStyle.strokeWidth}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={
                      currentStyle.strokeWidth
                    }
                    onChange={(event) =>
                      updateStyle(
                        "strokeWidth",
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full accent-indigo-500"
                  />
                </label>


                {/* Stroke Color */}

                <label className="text-xs">
                  <span className="mb-1 block font-medium text-zinc-400">
                    Stroke Color
                  </span>

                  <div className="flex gap-2">

                    <input
                      type="color"
                      value={
                        currentStyle.strokeColor ===
                        "transparent"
                          ? "#000000"
                          : currentStyle.strokeColor
                      }
                      onChange={(event) =>
                        updateStyle(
                          "strokeColor",
                          event.target.value
                        )
                      }
                      className="h-8 w-8 cursor-pointer rounded"
                    />

                    <input
                      type="text"
                      value={
                        currentStyle.strokeColor
                      }
                      onChange={(event) =>
                        updateStyle(
                          "strokeColor",
                          event.target.value
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-slate-950 px-2 text-white"
                    />

                  </div>
                </label>

              </div>

            </div>

          </div>
        )}


        {/* ====================================================
            AI
        ==================================================== */}

        {activeTab === "ai" && (
          <div className="space-y-5">

            <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-amber-900/30 p-4">

              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-indigo-200">

                <Wand2 className="h-4 w-4 text-amber-400" />

                AI Caption Enhancer

              </div>

              <p className="text-xs leading-relaxed text-slate-300">
                Improve captions, remove filler words,
                detect keywords, fix grammar and add
                contextual emojis.
              </p>

            </div>


            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {[
                {
                  action: "highlight_keywords",
                  title: "Auto Highlight Keywords",
                  description:
                    "Detect important words and highlight them automatically.",
                  icon: Highlighter,
                  className:
                    "text-amber-400",
                },
                {
                  action: "add_emojis",
                  title: "Auto Insert Emojis",
                  description:
                    "Add relevant emojis based on caption context.",
                  icon: Smile,
                  className:
                    "text-emerald-400",
                },
                {
                  action: "remove_filler",
                  title: "Remove Filler Words",
                  description:
                    "Remove um, uh, you know and similar filler words.",
                  icon: RefreshCw,
                  className:
                    "text-cyan-400",
                },
                {
                  action: "fix_grammar",
                  title: "Fix Grammar",
                  description:
                    "Correct transcription errors and punctuation.",
                  icon: Type,
                  className:
                    "text-indigo-300",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.action}
                    type="button"
                    disabled={
                      isAiProcessing ||
                      !segments.length
                    }
                    onClick={() =>
                      runAiAction(
                        item.action
                      )
                    }
                    className="rounded-xl border border-zinc-800 bg-slate-950 p-3.5 text-left transition hover:border-indigo-500/60 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    <div
                      className={`mb-1 flex items-center gap-2 text-xs font-bold ${item.className}`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      {item.description}
                    </p>

                  </button>
                );
              })}

            </div>


            {/* Custom */}

            <div className="space-y-2 rounded-xl border border-zinc-800 bg-slate-950 p-4">

              <label className="block text-xs font-bold text-zinc-300">
                Custom AI Instruction
              </label>

              <div className="flex gap-2">

                <input
                  type="text"
                  value={customAiPrompt}
                  onChange={(event) =>
                    setCustomAiPrompt(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      void runCustomAi();
                    }
                  }}
                  placeholder="Make captions short and punchy..."
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  disabled={
                    isAiProcessing ||
                    !customAiPrompt.trim()
                  }
                  onClick={() =>
                    void runCustomAi()
                  }
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  Apply
                </button>

              </div>

            </div>

          </div>
        )}


        {/* ====================================================
            EXPORT
        ==================================================== */}

        {activeTab === "export" && (
          <div className="space-y-5">

            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 p-4">

              <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                <Download className="h-4 w-4" />
                Export Captions
              </h3>

              <p className="mt-1 text-xs text-slate-300">
                Download subtitle files or render
                the final captioned video.
              </p>

            </div>


            <div className="flex items-center justify-between rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-4">

              <div>
                <h4 className="text-xs font-bold text-white">
                  Render Video
                </h4>

                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Export MP4/WebM with animated
                  captions.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenExport}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                Render Video
              </button>

            </div>


            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {/* SRT */}

              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    "captions.srt",
                    generateSrt(
                      segments
                    ),
                    "text/plain"
                  )
                }
                className="rounded-xl border border-zinc-800 bg-slate-950 p-3.5 text-left transition hover:border-zinc-600"
              >
                <span className="block text-xs font-bold text-white">
                  SubRip (.SRT)
                </span>

                <span className="text-[10px] text-zinc-400">
                  YouTube / Premiere
                </span>

                <span className="mt-2 inline-block rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200">
                  Download
                </span>
              </button>


              {/* VTT */}

              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    "captions.vtt",
                    generateVtt(
                      segments
                    ),
                    "text/vtt"
                  )
                }
                className="rounded-xl border border-zinc-800 bg-slate-950 p-3.5 text-left transition hover:border-zinc-600"
              >
                <span className="block text-xs font-bold text-white">
                  WebVTT (.VTT)
                </span>

                <span className="text-[10px] text-zinc-400">
                  HTML5 / Web
                </span>

                <span className="mt-2 inline-block rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200">
                  Download
                </span>
              </button>


              {/* JSON */}

              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    "captions.json",
                    JSON.stringify(
                      segments,
                      null,
                      2
                    ),
                    "application/json"
                  )
                }
                className="rounded-xl border border-zinc-800 bg-slate-950 p-3.5 text-left transition hover:border-zinc-600"
              >
                <span className="block text-xs font-bold text-white">
                  Raw JSON
                </span>

                <span className="text-[10px] text-zinc-400">
                  Word timings & styling
                </span>

                <span className="mt-2 inline-block rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200">
                  Download
                </span>
              </button>


              {/* Transcript */}

              <button
                type="button"
                onClick={async () => {
                  const text =
                    generatePlainTranscript(
                      segments
                    );

                  try {
                    await navigator.clipboard.writeText(
                      text
                    );

                    alert(
                      "Transcript copied!"
                    );
                  } catch {
                    console.error(
                      "Clipboard access failed"
                    );
                  }
                }}
                className="rounded-xl border border-zinc-800 bg-slate-950 p-3.5 text-left transition hover:border-zinc-600"
              >
                <span className="block text-xs font-bold text-white">
                  Plain Transcript
                </span>

                <span className="text-[10px] text-zinc-400">
                  Copy caption text
                </span>

                <span className="mt-2 inline-block rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200">
                  Copy
                </span>
              </button>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default EditorPanel;
