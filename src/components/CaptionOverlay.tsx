import React, { CSSProperties, FC, useMemo, useState, useRef } from "react";
import { CaptionSegment, CaptionStyle } from "../types";

interface CaptionOverlayProps {
  currentSegment: CaptionSegment | null;
  activeWordIndex: number;
  style: CaptionStyle;
  onUpdateStyle?: (updated: Partial<CaptionStyle>) => void;
}

export const CaptionOverlay: FC<CaptionOverlayProps> = ({
  currentSegment,
  activeWordIndex,
  style,
  onUpdateStyle,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const startOffsetRef = useRef(0);

  // ------------------------------------------------------------
  // Guard
  // ------------------------------------------------------------
  if (!currentSegment?.words?.length) {
    return null;
  }

  // ------------------------------------------------------------
  // Destructure style with safe defaults
  // ------------------------------------------------------------
  const {
    fontFamily = "Impact, sans-serif",
    fontSize = 32,
    fontWeight = "bold",
    textTransform = "none",
    textColor = "#FFFFFF",
    highlightColor = "#FFE600",
    strokeColor = "#000000",
    strokeWidth = 0,
    backgroundColor = "transparent",
    backgroundPadding = 10,
    borderRadius = 12,
    shadowColor = "rgba(0, 0, 0, 0.8)",
    shadowBlur = 8,
    position = "bottom",
    verticalOffset,
    animation = "none",
    showEmojis = false,
    activeWordBgColor,
  } = style;

  // ------------------------------------------------------------
  // Position Calculation (0% = top, 50% = middle, 100% = bottom)
  // ------------------------------------------------------------
  let topPercent = 80;
  if (position === "top") {
    topPercent = verticalOffset ?? 15;
  } else if (position === "center") {
    topPercent = verticalOffset ?? 50;
  } else {
    // bottom position
    const rawVal = verticalOffset ?? 80;
    // Map legacy preset values (e.g. 15, 18, 20, 25%) to distance from top
    if (rawVal <= 45) {
      topPercent = 100 - rawVal;
    } else {
      topPercent = rawVal;
    }
  }

  topPercent = Math.max(8, Math.min(92, topPercent));

  const containerStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: `${topPercent}%`,
    transform: "translate(-50%, -50%)",
    width: "92%",
    maxWidth: "92%",
    zIndex: 35,
    pointerEvents: onUpdateStyle ? "auto" : "none",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    userSelect: "none",
    cursor: onUpdateStyle ? (isDragging ? "grabbing" : "grab") : "default",
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onUpdateStyle) return;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    startOffsetRef.current = topPercent;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !onUpdateStyle) return;
    const parent = e.currentTarget.parentElement as HTMLElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.height <= 0) return;

    const deltaY = e.clientY - dragStartYRef.current;
    const deltaPercent = (deltaY / rect.height) * 100;
    const newTop = Math.max(8, Math.min(92, Math.round(startOffsetRef.current + deltaPercent)));
    onUpdateStyle({ verticalOffset: newTop });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (_) {}
    }
  };

  // ------------------------------------------------------------
  // Font weight
  // ------------------------------------------------------------
  const fontWeightMap: Record<string, number> = {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  };

  const resolvedFontWeight =
    fontWeightMap[String(fontWeight)] ?? 700;

  // ------------------------------------------------------------
  // Text transform
  // ------------------------------------------------------------
  const resolvedTextTransform =
    textTransform === "uppercase"
      ? "uppercase"
      : textTransform === "lowercase"
        ? "lowercase"
        : textTransform === "capitalize"
          ? "capitalize"
          : "none";

  // ------------------------------------------------------------
  // Text stroke + shadow
  // ------------------------------------------------------------
  const textShadow = useMemo(() => {
    const shadows: string[] = [];

    if (strokeWidth > 0) {
      shadows.push(
        `-${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}`,
        `${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}`,
        `-${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`,
        `${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}`,
      );
    }

    if (shadowBlur > 0) {
      shadows.push(
        `0 4px ${shadowBlur}px ${shadowColor}`
      );
    }

    return shadows.length ? shadows.join(", ") : "none";
  }, [
    strokeWidth,
    strokeColor,
    shadowBlur,
    shadowColor,
  ]);

  // ------------------------------------------------------------
  // Caption background
  // ------------------------------------------------------------
  const hasBackground =
    backgroundColor &&
    backgroundColor !== "transparent";

  const captionStyle: CSSProperties = {
    display: "inline-flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",

    columnGap: "10px",
    rowGap: "6px",

    maxWidth: "100%",

    backgroundColor: hasBackground
      ? backgroundColor
      : "transparent",

    padding: hasBackground
      ? `${backgroundPadding}px ${backgroundPadding * 1.5}px`
      : "0",

    borderRadius: `${borderRadius}px`,

    backdropFilter:
      backgroundColor?.includes("rgba")
        ? "blur(8px)"
        : "none",

    boxShadow:
      hasBackground && shadowBlur > 0
        ? `0 10px 25px -5px ${shadowColor}`
        : "none",

    lineHeight: 1.05,
  };

  // ------------------------------------------------------------
  // Animation
  // ------------------------------------------------------------
  const getAnimationStyle = (
    isActive: boolean,
  ): CSSProperties => {
    if (!isActive) {
      return {
        transform: "scale(1)",
        opacity: 1,
      };
    }

    switch (animation) {
      case "pop":
        return {
          transform: "scale(1.24)",
          transition:
            "transform 80ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          filter: "brightness(1.15)",
        };

      case "bounce":
        return {
          transform: "translateY(-7px) scale(1.18)",
          transition:
            "transform 100ms ease-out",
        };

      case "slide":
        return {
          transform: "translateX(0) scale(1.12)",
          transition:
            "transform 120ms ease-out",
        };

      case "fade":
        return {
          opacity: 1,
          filter: "brightness(1.2)",
          transition:
            "opacity 150ms ease-in-out",
        };

      case "highlight":
        return {
          backgroundColor:
            activeWordBgColor || highlightColor,
          color: "#000000",
          padding: "3px 8px",
          borderRadius: "6px",
          boxShadow:
            "0 4px 12px rgba(0, 0, 0, 0.4)",
          textShadow: "none",
          transform: "scale(1.05)",
          transition:
            "all 100ms ease-out",
        };

      default:
        return {};
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div
      aria-hidden="true"
      style={containerStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title={onUpdateStyle ? "Click and drag to position captions on video" : undefined}
      className={`group/caption relative transition-shadow ${
        isDragging ? "ring-2 ring-lime-400/80 rounded-xl bg-black/20" : "hover:ring-1 hover:ring-lime-400/40 hover:rounded-xl"
      }`}
    >
      <div style={captionStyle}>
        {currentSegment.words.map((word, index) => {
          const isActive =
            index === activeWordIndex;

          let color = textColor;

          if (isActive) {
            color = highlightColor;
          } else if (word.isHighlight) {
            color =
              word.highlightColor ||
              highlightColor;
          }

          const animationStyle =
            getAnimationStyle(isActive);

          const wordStyle: CSSProperties = {
            display: "inline-flex",
            alignItems: "center",

            fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight: resolvedFontWeight,

            color:
              animation === "highlight" &&
              isActive
                ? "#000000"
                : color,

            textTransform:
              resolvedTextTransform as CSSProperties["textTransform"],

            textShadow:
              animation === "highlight" &&
              isActive
                ? "none"
                : textShadow,

            transformOrigin: "center",

            transition:
              "transform 100ms ease, filter 100ms ease",

            willChange:
              isActive
                ? "transform, filter"
                : "auto",

            ...animationStyle,
          };

          return (
            <span
              key={word.id ?? `${word.word}-${index}`}
              style={wordStyle}
            >
              <span>{word.word}</span>

              {showEmojis && word.emoji && (
                <span
                  style={{
                    marginLeft: "4px",
                    fontSize: "1.1em",
                    lineHeight: 1,
                  }}
                >
                  {word.emoji}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default CaptionOverlay;
