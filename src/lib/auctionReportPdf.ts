type LoadedImage = {
  dataUrl: string;
  format: "PNG" | "JPEG" | "WEBP";
};

function toPdfText(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00a0|\u202f/g, " ")
    .replace(/[^\x20-\x7E\u00B0\n]/g, " ");
}

function formatCurrency(amount?: number | null) {
  if (amount === null || amount === undefined) return "-";

  const wholeNumber = Math.round(Number(amount));
  const formatted = wholeNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} FCFA`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function buildWinnerMessage(winnerName: string, articleTitle: string, amount: number) {
  return `Felicitations ${winnerName}. Nous avons le plaisir de vous confirmer que vous etes l'heureux gagnant de l'article ${articleTitle} avec une offre proposee de ${formatCurrency(amount)}. Toute l'equipe SICMA vous remercie pour votre confiance.`;
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function truncateText(value: string, maxLength: number) {
  const normalized = toPdfText(value).replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

async function loadImageAsDataUrl(url: string): Promise<LoadedImage | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const mimeType = blob.type.toLowerCase();
    const format = mimeType.includes("png")
      ? "PNG"
      : mimeType.includes("webp")
        ? "WEBP"
        : "JPEG";

    return { dataUrl, format };
  } catch {
    return null;
  }
}

export async function generateAuctionReportPdf(auction: any) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const article = auction?.articles;
  const bids = [...(auction?.bids || [])].sort((a: any, b: any) => b.amount - a.amount);
  const winner = bids[0];

  if (!article) {
    throw new Error("Article introuvable pour cette enchere.");
  }

  if (!winner) {
    throw new Error("Impossible de generer le rapport sans offre gagnante.");
  }

  const winnerName = winner.profiles?.name || winner.profiles?.email || "Client gagnant";
  const winnerMatricule = winner.profiles?.matricule || "-";
  const bestAmount = winner.amount ?? 0;
  const articleImageUrl = article.article_images?.[0]?.image_url;
  const reportReference = article.reference_article?.trim() || article.id || "SANS-REFERENCE";

  const [logoImage, articleImage] = await Promise.all([
    loadImageAsDataUrl(`${window.location.origin}/logo.png`),
    articleImageUrl ? loadImageAsDataUrl(articleImageUrl) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = 245;
  const contentLeft = (pageWidth - contentWidth) / 2;
  const contentRight = contentLeft + contentWidth;
  const headerTextLeft = contentLeft + 84;
  const tableWidth = 245;
  const message = toPdfText(buildWinnerMessage(winnerName, article.title || "Article", bestAmount));
  doc.setDrawColor(222, 226, 230);
  doc.setLineWidth(0.4);
  doc.roundedRect(9, 8, pageWidth - 18, pageHeight - 16, 2, 2);

  if (logoImage) {
    doc.addImage(logoImage.dataUrl, logoImage.format, contentLeft, 12, 24, 11);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(24, 29, 37);
  doc.text(toPdfText(`RAPPORT D'ENCHERE N${String.fromCharCode(176)} ${reportReference}`), headerTextLeft, 18.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(98, 108, 125);
  doc.text("Document emis par SICMA pour formaliser le resultat de l'enchere", headerTextLeft, 23);

  doc.setDrawColor(238, 97, 31);
  doc.setLineWidth(0.8);
  doc.line(contentLeft, 29, contentRight, 29);

  doc.setDrawColor(228, 232, 238);
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(contentLeft, 34, 78, 16, 2, 2, "FD");
  doc.roundedRect(contentRight - 78, 34, 78, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(98, 108, 125);
  doc.text("REFERENCE ARTICLE", contentLeft + 4, 40);
  doc.text("MATRICULE", contentRight - 74, 40);

  doc.setFontSize(11);
  doc.setTextColor(24, 29, 37);
  doc.text(toPdfText(reportReference), contentLeft + 4, 46);
  doc.text(toPdfText(winnerMatricule), contentRight - 74, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 66, 87);
  doc.setDrawColor(225, 229, 236);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(contentLeft, 55, contentWidth, 18, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 66, 87);
  doc.text(message, pageWidth / 2, 65.5, {
    align: "center",
    maxWidth: contentWidth - 12,
  });

  const tableBody = [[
    "",
    truncateText(article.title || "-", 48),
    toPdfText(article.description || "-"),
    toPdfText(formatDate(auction.end_date || article.date_fin_enchere || auction.start_date)),
    toPdfText(formatCurrency(article.starting_price)),
    toPdfText(formatCurrency(bestAmount)),
    truncateText(winnerName, 34),
  ]];

  autoTable(doc, {
    startY: 78,
    head: [[
      "Image",
      "Nom de l'article",
      "Description",
      "Date d'enchere",
      "Prix de depart",
      "Offre proposée",
      "Nom du gagnant",
    ]],
    body: tableBody,
    theme: "grid",
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 7.6,
      cellPadding: 2,
      textColor: [34, 40, 49],
      lineColor: [224, 224, 224],
      lineWidth: 0.2,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [238, 97, 31],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: {
      left: contentLeft,
      right: contentLeft,
    },
    tableWidth,
    columnStyles: {
      0: { cellWidth: 22, minCellHeight: 22, halign: "center" },
      1: { cellWidth: 28, halign: "center", overflow: "linebreak" },
      2: { cellWidth: 84, halign: "left", overflow: "linebreak" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 39, halign: "center", overflow: "linebreak" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0 && articleImage) {
        const padding = 1.8;
        const imageWidth = data.cell.width - padding * 2;
        const imageHeight = data.cell.height - padding * 2;

        doc.addImage(
          articleImage.dataUrl,
          articleImage.format,
          data.cell.x + padding,
          data.cell.y + padding,
          imageWidth,
          imageHeight,
        );
      }

      if (data.section === "body" && data.column.index === 2) {
        data.cell.styles.valign = "top";
        data.cell.styles.halign = "left";
      }
    },
  });

  const footerY = pageHeight - 42;
  const signatureBoxWidth = 92;
  const footerLeft = 24;
  const footerRight = pageWidth - 24;
  const leftFooterCenterX = footerLeft + signatureBoxWidth / 2;
  const rightFooterCenterX = footerRight - signatureBoxWidth / 2;

  doc.setTextColor(34, 40, 49);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Lu, approuve, date et signature du client", leftFooterCenterX, footerY + 5, {
    align: "center",
    maxWidth: signatureBoxWidth,
  });

  doc.text(toPdfText("Cachet, nom et signature"), rightFooterCenterX, footerY + 5, {
    align: "center",
    maxWidth: signatureBoxWidth,
  });
  const fileName = `rapport-enchere-${sanitizeFileName(String(reportReference)) || "reference"}.pdf`;
  doc.save(fileName);
}
