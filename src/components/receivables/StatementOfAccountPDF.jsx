import { jsPDF } from "jspdf";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function StatementOfAccountPDF({ projectName, clientName, rows }) {
  const handleDownload = () => {
    const unpaidRows = rows.filter(r => r.status !== "paid");
    const totalBilled = unpaidRows.reduce((s, r) => s + (r.amount || 0), 0);
    const totalCollected = unpaidRows.reduce((s, r) => s + (r.amount_paid || 0), 0);
    const totalBalance = totalBilled - totalCollected;

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("STATEMENT OF ACCOUNT", margin, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, pageW - margin, 10, { align: "right" });

    y = 35;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Statement of Account", margin, y);
    y += 10;

    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 3, 3, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("Client:", margin + 5, y + 8);
    doc.text("Project:", margin + 5, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(clientName || "—", margin + 25, y + 8);
    doc.text(projectName || "—", margin + 25, y + 17);
    y += 32;

    // Table header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 6, pageW - margin * 2, 7, "F");
    doc.text("Unpaid Invoices", margin + 3, y - 1);
    y += 3;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice #", margin + 3, y);
    doc.text("Client", margin + 32, y);
    doc.text("Project", margin + 62, y);
    doc.text("Due Date", margin + 92, y);
    doc.text("Billed", pageW - margin - 35, y, { align: "right" });
    doc.text("Balance", pageW - margin - 3, y, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 1, pageW - margin, y + 1);
    y += 6;

    doc.setFont("helvetica", "normal");
    if (unpaidRows.length === 0) {
      doc.setTextColor(100, 100, 100);
      doc.text("No unpaid invoices for this project.", margin + 3, y);
      y += 8;
    }
    unpaidRows.forEach((r) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      const balance = (r.amount || 0) - (r.amount_paid || 0);
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(r.invoice_number || "—", margin + 3, y);
      doc.text(r.client_name || "—", margin + 32, y);
      doc.text(r.project_name || "—", margin + 62, y);
      doc.text(r.due_date ? format(new Date(r.due_date), "MMM d, yyyy") : "—", margin + 92, y);
      doc.text(`₱${(r.amount || 0).toLocaleString()}`, pageW - margin - 35, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`₱${balance.toLocaleString()}`, pageW - margin - 3, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 2, pageW - margin, y + 2);
      y += 8;
    });

    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Total Billed:", pageW - margin - 60, y, { align: "right" });
    doc.text(`₱${totalBilled.toLocaleString()}`, pageW - margin - 3, y, { align: "right" });
    y += 7;
    doc.text("Total Collected:", pageW - margin - 60, y, { align: "right" });
    doc.text(`₱${totalCollected.toLocaleString()}`, pageW - margin - 3, y, { align: "right" });
    y += 7;
    doc.setTextColor(16, 185, 129);
    doc.text("TOTAL BALANCE DUE:", pageW - margin - 60, y, { align: "right" });
    doc.text(`₱${totalBalance.toLocaleString()}`, pageW - margin - 3, y, { align: "right" });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "italic");
      doc.text("This is a computer-generated statement of account.", pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin, doc.internal.pageSize.getHeight() - 10, { align: "right" });
    }

    doc.save(`SOA_${(projectName || "project").replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(); }}>
      <FileText className="w-3.5 h-3.5 mr-1.5" />
      SOA
    </Button>
  );
}