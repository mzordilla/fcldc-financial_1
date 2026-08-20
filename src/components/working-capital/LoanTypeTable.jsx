import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Pencil, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import LoanLedgerHistory from "./LoanLedgerHistory";
import { getLoanBalance } from "@/lib/loanBalance";

const typeLabels = {
  loan: "Loan",
  credit_line: "Credit Line",
  equipment_financing: "Equipment",
  vendor_credit: "Vendor Credit",
  mortgage: "Mortgage",
  other: "Other",
};

const statusStyles = {
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  paid_off: "bg-primary/10 text-primary border-primary/20",
  defaulted: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function LoanTypeTable({ type, loans, expandedId, setExpandedId, onEdit, onDelete, onMarkPaidOff, isLoading }) {
  const totalOutstanding = loans.reduce((sum, d) => sum + getLoanBalance(d), 0);
  const totalMonthly = loans.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{typeLabels[type]}</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Outstanding</p>
            <p className="font-semibold">₱{totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly Payments</p>
            <p className="font-semibold">₱{totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 border-border hover:bg-secondary/50">
              <TableHead className="font-semibold">Creditor</TableHead>
              <TableHead className="text-right font-semibold">Granted Amount</TableHead>
              <TableHead className="text-right font-semibold">Utilization</TableHead>
              <TableHead className="text-right font-semibold">Paid</TableHead>
              <TableHead className="text-right font-semibold">Outstanding</TableHead>
              <TableHead className="text-right font-semibold">Rate</TableHead>
              <TableHead className="text-right font-semibold">Monthly</TableHead>
              <TableHead className="text-center font-semibold">Status</TableHead>
              <TableHead className="text-center font-semibold w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && loans.length === 0 && (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-12 text-muted-foreground">
                  No {typeLabels[type].toLowerCase()} recorded
                </TableCell>
              </TableRow>
            )}
            {loans.map((d) => {
              const remaining = getLoanBalance(d);
              const isExpanded = expandedId === d.id;
              return (
                <TableRow key={d.id} className="border-border hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-medium text-foreground">{d.creditor}</TableCell>
                  <TableCell className="text-right text-sm">
                    ₱{(d.amount_granted || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {d.amount_granted ? `${Math.round((getLoanBalance(d) / d.amount_granted) * 100)}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ₱{(d.amount_paid || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    ₱{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {d.interest_rate ? `${d.interest_rate}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {d.monthly_payment ? `₱${d.monthly_payment.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs ${statusStyles[d.status] || ""}`}>
                      {(d.status || "active").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {d.status === "active" && (
                        <Button variant="ghost" size="icon" onClick={() => onMarkPaidOff(d)} className="h-8 w-8 text-primary hover:text-primary" title="Mark as Paid Off">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(d)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(d)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!isLoading && loans.length > 0 && expandedId && (
          <div className="border-t border-border px-6 py-4 bg-secondary/30">
            <LoanLedgerHistory loan={loans.find(d => d.id === expandedId)} />
          </div>
        )}
      </div>
    </div>
  );
}