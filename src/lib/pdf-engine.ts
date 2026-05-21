import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Bird, Pair, Cage } from '../types';
import QRCode from 'qrcode';

export const generateQRListPDF = async (
  items: any[], 
  type: 'bird' | 'pair' | 'cage', 
  width: number, 
  height: number, 
  isThermal: boolean,
  birds: Bird[]
) => {
  // Use a smaller factor for mm to points conversion to be safe, standard is 2.83465
  const doc = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: isThermal ? [width, height] : 'a4',
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i > 0) {
      if (isThermal) {
        doc.addPage([width, height], width > height ? 'landscape' : 'portrait');
      } else {
        // For non-thermal, we probably want them in a grid on A4, 
        // but for now let's stick to one per page or implement a grid logic.
        // Given the request for precision, we'll follow the thermal logic for simplicity 
        // if user specifically chose dims, or implement a grid later.
        doc.addPage('a4', width > height ? 'landscape' : 'portrait');
      }
    }

    const qrData = JSON.stringify({ t: type === 'bird' ? 'b' : type === 'pair' ? 'p' : 'c', id: item.id });
    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, errorCorrectionLevel: 'H' });

    const x = 0;
    const y = 0;

    // Draw QR Code
    const qrSize = Math.min(width, height) * 0.8;
    const qrX = (width - qrSize) / 2;
    const qrY = (height - qrSize) / 2;
    
    // If landscape and wide, put QR on left
    if (width > height * 1.5) {
        const sideQrSize = height * 0.8;
        doc.addImage(qrDataUrl, 'PNG', 2, (height - sideQrSize) / 2, sideQrSize, sideQrSize);
        
        // Text on right
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        let textX = sideQrSize + 5;
        let textY = height / 2 - 2;
        
        if (type === 'bird') {
            const b = item as Bird;
            doc.text(b.name, textX, textY);
            doc.setFontSize(6);
            doc.text(`${b.species} ${b.subSpecies || ''}`, textX, textY + 4);
        } else if (type === 'pair') {
            const pair = item as Pair;
            const male = birds.find(b => b.id === pair.maleId);
            const female = birds.find(b => b.id === pair.femaleId);
            doc.text(`M: ${male?.name || '?'}`, textX, textY);
            doc.text(`F: ${female?.name || '?'}`, textX, textY + 4);
        } else {
            doc.text(item.name, textX, textY);
        }
    } else {
        // Centered QR
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY - (height * 0.1), qrSize, qrSize);
        
        // Text below
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        if (type === 'bird') {
            doc.text((item as Bird).name, width / 2, height - (height * 0.1), { align: 'center' });
        } else if (type === 'pair') {
            doc.text('Pair Label', width / 2, height - (height * 0.1), { align: 'center' });
        } else {
            doc.text(item.name, width / 2, height - (height * 0.1), { align: 'center' });
        }
    }
  }

  doc.save(`QR_Labels_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateBirdListPDF = (birds: Bird[], cages: Cage[], layout: 'vertical' | 'horizontal' = 'vertical', isEmpty = false) => {
  const doc = new jsPDF({
    orientation: layout === 'horizontal' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const title = isEmpty ? 'Observation Sheet - Birds' : 'Aviary Records - Bird List';
  const dateStr = format(new Date(), 'PPPP');

  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${dateStr}`, 14, 28);

  const head = [['Cage', 'Sex', 'ID / Ring', 'Species', 'Sub-Species', 'Mutation', 'Split']];
  
  let body: any[] = [];
  if (isEmpty) {
    const rowCount = layout === 'horizontal' ? 14 : 24;
    body = Array.from({ length: rowCount }).map(() => ['', '', '', '', '', '', '']);
  } else {
    body = birds.map(bird => {
      const cage = cages.find(c => c.id === bird.cageId);
      return [
        cage?.name || '-',
        bird.sex?.charAt(0) || '?',
        bird.name,
        bird.species || '-',
        bird.subSpecies || '-',
        bird.mutations?.join(', ') || 'Normal',
        bird.splitMutations?.join(', ') || '-'
      ];
    });
  }

  autoTable(doc, {
    head: head,
    body: body,
    startY: 35,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      valign: 'middle',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 35, fontStyle: 'bolditalic' },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 35 },
      6: { cellWidth: 35 },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} - Generated via Averian Aviary Management System`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    }
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateCageListPDF = (cages: Cage[], layout: 'vertical' | 'horizontal' = 'vertical', isEmpty = false) => {
  const doc = new jsPDF({
    orientation: layout === 'horizontal' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const title = isEmpty ? 'Observation Sheet - Cages' : 'Aviary Records - Cage List';
  const dateStr = format(new Date(), 'PPPP');

  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${dateStr}`, 14, 28);

  const head = [['Cage ID / Number', 'Location', 'Type']];
  
  let body: any[] = [];
  if (isEmpty) {
    const rowCount = layout === 'horizontal' ? 14 : 24;
    // For blank, we can triple the columns to save space if portrait
    if (layout === 'vertical') {
        const headTriple = [['Cage ID', 'Location', 'Type', 'Cage ID', 'Location', 'Type', 'Cage ID', 'Location', 'Type']];
        const bodyTriple = Array.from({ length: 24 }).map(() => ['', '', '', '', '', '', '', '', '']);
        autoTable(doc, {
            head: headTriple,
            body: bodyTriple,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] }
        });
    } else {
        body = Array.from({ length: 14 }).map(() => ['', '', '']);
        autoTable(doc, {
            head: head,
            body: body,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] }
        });
    }
  } else {
    body = cages.map(cage => [
      cage.name,
      cage.location || '-',
      cage.type || '-'
    ]);
    autoTable(doc, {
        head: head,
        body: body,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] }
    });
  }

  doc.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generatePairListPDF = (pairs: Pair[], birds: Bird[], cages: Cage[], layout: 'vertical' | 'horizontal' = 'vertical', isEmpty = false) => {
  const doc = new jsPDF({
    orientation: layout === 'horizontal' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const title = isEmpty ? 'Observation Sheet - Breeding Pairs' : 'Aviary Records - Breeding Pairs';
  const dateStr = format(new Date(), 'PPPP');

  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${dateStr}`, 14, 28);

  const head = [['Cage', 'Sex', 'ID / Ring', 'Species', 'Sub-Species', 'Mutation', 'Split']];
  
  let body: any[] = [];
  if (isEmpty) {
    const rowCount = layout === 'horizontal' ? 7 : 12;
    // Each pair takes 2 rows in the visual list
    for (let i = 0; i < rowCount; i++) {
        body.push(['', 'M', '', '', '', '', '']);
        body.push(['', 'F', '', '', '', '', '']);
    }
  } else {
    pairs.forEach(pair => {
      const male = birds.find(b => b.id === pair.maleId);
      const female = birds.find(b => b.id === pair.femaleId);
      const mCage = cages.find(c => c.id === male?.cageId);
      const fCage = cages.find(c => c.id === female?.cageId);
      
      body.push([
        mCage?.name || '-',
        'M',
        male?.name || 'Empty',
        male?.species || '-',
        male?.subSpecies || '-',
        male?.mutations?.join(', ') || '-',
        male?.splitMutations?.join(', ') || '-'
      ]);
      body.push([
        fCage?.name || '-',
        'F',
        female?.name || 'Empty',
        female?.species || '-',
        female?.subSpecies || '-',
        female?.mutations?.join(', ') || '-',
        female?.splitMutations?.join(', ') || '-'
      ], { isFemale: true }); // Tag for coloring
    });
  }

  autoTable(doc, {
    head: head,
    body: body,
    startY: 35,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 3, 
      textColor: [0, 0, 0], 
      lineColor: [0, 0, 0], 
      lineWidth: 0.1 
    },
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] },
    didParseCell: (data) => {
        if (data.section === 'body') {
            // Check if it's the second row of a pair
            if (data.row.index % 2 !== 0) {
                data.cell.styles.fillColor = [255, 241, 242]; // Light pink
            } else {
                data.cell.styles.fillColor = [239, 246, 255]; // Light blue
            }
        }
    }
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateCertificatePDF = (selectedBirds: Bird[], birds: Bird[]) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'cm',
    format: 'a4',
  });

  selectedBirds.forEach((bird, index) => {
    if (index > 0) doc.addPage('a4', 'landscape');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Border
    doc.setLineWidth(0.2);
    doc.setDrawColor(200, 200, 200);
    doc.rect(1, 1, pageWidth - 2, pageHeight - 2);
    doc.setLineWidth(0.1);
    doc.rect(1.2, 1.2, pageWidth - 2.4, pageHeight - 2.4);

    // Title
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.text('Pedigree Certificate', pageWidth / 2, 3, { align: 'center' });
    
    doc.setDrawColor(180, 180, 180);
    doc.line(4, 3.5, pageWidth - 4, 3.5);

    // Basic Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('BIRD NAME / RING NO.', 2, 5);
    doc.text('SPECIES', 2, 7.5);
    doc.text('HATCH DATE', pageWidth - 8, 5);
    doc.text('SEX', pageWidth - 8, 7.5);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.text(bird.name, 2, 6.2);
    doc.setFontSize(14);
    doc.text(`${bird.species} ${bird.subSpecies || ''}`, 2, 8.5);
    
    doc.setFontSize(14);
    doc.text(bird.birthDate || 'Unknown', pageWidth - 8, 6.2);
    doc.text(bird.sex || 'Unknown', pageWidth - 8, 8.5);

    // Mutations
    doc.line(2, 9.5, pageWidth - 2, 9.5);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('MUTATIONS & GENETICS', 2, 10.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(bird.mutations?.join(' • ') || 'Normal / Wild Type', 2, 11.5);
    if (bird.splitMutations?.length) {
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Split for: ${bird.splitMutations.join(', ')}`, 2, 12.2);
    }
    doc.line(2, 13, pageWidth - 2, 13);

    // Tree Layout
    const startY = 14;
    const boxWidth = 6.5;
    const boxHeight = 1.5;

    // Subject
    doc.setFillColor(245, 245, 245);
    doc.rect(2, startY + 2, boxWidth, boxHeight, 'F');
    doc.setDrawColor(150, 150, 150);
    doc.rect(2, startY + 2, boxWidth, boxHeight);
    doc.setFontSize(8);
    doc.text('SUBJECT', 2.3, startY + 2.4);
    doc.setFontSize(12);
    doc.text(bird.name, 2.3, startY + 3.2);

    // Parents
    const sire = birds.find(b => b.id === bird.fatherId);
    const dam = birds.find(b => b.id === bird.motherId);

    // Sire
    doc.rect( pageWidth / 2 - boxWidth / 2, startY, boxWidth, boxHeight);
    doc.setFontSize(8);
    doc.text('SIRE (FATHER)', pageWidth / 2 - boxWidth / 2 + 0.3, startY + 0.4);
    doc.setFontSize(12);
    doc.text(sire?.name || 'Unknown', pageWidth / 2 - boxWidth / 2 + 0.3, startY + 1.2);

    // Dam
    doc.rect( pageWidth / 2 - boxWidth / 2, startY + 4, boxWidth, boxHeight);
    doc.setFontSize(8);
    doc.text('DAM (MOTHER)', pageWidth / 2 - boxWidth / 2 + 0.3, startY + 4.4);
    doc.setFontSize(12);
    doc.text(dam?.name || 'Unknown', pageWidth / 2 - boxWidth / 2 + 0.3, startY + 5.2);

    // Grandparents
    const gsP = birds.find(b => b.id === sire?.fatherId);
    const gdP = birds.find(b => b.id === sire?.motherId);
    const gsM = birds.find(b => b.id === dam?.fatherId);
    const gdM = birds.find(b => b.id === dam?.motherId);

    const gpX = pageWidth - 2 - boxWidth;
    
    // GS P
    doc.rect(gpX, startY - 0.5, boxWidth, boxHeight - 0.2);
    doc.setFontSize(7);
    doc.text('PATERNAL GRANDSIRE', gpX + 0.2, startY - 0.1);
    doc.setFontSize(10);
    doc.text(gsP?.name || 'Unknown', gpX + 0.2, startY + 0.5);

    // GD P
    doc.rect(gpX, startY + 1.2, boxWidth, boxHeight - 0.2);
    doc.setFontSize(7);
    doc.text('PATERNAL GRANDDAM', gpX + 0.2, startY + 1.6);
    doc.setFontSize(10);
    doc.text(gdP?.name || 'Unknown', gpX + 0.2, startY + 2.2);

    // GS M
    doc.rect(gpX, startY + 3.5, boxWidth, boxHeight - 0.2);
    doc.setFontSize(7);
    doc.text('MATERNAL GRANDSIRE', gpX + 0.2, startY + 3.9);
    doc.setFontSize(10);
    doc.text(gsM?.name || 'Unknown', gpX + 0.2, startY + 4.5);

    // GD M
    doc.rect(gpX, startY + 5.2, boxWidth, boxHeight - 0.2);
    doc.setFontSize(7);
    doc.text('MATERNAL GRANDDAM', gpX + 0.2, startY + 5.6);
    doc.setFontSize(10);
    doc.text(gdM?.name || 'Unknown', gpX + 0.2, startY + 6.2);

    // Footer
    doc.line(2, pageHeight - 3, pageWidth - 2, pageHeight - 3);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('BREEDER SIGNATURE', 2, pageHeight - 2.5);
    doc.line(2, pageHeight - 1.2, 7, pageHeight - 1.2);

    doc.setFontSize(8);
    doc.text('Generated via Averian Aviary Management System', pageWidth / 2, pageHeight - 1, { align: 'center' });
  });

  doc.save(`Pedigree_Certificates_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
