import { AUCTION_STATUS_LABELS } from "@/lib/auction";

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
    const mimeType = blob.type.toLowerCase();
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const supportsNativePng = mimeType.includes("png");
    const supportsNativeJpeg = mimeType.includes("jpeg") || mimeType.includes("jpg");
    const needsConversion = mimeType.includes("webp") || mimeType.includes("svg");

    if (!supportsNativePng && !supportsNativeJpeg && !needsConversion) {
      return null;
    }

    if (!needsConversion) {
      return {
        dataUrl: rawDataUrl,
        format: supportsNativePng ? "PNG" : "JPEG",
      };
    }

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (event) => reject(event);
        img.src = rawDataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width || 1;
      canvas.height = image.naturalHeight || image.height || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }
      ctx.drawImage(image, 0, 0);
      const convertedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      return { dataUrl: convertedDataUrl, format: "JPEG" };
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function generateAuctionReportPdf(auction: any, selectedBidId?: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const article = auction?.articles;
  const bids = [...(auction?.bids || [])].sort((a: any, b: any) => b.amount - a.amount);
  const winner = selectedBidId
    ? bids.find((bid: any) => bid.id === selectedBidId)
    : bids[0];

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
  doc.roundedRect(9, 8, pageWidth - 18, pageHeight - 16, 2, 2, "S");

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

export async function generateAuctionsDateReportPdf(auctions: any[], reportDate: string) {
  const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 11;
  const contentWidth = pageWidth - margin * 2;
  const contentLeft = margin;
  const contentRight = contentLeft + contentWidth;

  const reportLabel = formatDateOnly(reportDate);
  const logoImage = await loadImageAsDataUrl(`${window.location.origin}/logo.png`);

  // Outer page border
  doc.setDrawColor(222, 226, 230);
  doc.setLineWidth(0.4);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 3, 3, "S");

  // Header
  if (logoImage) {
    doc.addImage(logoImage.dataUrl, logoImage.format, contentLeft, 12, 28, 10);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(34, 40, 49);
  doc.text("RAPPORT JOURNALIER DES ENCHERES", pageWidth / 2, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(102, 108, 125);
  doc.text(
    "Document consolidé des enchères terminées - Top 3 offres par article",
    pageWidth / 2,
    23,
    { align: "center" },
  );

  doc.setFillColor(255, 91, 10);
  doc.rect(contentLeft, 25, contentWidth, 2, "F");

  // Info cards
  const cardY = 29;
  const cardH = 20;
  const cardW = (contentWidth - 10) / 2;
  doc.setDrawColor(217, 221, 225);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(contentLeft, cardY, cardW, cardH, 3, 3, "FD");
  doc.roundedRect(contentLeft + cardW + 10, cardY, cardW, cardH, 3, 3, "FD");

  doc.setFillColor(255, 91, 10);
  doc.roundedRect(contentLeft + 4, cardY + 2, 18, 2, 1, 1, "F");
  doc.roundedRect(contentLeft + cardW + 14, cardY + 2, 18, 2, 1, 1, "F");

  doc.setFontSize(7.5);
  doc.setTextColor(102, 108, 125);
  doc.text("DATE DU RAPPORT", contentLeft + 4, cardY + 8);
  doc.text("TOTAL ENCHERES", contentLeft + cardW + 14, cardY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(34, 40, 49);
  doc.text(reportLabel, contentLeft + 4, cardY + 15);
  doc.text(String(auctions.length), contentLeft + cardW + 14, cardY + 15);

  // Table header
  const tableTop = cardY + cardH + 10;
  const rowHeight = 13;
  const blockHeight = rowHeight * 3;
  const rowGap = 3;

  const colWidths = {
    article: 36,
    image: 28,
    reference: 28,
    price: 28,
    offer: 33,
    date: 24,
    winner: 50,
    matricule: 20,
  };

  const colX = {
    article: contentLeft,
    image: contentLeft + colWidths.article,
    reference: contentLeft + colWidths.article + colWidths.image,
    price: contentLeft + colWidths.article + colWidths.image + colWidths.reference,
    offer:
      contentLeft + colWidths.article + colWidths.image + colWidths.reference + colWidths.price,
    date:
      contentLeft + colWidths.article + colWidths.image + colWidths.reference + colWidths.price +
      colWidths.offer,
    winner:
      contentLeft + colWidths.article + colWidths.image + colWidths.reference + colWidths.price +
      colWidths.offer + colWidths.date,
    matricule:
      contentLeft + colWidths.article + colWidths.image + colWidths.reference + colWidths.price +
      colWidths.offer + colWidths.date + colWidths.winner,
  };

  // Header row background
  doc.setFillColor(255, 91, 10);
  doc.setDrawColor(255, 91, 10);
  doc.rect(contentLeft, tableTop, contentWidth, rowHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Article", colX.article + colWidths.article / 2, tableTop + 8, {
    align: "center",
  });
  doc.text("Image", colX.image + colWidths.image / 2, tableTop + 8, { align: "center" });
  doc.text("Référence", colX.reference + colWidths.reference / 2, tableTop + 8, {
    align: "center",
  });
  doc.text("Prix Article", colX.price + colWidths.price / 2, tableTop + 8, {
    align: "center",
  });
  doc.text("Offre proposée", colX.offer + colWidths.offer / 2, tableTop + 8, {
    align: "center",
  });
  doc.text("Date d'enchère", colX.date + colWidths.date / 2, tableTop + 8, {
    align: "center",
  });
  doc.text("Nom du gagnant", colX.winner + colWidths.winner / 2, tableTop + 8, {
    align: "center",
  });
  doc.text("Matricule", colX.matricule + colWidths.matricule / 2, tableTop + 8, {
    align: "center",
  });

  doc.setDrawColor(217, 221, 225);
  doc.setLineWidth(0.2);
  doc.line(contentLeft, tableTop + rowHeight, contentRight, tableTop + rowHeight);
  for (const key of ["image", "reference", "price", "offer", "date", "winner", "matricule"] as const) {
    const x = colX[key];
    doc.line(x, tableTop, x, tableTop + rowHeight);
  }
  doc.line(contentRight, tableTop, contentRight, tableTop + rowHeight);

  let cursorY = tableTop + rowHeight;

  for (const auction of auctions) {
    const article = auction.articles || {};
    const bids = [...(auction.bids || [])].sort((a: any, b: any) => b.amount - a.amount);
    const topBids = bids.slice(0, 3);
    const articleImageUrl = article.article_images?.[0]?.image_url;
    const articleImage = articleImageUrl ? await loadImageAsDataUrl(articleImageUrl) : null;

    if (cursorY + blockHeight + margin > pageHeight - 12) {
      doc.addPage();
      cursorY = 12;

      // Repeat header on second page if needed
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(34, 40, 49);
      doc.text("RAPPORT JOURNALIER DES ENCHERES", pageWidth / 2, cursorY + 6, { align: "center" });
      cursorY += 12;
    }

    const blockX = contentLeft;
    const blockY = cursorY;
    doc.setDrawColor(217, 221, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(blockX, blockY, contentWidth, blockHeight, 3, 3, "FD");

    // Draw horizontal separators for each offer row
    doc.setDrawColor(217, 221, 225);
    doc.setLineWidth(0.2);
    doc.line(blockX, blockY + rowHeight, contentRight, blockY + rowHeight);
    doc.line(blockX, blockY + rowHeight * 2, contentRight, blockY + rowHeight * 2);

    // Vertical separators
    doc.line(colX.image, blockY, colX.image, blockY + blockHeight);
    doc.line(colX.reference, blockY, colX.reference, blockY + blockHeight);
    doc.line(colX.price, blockY, colX.price, blockY + blockHeight);
    doc.line(colX.offer, blockY, colX.offer, blockY + blockHeight);
    doc.line(colX.date, blockY, colX.date, blockY + blockHeight);
    doc.line(colX.winner, blockY, colX.winner, blockY + blockHeight);
    doc.line(colX.matricule, blockY, colX.matricule, blockY + blockHeight);
    doc.line(contentRight, blockY, contentRight, blockY + blockHeight);

    // Article cell
    const articleCenterX = colX.article + colWidths.article / 2;
    const articleCenterY = blockY + blockHeight / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(34, 40, 49);
    const articleLines = doc.splitTextToSize(truncateText(article.title || "-", 80), colWidths.article - 6);
    const articleTextHeight = articleLines.length * 4.2;
    const articleTextY = articleCenterY - articleTextHeight / 2 + 2;
    doc.text(articleLines, articleCenterX, articleTextY, { align: "center" });

    // Image cell
    if (articleImage) {
      const imageX = colX.image + 2;
      const imageY = blockY + 2;
      const imageW = colWidths.image - 4;
      const imageH = blockHeight - 4;
      doc.addImage(articleImage.dataUrl, articleImage.format, imageX, imageY, imageW, imageH);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(102, 108, 125);
      doc.text("Aucune image", colX.image + colWidths.image / 2, blockY + blockHeight / 2, {
        align: "center",
      });
    }

    // Reference cell
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(102, 108, 125);
    doc.text(
      toPdfText(article.reference_article?.trim() || article.id || "SANS-REF"),
      colX.reference + colWidths.reference / 2,
      articleCenterY - 3,
      { align: "center" },
    );

    // Price cell
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(34, 40, 49);
    doc.text(
      toPdfText(formatCurrency(article.starting_price)),
      colX.price + colWidths.price / 2,
      articleCenterY - 3,
      { align: "center" },
    );

    // Offers rows
    for (let index = 0; index < 3; index++) {
      const bid = topBids[index];
      const rowY = blockY + rowHeight * index;
      const rowMiddleY = rowY + rowHeight / 2 + 1;

      // Rank badge
      const badgeX = colX.offer + 2;
      const badgeY = rowY + 2;
      const badgeSize = 9;
      if (index === 0) doc.setFillColor(255, 195, 0);
      else if (index === 1) doc.setFillColor(192, 192, 192);
      else doc.setFillColor(237, 159, 61);
      doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(index + 1), badgeX + badgeSize / 2, badgeY + badgeSize - 2, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(34, 40, 49);
      const amountX = badgeX + badgeSize + 3;
      doc.text(
        bid ? formatCurrency(bid.amount) : "-",
        amountX,
        rowMiddleY,
        { align: "left" },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(102, 108, 125);
      doc.text(
        bid ? toPdfText(formatDateOnly(auction.end_date)) : "-",
        colX.date + colWidths.date / 2,
        rowMiddleY,
        { align: "center" },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(34, 40, 49);
      const winnerName = bid ? truncateText(bid.profiles?.name || bid.profiles?.email || "-", 18) : "-";
      doc.text(winnerName, colX.winner + 2, rowMiddleY, { align: "left" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(102, 108, 125);
      doc.text(
        bid ? toPdfText(bid.profiles?.matricule || "-") : "-",
        colX.matricule + colWidths.matricule / 2,
        rowMiddleY,
        { align: "center" },
      );
    }

    cursorY += blockHeight + rowGap;
  }

  const fileName = `rapport-encheres-${sanitizeFileName(reportDate)}.pdf`;
  doc.save(fileName);
}

