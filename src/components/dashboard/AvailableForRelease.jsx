import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function AvailableForRelease({ debts }) {
  const activeDebts = debts.filter(d => d.status === "active" && d.amount_granted);
  
  const totalGranted = activeDebts.reduce((s, d) => s + (d.amount_granted || 0), 0);
  const totalAvailed = activeDebts.reduce((s, d) => s + (d.amount_availed || 0), 0);
  const availableForRelease = totalGranted - totalAvailed;

  return (
    <Card className="p-5 bg-gradient-to-br from-card to-secondary/30 border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium mb-1">Available for Release</p>
          <p className="text-2xl md:text-3xl font-bold text-primary">
            ₱{availableForRelease.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Out of ₱{totalGranted.toLocaleString(undefined, { maximumFractionDigits: 0 })} granted
          </p>
        </div>
        <Wallet className="w-8 h-8 text-primary/40 flex-shrink-0" />
      </div>
    </Card>
  );
}