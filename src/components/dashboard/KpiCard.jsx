import { useRef, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

function AutoFitText({ value, className }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const fit = () => {
      text.style.fontSize = "";
      const maxW = container.offsetWidth;
      let size = 24; // start at 24px (text-2xl)
      text.style.fontSize = size + "px";
      while (text.scrollWidth > maxW && size > 11) {
        size -= 1;
        text.style.fontSize = size + "px";
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <span ref={textRef} className="whitespace-nowrap font-bold text-foreground tracking-tight">
        {value}
      </span>
    </div>
  );
}

export default function KpiCard({ title, value, icon: Icon, trend, trendLabel, color }) {
  const isPositive = trend >= 0;

  return (
    <div className="bg-card rounded-2xl border border-border hover:shadow-lg transition-shadow duration-300 opacity-100 px-5 py-4">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <AutoFitText value={value} className="w-full" />
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
      {trendLabel && <p className="text-xs text-muted-foreground mt-0.5">{trendLabel}</p>}
    </div>
  );
}