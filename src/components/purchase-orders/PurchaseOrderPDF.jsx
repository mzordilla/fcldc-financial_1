import { jsPDF } from "jspdf";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { calculatePurchaseOrderVat, vatTreatmentLabel } from "@/lib/purchaseOrderVat";

export default function PurchaseOrderPDF({ po }) {
  const handleDownload = () => {
    const enteredAmount = (po.line_items || []).reduce((sum, item) => sum + (item.total || 0), 0) || po.amount || 0;
    const calculated = calculatePurchaseOrderVat(enteredAmount, po.vat_treatment);
    const totals = po.subtotal != null ? { subtotal: po.subtotal, vatAmount: po.vat_amount || 0, total: po.amount || 0 } : calculated;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header with company branding
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PURCHASE ORDER", margin, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, pageW - margin, 10, { align: "right" });

    y = 35;
    doc.setTextColor(30, 30, 30);

    // PO Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Purchase Order", margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Official purchase authorization document", margin, y);
    y += 15;

    // PO Info Box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageW - margin * 2, 35, 3, 3, "FD");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    
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

    field("PO Number:", po.po_number || "—", col1, infoY);
    field("Date:", po.requested_date ? format(new Date(po.requested_date), "MMM d, yyyy") : "—", col2, infoY);
    field("Supplier:", po.supplier_name, col1, infoY + 12);
    field("Project:", po.project_name, col2, infoY + 12);
    field("Category:", po.category?.replace("_", " ").toUpperCase() || "—", col1, infoY + 24);
    field("Priority:", (po.priority || "normal").toUpperCase(), col2, infoY + 24);

    y += 45;

    // Supplier & Request Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Description", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const descLines = doc.splitTextToSize(po.description || "No description provided", pageW - margin * 2);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 8;

    // Purchaser department & Required Date
    {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y - 3, pageW - margin, y - 3);
      y += 3;

      doc.setFont("helvetica", "bold");
      doc.text("Purchaser:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text("PROCUREMENT AND LOGISTIC", margin + 25, y);
      if (po.required_date) {
        const reqDate = format(new Date(po.required_date), "MMMM d, yyyy");
        doc.setFont("helvetica", "bold");
        doc.text("Required Date:", pageW - margin - 60, y);
        doc.setFont("helvetica", "normal");
        doc.text(reqDate, pageW - margin - 60 + 28, y);
      }
      y += 10;
    }

    // Line Items Table
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 6, pageW - margin * 2, 7, "F");
    doc.text("Item Details", margin + 3, y - 1);

    y += 3;
    doc.setFontSize(9);
    const tableStartY = y;
    
    // Table headers
    doc.setFont("helvetica", "bold");
    doc.text("#", margin + 3, y);
    doc.text("Description", margin + 10, y);
    doc.text("Qty", pageW - margin - 65, y, { align: "right" });
    doc.text("Unit", pageW - margin - 52, y, { align: "right" });
    doc.text("Unit Price", pageW - margin - 35, y, { align: "right" });
    doc.text("Total", pageW - margin - 3, y, { align: "right" });
    
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 1, pageW - margin, y + 1);
    y += 6;

    // Line items
    doc.setFont("helvetica", "normal");
    const lineItems = po.line_items || [];
    lineItems.forEach((item, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      const rowNum = idx + 1;
      doc.text(String(rowNum), margin + 3, y);
      const descLines = doc.splitTextToSize(item.description || "—", pageW - margin * 2 - 75);
      doc.text(descLines, margin + 10, y);
      doc.text(String(item.quantity || "—"), pageW - margin - 65, y, { align: "right" });
      doc.text(item.unit_of_measure || "—", pageW - margin - 52, y, { align: "right" });
      doc.text(`₱${(item.cost_per_item || 0).toLocaleString()}`, pageW - margin - 35, y, { align: "right" });
      doc.text(`₱${(item.total || 0).toLocaleString()}`, pageW - margin - 3, y, { align: "right" });
      
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 2, pageW - margin, y + 2);
      y += 8 + (descLines.length - 1) * 4;
    });

    // VAT breakdown and totals
    y += 3;
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", pageW - margin - 35, y, { align: "right" });
    doc.text(`₱${totals.subtotal.toLocaleString()}`, pageW - margin - 3, y, { align: "right" });
    y += 5;
    doc.text(`VAT (12%) · ${vatTreatmentLabel(po.vat_treatment)}:`, pageW - margin - 35, y, { align: "right" });
    doc.text(`₱${totals.vatAmount.toLocaleString()}`, pageW - margin - 3, y, { align: "right" });
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL:", pageW - margin - 35, y, { align: "right" });
    doc.setTextColor(16, 185, 129);
    doc.text(`₱${totals.total.toLocaleString()}`, pageW - margin - 3, y, { align: "right" });
    doc.setTextColor(30, 30, 30);
    y += 10;

    // Approval Section
    y += 10;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Approval Status", margin, y);
    
    const statusColors = {
      pending: { fill: [250, 204, 21], text: [100, 80, 0] },
      approved: { fill: [16, 185, 129], text: [255, 255, 255] },
      rejected: { fill: [239, 68, 68], text: [255, 255, 255] },
      cancelled: { fill: [100, 100, 100], text: [255, 255, 255] }
    };
    
    const statusConfig = statusColors[po.approval_status] || statusColors.pending;
    doc.setFillColor(...statusConfig.fill);
    doc.setTextColor(...statusConfig.text);
    doc.setFont("helvetica", "bold");
    const statusText = (po.approval_status || "pending").toUpperCase();
    const statusWidth = doc.getTextWidth(statusText) + 10;
    doc.roundedRect(pageW - margin - statusWidth, y - 3, statusWidth, 6, 1.5, 1.5, "F");
    doc.text(statusText, pageW - margin - statusWidth / 2, y + 1, { align: "center" });
    
    doc.setTextColor(30, 30, 30);
    y += 10;

    if (po.approved_by) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Approved By: ${po.approved_by}`, margin, y);
      y += 5;
    }

    if (po.approval_notes) {
      doc.setFont("helvetica", "italic");
      doc.text(`Notes: ${po.approval_notes}`, margin, y);
      y += 8;
    }

    // Approval History
    if (po.approval_history && po.approval_history.length > 0) {
      y += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Approval History:", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      
      po.approval_history.slice(-3).forEach((action) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const timestamp = action.timestamp ? format(new Date(action.timestamp), "MMM d, yyyy h:mm a") : "";
        doc.text(`• ${action.action.toUpperCase()} by ${action.actor || "Unknown"} - ${timestamp}`, margin + 3, y);
        if (action.notes) {
          doc.setFont("helvetica", "italic");
          doc.text(`  "${action.notes}"`, margin + 3, y + 4);
          doc.setFont("helvetica", "normal");
          y += 4;
        }
        y += 6;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "italic");
      doc.text("This is a computer-generated document. No signature is required.", pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin, doc.internal.pageSize.getHeight() - 10, { align: "right" });
    }

    doc.save(`PO_${po.po_number || "draft"}.pdf`);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <FileDown className="w-4 h-4 mr-2" />
      Download PDF
    </Button>
  );
}