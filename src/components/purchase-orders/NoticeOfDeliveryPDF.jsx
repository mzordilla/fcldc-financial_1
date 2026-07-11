import { jsPDF } from "jspdf";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function NoticeOfDeliveryPDF({ po, iconOnly }) {
  const handleGenerate = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header bar
    doc.setFillColor(16, 185, 129); // primary green
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NOTICE OF DELIVERY", margin, 9.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageW - margin, 9.5, { align: "right" });

    y = 30;
    doc.setTextColor(30, 30, 30);

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Notice of Delivery", margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("This document confirms that the goods/services described below have been delivered.", margin, y);
    y += 12;

    // PO Info box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageW - margin * 2, 40, 3, 3, "FD");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    const col1 = margin + 5;
    const col2 = pageW / 2 + 5;
    let infoY = y + 8;

    const field = (label, value, x, currentY) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(label, x, currentY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value || "—", x, currentY + 5);
    };

    field("PO Number", po.po_number || "—", col1, infoY);
    field("Supplier", po.supplier_name || "—", col2, infoY);
    infoY += 14;
    field("Project", po.project_name || "—", col1, infoY);
    field("Requested Date", po.requested_date ? format(new Date(po.requested_date), "MMM d, yyyy") : "—", col2, infoY);
    infoY += 14;
    field("Delivery Date", po.delivery_date ? format(new Date(po.delivery_date), "MMM d, yyyy") : "—", col1, infoY);
    field("Approved By", po.approved_by || "—", col2, infoY);

    y += 48;

    // Description
    if (po.description) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("DESCRIPTION", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const descLines = doc.splitTextToSize(po.description, pageW - margin * 2);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 6;
    }

    // Line items table
    if (po.line_items && po.line_items.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("LINE ITEMS", margin, y);
      y += 5;

      // Table header
      doc.setFillColor(16, 185, 129);
      doc.rect(margin, y, pageW - margin * 2, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Description", margin + 2, y + 5);
      doc.text("Qty", pageW - 85, y + 5, { align: "right" });
      doc.text("Unit Cost", pageW - 55, y + 5, { align: "right" });
      doc.text("Total", pageW - margin - 2, y + 5, { align: "right" });
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      po.line_items.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageW - margin * 2, 7, "F");
        }
        doc.setFontSize(8);
        const descText = doc.splitTextToSize(item.description || "—", 90);
        doc.text(descText[0], margin + 2, y + 5);
        doc.text(String(item.quantity ?? "—"), pageW - 85, y + 5, { align: "right" });
        doc.text(`P${(item.cost_per_item || 0).toLocaleString()}`, pageW - 55, y + 5, { align: "right" });
        doc.text(`P${(item.total || 0).toLocaleString()}`, pageW - margin - 2, y + 5, { align: "right" });
        y += 7;
      });

      // Total row
      doc.setDrawColor(16, 185, 129);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("TOTAL AMOUNT", margin + 2, y);
      doc.text(`P${(po.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageW - margin - 2, y, { align: "right" });
      y += 10;
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(`Total Amount: P${(po.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, y);
      y += 10;
    }

    // Delivery notes
    if (po.delivery_notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("DELIVERY NOTES", margin, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(60, 60, 60);
      const noteLines = doc.splitTextToSize(po.delivery_notes, pageW - margin * 2);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 5 + 6;
    }

    y += 10;

    // Signature section
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, margin + 65, y);
    doc.line(pageW - margin - 65, y, pageW - margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Received by / Signature", margin, y + 5);
    doc.text("Authorized by / Signature", pageW - margin - 65, y + 5);
    y += 18;
    doc.line(margin, y, margin + 65, y);
    doc.line(pageW - margin - 65, y, pageW - margin, y);
    doc.text("Printed Name & Date", margin, y + 5);
    doc.text("Printed Name & Date", pageW - margin - 65, y + 5);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("This is a system-generated Notice of Delivery.", pageW / 2, 285, { align: "center" });

    const filename = `NOD-${po.po_number || po.id}-${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(filename);
  };

  if (iconOnly) {
    return (
      <button onClick={handleGenerate} className="text-muted-foreground hover:text-foreground transition-colors" title="Notice of Delivery">
        <FileDown className="w-2.5 h-2.5" />
      </button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleGenerate} className="text-primary hover:text-primary">
      <FileDown className="w-3.5 h-3.5 mr-1.5" /> NOD
    </Button>
  );
}