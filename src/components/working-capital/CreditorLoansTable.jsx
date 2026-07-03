import { ChevronDown, ChevronUp, Pencil, Trash2, CheckCircle, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import MonthlyLoanMonitoring from "./MonthlyLoanMonitoring";

const statusStyles = {
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  paid_off: "bg-primary/10 text-primary border-primary/20",
  defaulted: "bg-destructive/10 text-destructive border-destructive/20"
};

export default function CreditorLoansTable({
  creditor,
  loans,
  expandedId,
  setExpandedId,
  onEdit,
  onDelete,
  onMarkPaidOff,
  isLoading
}) {
  const totalOutstanding = loans.reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  const totalMonthlyPayment = loans.reduce((s, d) => s + (d.monthly_payment || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{creditor}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          ₱{totalOutstanding.toLocaleString()} outstanding · ₱{totalMonthlyPayment.toLocaleString()}/mo
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12"></TableHead>
              <TableHead className="pr-1 pl-1">Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-center">Contract</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ?
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
            </TableRow> :

            loans.map((loan) =>
            <>
                  <TableRow key={loan.id} className="hover:bg-muted/50">
                    <TableCell>
                      <button
                    onClick={() => setExpandedId(expandedId === loan.id ? null : loan.id)}
                    className="p-1 hover:bg-accent rounded transition-colors">
                    
                        {expandedId === loan.id ?
                    <ChevronUp className="w-4 h-4" /> :

                    <ChevronDown className="w-4 h-4" />
                    }
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{loan.description || "—"}</TableCell>
                    <TableCell className="text-right font-mono">₱{(loan.total_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">₱{((loan.total_amount || 0) - (loan.amount_paid || 0)).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{loan.interest_rate || 0}%</TableCell>
                    <TableCell className="text-right">{loan.due_date ? format(new Date(loan.due_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={`border ${statusStyles[loan.status]}`}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {loan.contract_attachment_url ? (
                        <a href={loan.contract_attachment_url} target="_blank" rel="noreferrer" className="inline-flex text-primary hover:underline" title="View Contract">
                          <Paperclip className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        {loan.status === "active" &&
                    <Button size="icon" variant="ghost" onClick={() => onMarkPaidOff(loan)} title="Mark Paid Off">
                            <CheckCircle className="w-4 h-4 text-primary" />
                          </Button>
                    }
                        <Button size="icon" variant="ghost" onClick={() => onEdit(loan)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(loan)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === loan.id &&
              <TableRow key={`${loan.id}-expanded`}>
                      <TableCell colSpan={9} className="bg-muted/50 p-4">
                        <MonthlyLoanMonitoring loan={loan} />
                      </TableCell>
                    </TableRow>
              }
                </>
            )
            }
          </TableBody>
        </Table>
      </CardContent>
    </Card>);

}