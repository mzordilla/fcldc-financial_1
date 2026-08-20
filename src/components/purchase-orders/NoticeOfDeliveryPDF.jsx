import { jsPDF } from "jspdf";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const LOGO_URL = "https://media.base44.com/images/public/69f02f8501c3688565579a10/7a3b001fb_CONSTRUCTION_FINANCE.jpg";

function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      try {
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), ratio: img.naturalHeight / img.naturalWidth });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}

const peso = (n) => `P${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateOr = (d) => (d ? format(new Date(d), "MMM d, yyyy") : "—");

export default function NoticeOfDeliveryPDF({ po, iconOnly }) {
  const handleGenerate = async () => {
    const logo = await loadLogo();
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    const items = po.line_items || [];

    // ── Estimate natural content height, then derive a shrink factor so everything fits one page ──
    doc.setFontSize(9);
    const descLinesRaw = po.description ? doc.splitTextToSize(po.description, contentW) : [];
    const noteLinesRaw = po.delivery_notes ? doc.splitTextToSize(po.delivery_notes, contentW) : [];
    const estimate =
      22 + // logo/title block
      12 + // subtitle
      48 + // info box
      (descLinesRaw.length ? descLinesRaw.length * 5 + 11 : 0) +
      (items.length ? items.length * 7 + 27 : 10) +
      (noteLinesRaw.length ? noteLinesRaw.length * 5 + 11 : 0) +
      52 + // signatures + footer
      78; // receiving stub
    const available = pageH - 14 - margin;
    const k = Math.min(1, available / estimate);
    const v = (n) => n * k;
    const fs = (n) => Math.max(5, n * k);

    // Header bar
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NOTICE OF DELIVERY", margin, 9.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageW - margin, 9.5, { align: "right" });

    let y = 20;
    let logoH = 0;
    if (logo) {
      const logoW = v(40);
      logoH = logoW * logo.ratio;
      doc.addImage(logo.dataUrl, "JPEG", margin, y, logoW, logoH);
    }
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(fs(18));
    doc.setFont("helvetica", "bold");
    doc.text("Notice of Delivery", pageW - margin, y + Math.max(logoH, v(10)) / 2 + 2, { align: "right" });
    y += Math.max(logoH, v(14)) + v(4);

    doc.setFontSize(fs(10));
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("This document confirms that the goods/services described below have been delivered.", margin, y);
    y += v(12);

    // PO Info box
    const boxH = v(40);
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentW, boxH, 3, 3, "FD");
    doc.setFontSize(fs(9));

    const col1 = margin + v(5);
    const col2 = pageW / 2 + v(5);
    let infoY = y + v(8);

    const field = (label, value, x, currentY) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(label, x, currentY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value || "—", x, currentY + v(5));
    };

    field("PO Number", po.po_number, col1, infoY);
    field("Supplier", po.supplier_name, col2, infoY);
    infoY += v(14);
    field("Project", po.project_name, col1, infoY);
    field("Requested Date", dateOr(po.requested_date), col2, infoY);
    infoY += v(14);
    field("Delivery Date", dateOr(po.delivery_date), col1, infoY);
    field("Approved By", po.approved_by, col2, infoY);

    y += boxH + v(8);

    // Description
    if (po.description) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fs(9));
      doc.setTextColor(100, 100, 100);
      doc.text("DESCRIPTION", margin, y);
      y += v(5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const descLines = doc.splitTextToSize(po.description, contentW);
      doc.text(descLines, margin, y);
      y += descLines.length * v(5) + v(6);
    }

    // Line items table
    if (items.length > 0) {
      const rowH = v(7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fs(9));
      doc.setTextColor(100, 100, 100);
      doc.text("LINE ITEMS", margin, y);
      y += v(5);

      doc.setFillColor(16, 185, 129);
      doc.rect(margin, y, contentW, rowH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(fs(8));
      doc.text("Description", margin + 2, y + rowH * 0.7);
      doc.text("Qty", pageW - 85, y + rowH * 0.7, { align: "right" });
      doc.text("Unit Cost", pageW - 55, y + rowH * 0.7, { align: "right" });
      doc.text("Total", pageW - margin - 2, y + rowH * 0.7, { align: "right" });
      y += rowH;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      items.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentW, rowH, "F");
        }
        doc.setFontSize(fs(8));
        const descText = doc.splitTextToSize(item.description || "—", 90);
        doc.text(descText[0], margin + 2, y + rowH * 0.7);
        doc.text(String(item.quantity ?? "—"), pageW - 85, y + rowH * 0.7, { align: "right" });
        doc.text(`P${(item.cost_per_item || 0).toLocaleString()}`, pageW - 55, y + rowH * 0.7, { align: "right" });
        doc.text(`P${(item.total || 0).toLocaleString()}`, pageW - margin - 2, y + rowH * 0.7, { align: "right" });
        y += rowH;
      });

      doc.setDrawColor(16, 185, 129);
      doc.line(margin, y, pageW - margin, y);
      y += v(5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fs(9));
      doc.text("TOTAL AMOUNT", margin + 2, y);
      doc.text(peso(po.amount), pageW - margin - 2, y, { align: "right" });
      y += v(10);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fs(11));
      doc.setTextColor(30, 30, 30);
      doc.text(`Total Amount: ${peso(po.amount)}`, margin, y);
      y += v(10);
    }

    // Delivery notes
    if (po.delivery_notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fs(9));
      doc.setTextColor(100, 100, 100);
      doc.text("DELIVERY NOTES", margin, y);
      y += v(5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(60, 60, 60);
      const noteLines = doc.splitTextToSize(po.delivery_notes, contentW);
      doc.text(noteLines, margin, y);
      y += noteLines.length * v(5) + v(6);
    }

    y += v(10);

    // Signature section
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, margin + 65, y);
    doc.line(pageW - margin - 65, y, pageW - margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs(8));
    doc.setTextColor(100, 100, 100);
    doc.text("Received by / Signature", margin, y + v(5));
    doc.text("Authorized by / Signature", pageW - margin - 65, y + v(5));
    y += v(18);
    doc.line(margin, y, margin + 65, y);
    doc.line(pageW - margin - 65, y, pageW - margin, y);
    doc.text("Printed Name & Date", margin, y + v(5));
    doc.text("Printed Name & Date", pageW - margin - 65, y + v(5));
    y += v(12);

    doc.setFontSize(fs(7));
    doc.setTextColor(160, 160, 160);
    doc.text("This is a system-generated Notice of Delivery.", pageW / 2, y, { align: "center" });

    // ── Receiving Copy stub — same page, cut along dashed line ──
    let sy = y + v(10);
    doc.setDrawColor(150, 150, 150);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, sy, pageW - margin, sy);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(fs(7));
    doc.setTextColor(140, 140, 140);
    doc.text("Cut along this line", pageW - margin, sy - 2, { align: "right" });

    sy += v(6);
    if (logo) {
      const stubW = v(30);
      doc.addImage(logo.dataUrl, "JPEG", margin, sy, stubW, stubW * logo.ratio);
      sy += stubW * logo.ratio + v(5);
    } else {
      sy += v(8);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs(12));
    doc.setTextColor(30, 30, 30);
    doc.text("RECEIVING COPY", margin, sy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs(8));
    doc.setTextColor(100, 100, 100);
    doc.text("Notice of Delivery", pageW - margin, sy, { align: "right" });

    sy += v(10);
    doc.setFontSize(fs(9));
    const sCol2 = pageW / 2 + v(5);
    field("PO Number", po.po_number, margin, sy);
    field("Supplier", po.supplier_name, sCol2, sy);
    sy += v(12);
    field("Project", po.project_name, margin, sy);
    field("Delivery Date", dateOr(po.delivery_date), sCol2, sy);
    sy += v(12);
    field("Total Amount", peso(po.amount), margin, sy);

    sy += v(20);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, sy, margin + 65, sy);
    doc.line(pageW - margin - 65, sy, pageW - margin, sy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs(8));
    doc.setTextColor(100, 100, 100);
    doc.text("Received by / Signature", margin, sy + v(5));
    doc.text("Date", pageW - margin - 65, sy + v(5));

    doc.setFontSize(fs(7));
    doc.setTextColor(160, 160, 160);
    doc.text("This stub confirms receipt of the goods/services listed above.", pageW / 2, sy + v(14), { align: "center" });

    doc.save(`NOD-${po.po_number || po.id}-${format(new Date(), "yyyyMMdd")}.pdf`);
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
      <FileDown className="w-3.5 h-3.5 mr-1.5" /> Delivery Note
    </Button>
  );
}