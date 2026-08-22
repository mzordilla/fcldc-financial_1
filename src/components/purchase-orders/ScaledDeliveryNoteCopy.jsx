import { useCallback, useLayoutEffect, useRef, useState } from "react";
import NoticeOfDeliveryPrintDocument from "@/components/purchase-orders/NoticeOfDeliveryPrintDocument";

export default function ScaledDeliveryNoteCopy({ po, heightMm, compact, watermark }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const resize = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    setScale(Math.min(1, container.clientHeight / content.scrollHeight));
  }, []);

  useLayoutEffect(() => {
    resize();
    const observer = new ResizeObserver(resize);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [po, resize]);

  return <div ref={containerRef} className="relative overflow-hidden" style={{ height: `${heightMm}mm` }}>
    <div ref={contentRef} className="w-full" style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}><NoticeOfDeliveryPrintDocument po={po} compact={compact} /></div>
    {watermark && <span className="absolute bottom-2 right-5 text-[10px] font-bold uppercase tracking-wider text-gray-500">{watermark}</span>}
  </div>;
}