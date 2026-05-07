import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format, startOfYear, addMonths, startOfMonth, endOfMonth } from "date-fns";

export default function UpcomingMaturities({ items }) {
  const today = new Date();
  const activeLoans = items.filter(d => d.status === "active" && d.due_date);

  // Generate 12 months starting from today
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(today, i);
    return {
      start: startOfMonth(month),
      end: endOfMonth(month),
      label: format(month, "MMMM yyyy"),
    };
  });

  // Group loans by month
  const monthlyLoans = months.map(month => ({
    ...month,
    loans: activeLoans.filter(loan => {
      const dueDate = new Date(loan.due_date);
      return dueDate >= month.start && dueDate <= month.end;
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
  }));

  // Filter to show only months with loans
  const loansToDisplay = monthlyLoans.filter(m => m.loans.length > 0);

  const getUrgencyBadge = (daysUntilDue) => {
    if (daysUntilDue <= 30) return <Badge className="bg-destructive/10 text-destructive text-xs">Urgent</Badge>;
    if (daysUntilDue <= 60) return <Badge className="bg-chart-3/10 text-chart-3 text-xs">Soon</Badge>;
    if (daysUntilDue <= 90) return <Badge className="bg-chart-2/10 text-chart-2 text-xs">Upcoming</Badge>;
    return <Badge className="bg-primary/10 text-primary text-xs">Planned</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Monthly Loan Maturities</h3>
        <p className="text-sm text-muted-foreground">12-month repayment schedule</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 border-border hover:bg-secondary/50">
              <TableHead className="font-semibold">Month</TableHead>
              <TableHead className="font-semibold">Creditor</TableHead>
              <TableHead className="text-right font-semibold">Outstanding</TableHead>
              <TableHead className="font-semibold">Due Date</TableHead>
              <TableHead className="text-center font-semibold">Days</TableHead>
              <TableHead className="text-center font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loansToDisplay.length === 0 ? (
              <TableRow>
                <TableCell colSpan="6" className="text-center py-8 text-muted-foreground">
                  No loans due in the next 12 months
                </TableCell>
              </TableRow>
            ) : (
              loansToDisplay.map(month =>
                month.loans.map((loan, idx) => {
                  const daysUntilDue = differenceInDays(new Date(loan.due_date), today);
                  return (
                    <TableRow key={loan.id} className="border-border hover:bg-secondary/30 transition-colors">
                      {idx === 0 && (
                        <TableCell rowSpan={month.loans.length} className="font-semibold text-foreground bg-secondary/20">
                          {month.label}
                        </TableCell>
                      )}
                      <TableCell className="text-foreground">{loan.creditor}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₱{((loan.total_amount || 0) - (loan.amount_paid || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>{format(new Date(loan.due_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-center text-sm">{daysUntilDue}</TableCell>
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
    </Card>
  );
}