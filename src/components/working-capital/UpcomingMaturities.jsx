import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { getLoanBalance } from "@/lib/loanBalance";

const typeLabels = {
  equipment_financing: "Equipment Financing",
  credit_line: "Credit Line",
  mortgage: "Mortgage",
};

export default function UpcomingMaturities({ items }) {
  const today = new Date();
  const activeLoans = items.filter(d => d.status === "active" && d.due_date);

  // Group loans by type
  const loansByType = {};
  Object.keys(typeLabels).forEach(type => {
    loansByType[type] = activeLoans.filter(loan => loan.type === type);
  });

  // Generate 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(today, i);
    return {
      start: startOfMonth(month),
      end: endOfMonth(month),
      label: format(month, "MMMM yyyy"),
    };
  });

  const getUrgencyBadge = (daysUntilDue) => {
    if (daysUntilDue <= 30) return <Badge className="bg-destructive/10 text-destructive text-xs">Urgent</Badge>;
    if (daysUntilDue <= 60) return <Badge className="bg-chart-3/10 text-chart-3 text-xs">Soon</Badge>;
    if (daysUntilDue <= 90) return <Badge className="bg-chart-2/10 text-chart-2 text-xs">Upcoming</Badge>;
    return <Badge className="bg-primary/10 text-primary text-xs">Planned</Badge>;
  };

  const renderTypeTable = (type, loans) => {
    const monthlyLoans = months.map(month => ({
      ...month,
      loans: loans.filter(loan => {
        const dueDate = new Date(loan.due_date);
        return dueDate >= month.start && dueDate <= month.end;
      }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
    }));

    const loansToDisplay = monthlyLoans.filter(m => m.loans.length > 0);
    const totalOutstanding = loans.reduce((sum, loan) => sum + getLoanBalance(loan), 0);

    return (
      <div key={type} className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">{typeLabels[type]}</h4>
          <span className="text-sm text-muted-foreground">
            Total Outstanding: ₱{totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 border-border hover:bg-secondary/50">
                <TableHead className="font-semibold text-xs">Month</TableHead>
                <TableHead className="font-semibold text-xs">Creditor</TableHead>
                <TableHead className="text-right font-semibold text-xs">Outstanding</TableHead>
                <TableHead className="font-semibold text-xs">Due Date</TableHead>
                <TableHead className="text-center font-semibold text-xs">Days</TableHead>
                <TableHead className="text-center font-semibold text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loansToDisplay.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="6" className="text-center py-6 text-muted-foreground text-xs">
                    No {typeLabels[type].toLowerCase()} due in next 12 months
                  </TableCell>
                </TableRow>
              ) : (
                loansToDisplay.map(month =>
                  month.loans.map((loan, idx) => {
                    const daysUntilDue = differenceInDays(new Date(loan.due_date), today);
                    return (
                      <TableRow key={loan.id} className="border-border hover:bg-secondary/30 transition-colors">
                        {idx === 0 && (
                          <TableCell rowSpan={month.loans.length} className="font-semibold text-foreground bg-secondary/20 text-xs">
                            {month.label}
                          </TableCell>
                        )}
                        <TableCell className="text-foreground text-xs">{loan.creditor}</TableCell>
                        <TableCell className="text-right font-semibold text-xs">
                          ₱{getLoanBalance(loan).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(loan.due_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-center text-xs">{daysUntilDue}</TableCell>
                        <TableCell className="text-center">
                          {getUrgencyBadge(daysUntilDue)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Only render tables for types with loans
  const typesWithLoans = Object.keys(typeLabels).filter(type => loansByType[type].length > 0);

  return (
    <Card className="max-h-[330px] overflow-y-auto rounded-xl p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="font-project-display text-base font-bold leading-tight text-foreground">Monthly Loan Maturities by Type</h3>
        <p className="mt-1 text-[10px] text-muted-foreground">12-month repayment schedule organized by loan type</p>
      </div>

      {typesWithLoans.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No loans due in the next 12 months</p>
      ) : (
        <div className="space-y-4">
          {typesWithLoans.map(type => renderTypeTable(type, loansByType[type]))}
        </div>
      )}
    </Card>
  );
}