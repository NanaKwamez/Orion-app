import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatGhs } from "@/lib/money";

export type PdfReportRow = {
  memberName: string;
  tithe: number;
  systematic: number;
  thanksgiving: number;
};

export function createWeeklyReportPdf(
  churchName: string,
  sabbathDate: string,
  rows: PdfReportRow[],
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("ORION Weekly Church Report", 14, 18);
  doc.setFontSize(11);
  doc.text(churchName, 14, 28);
  doc.text(`Sabbath: ${sabbathDate}`, 14, 35);
  autoTable(doc, {
    startY: 42,
    head: [["Member", "Tithe", "Systematic", "Thanksgiving"]],
    body: rows.map((row) => [
      row.memberName,
      formatGhs(row.tithe),
      formatGhs(row.systematic),
      formatGhs(row.thanksgiving),
    ]),
  });
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
  doc.text("Treasurer signature: ____________________", 14, finalY + 25);
  doc.text("District Administrator: ____________________", 112, finalY + 25);
  return doc;
}
