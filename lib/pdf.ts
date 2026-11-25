import type { AccountingData, Member, Settings } from "@/lib/types";
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
          member.payment?.reference ?? "-",
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

export async function exportAccountingPdf(
  accounting: AccountingData,
  settings: Settings,
): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const generatedAt = new Date();
  const sorted = [...accounting.entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const period =
    sorted.length > 0
      ? `${formatDate(sorted[0].createdAt)} -> ${formatDate(sorted[sorted.length - 1].createdAt)}`
      : "Aucun mouvement";

  doc.setFontSize(17);
  doc.setTextColor(22, 101, 52);
  doc.text(settings.tournamentName, 14, 16);

  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Rapport de comptabilité", 14, 24);

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Édité le : ${formatDate(generatedAt.toISOString())}   |   Période : ${period}   |   ${sorted.length} mouvement(s)`,
    14,
    30,
  );

  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text(`Total entrées : ${formatMoney(accounting.income)}`, 14, 37);
  doc.setTextColor(190, 45, 45);
  doc.text(`Total sorties : ${formatMoney(accounting.expense)}`, 105, 37);
  doc.setTextColor(22, 101, 52);
  doc.text(`Solde global : ${formatMoney(accounting.balance)}`, 196, 37);

  const body = sorted.map((entry, index) => [
    String(index + 1),
    formatDate(entry.createdAt),
    entry.kind === "income" ? "Entrée" : "Sortie",
    entry.label,
    entry.observation ?? "-",
    entry.source === "cotisation" ? "Cotisation" : "Manuel",
    `${entry.kind === "income" ? "+" : "-"}${formatMoney(entry.amount)}`,
  ]);

  autoTable(doc, {
    head: [["N°", "Date", "Type", "Libellé", "Observation", "Origine", "Montant"]],
    body,
    startY: 42,
    styles: { fontSize: 9, cellPadding: 2.5, valign: "middle" },
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 248, 245] },
    margin: { left: 14, right: 14, bottom: 16 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 34 },
      2: { cellWidth: 20 },
      3: { cellWidth: 55 },
      4: { cellWidth: 85 },
      5: { cellWidth: 24 },
      6: { cellWidth: 39, halign: "right" },
    },
  });

  const fileName = `${settings.tournamentName.replace(/[^\w-]/g, "_")}_comptabilite.pdf`;
  doc.save(fileName);
}
