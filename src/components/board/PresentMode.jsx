import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SLIDES, renderSlide } from "./BoardDeck";

export default function PresentMode({ report, onClose }) {
  const [index, setIndex] = useState(0);
  const go = (d) => setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + d)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-sidebar flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[min(100%,calc((100vh-6rem)*16/9))]">{renderSlide(index, report)}</div>
      <div className="flex items-center gap-3 mt-4">
        <Button size="icon" variant="secondary" onClick={() => go(-1)} disabled={index === 0}><ChevronLeft /></Button>
        <span className="text-sm text-sidebar-foreground/70 w-16 text-center">{index + 1} / {SLIDES.length}</span>
        <Button size="icon" variant="secondary" onClick={() => go(1)} disabled={index === SLIDES.length - 1}><ChevronRight /></Button>
        <Button size="icon" variant="secondary" onClick={onClose}><X /></Button>
      </div>
    </div>
  );
}