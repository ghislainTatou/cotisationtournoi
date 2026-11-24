import type { Member, Settings } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export async function exportPdf(rows: Member[], settings: Settings, kind: "paid" | "remaining"): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const title = kind === "paid" ? "Liste des membres ayant payé" : "Liste des membres restants";
  const generatedAt = new Date();

  doc.setFontSize(17);
  doc.setTextColor(22, 101, 52);
  doc.text(settings.tournamentName, 14, 16);

  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 24);

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Date limite : ${formatDate(settings.deadline)}   |   Édité le : ${formatDate(generatedAt.toISOString())}   |   Total : ${rows.length} membre(s)`,
    14,
    30,
  );
  const totalLabel = kind === "paid" ? "Total versé" : "Reste à percevoir";
  const totalAmount =
    kind === "paid"
      ? rows.reduce((sum, m) => sum + m.paidAmount, 0)
      : rows.reduce((sum, m) => sum + m.remainingAmount, 0);
  doc.text(`${totalLabel} : ${formatMoney(totalAmount)}`, 14, 35);

  const columns =
    kind === "paid"
      ? ["N°", "Nom", "Téléphone", "Catégorie", "Montant payé", "Date paiement", "Référence"]
      : [
          "N°",
          "Nom",
          "Téléphone",
          "Catégorie",
          "Montant dû",
          "Déjà payé",
          "Reste",
          "Statut",
          "Inscription",
        ];

  const body = rows.map((member, index) =>
    kind === "paid"
      ? [
          String(index + 1),
          member.fullName,
          member.phone,
          member.categoryName,
          formatMoney(member.paidAmount),
          formatDate(member.payment?.paidAt),
          member.payment?.reference ?? "—",
        ]
      : [
          String(index + 1),
          member.fullName,
          member.phone,
          member.categoryName,
          formatMoney(member.amount),
          formatMoney(member.paidAmount),
          formatMoney(member.remainingAmount),
          member.status === "partial" ? "Acompte" : "En attente",
          formatDate(member.createdAt),
        ],
  );

  autoTable(doc, {
    head: [columns],
    body,
    startY: 40,
    styles: { fontSize: 9, cellPadding: 2.5, valign: "middle" },
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 248, 245] },
    margin: { left: 14, right: 14, bottom: 16 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 45 },
      2: { cellWidth: 38 },
      3: { cellWidth: 35 },
    },
  });

  const fileName = `${settings.tournamentName.replace(/[^\w-]/g, "_")}_${kind === "paid" ? "payes" : "restants"}.pdf`;
  doc.save(fileName);
}
