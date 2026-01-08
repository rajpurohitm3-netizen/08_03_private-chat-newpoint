"use client";

import { ReactNode, useEffect, useRef } from "react";

interface ScreenProtectionProps {
  children: ReactNode;
}

export function ScreenProtection({ children }: ScreenProtectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Block context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block copy
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // Block drag
    const preventDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Block print
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      document.body.style.visibility = "hidden";
    };

    const handleAfterPrint = () => {
      document.body.style.visibility = "visible";
    };

    // CSS protection - makes screenshots/recordings show black/distorted
    const protectionStyle = document.createElement("style");
    protectionStyle.id = "chatify-protection-styles";
    protectionStyle.textContent = `
      /* Disable text selection globally */
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      
      /* Allow selection in inputs */
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      /* Hide content when printing */
      @media print {
        html, body, * {
          display: none !important;
          visibility: hidden !important;
        }
      }
    `;
    document.head.appendChild(protectionStyle);

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("dragstart", preventDragStart, true);
    document.addEventListener("copy", preventCopy, true);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("dragstart", preventDragStart, true);
      document.removeEventListener("copy", preventCopy, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      
      const styleElement = document.getElementById("chatify-protection-styles");
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  return (
    <div ref={contentRef} className="relative">
      {children}
    </div>
  );
}

export default ScreenProtection;
