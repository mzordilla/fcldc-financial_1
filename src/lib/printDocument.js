import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const printCss = (landscape) => `
  @page { size: A4 ${landscape ? "landscape; margin: 8mm" : "portrait; margin: 12mm"}; }
  .print-wide { font-size: 8px !important; }
  html, body { background: #fff !important; }
  body * { visibility: visible !important; }
  .print-doc { width: 100% !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
  tr, .avoid-break { break-inside: avoid; }
`;

// Opens the element in a clean window with the app's styles and prints it on A4 portrait.
export function printElement(el, title, landscape = false) {
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join("");
  const w = window.open("", "_blank");
  w.document.write(`<!doctype html><html><head><base href="${window.location.origin}/">${styles}<style>${printCss(landscape)}</style></head><body>${el.outerHTML}</body></html>`);
  w.document.close();
  w.document.title = title;
  setTimeout(() => { w.focus(); w.print(); }, 600);
}

// Saves the element as a multi-page A4 PDF.
export async function exportElementPdf(el, fileName) {
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.95);
  for (let y = 0; y < imgH; y += pageH) {
    if (y > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, -y, pageW, imgH);
  }
  pdf.save(fileName);
}