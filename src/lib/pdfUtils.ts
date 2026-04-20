import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TBJ_LOGO } from '../constants';
import { AIEstimateResponse } from '../types';

// Helper to convert image URL to Base64
const imageUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error converting image to base64:', e);
    return url; // Fallback
  }
};

export const generateRABPDF = async (
  projectName: string, 
  categories: any[], 
  items: any[], 
  customLogoUrl?: string,
  projectIdentity?: { name: string, location: string, client: string }
) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  
  // Convert logo to Base64 to avoid PNG signature errors
  const base64Logo = await imageUrlToBase64(logoUrl);

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 10, 30, 30);
  } catch (e) {
    console.error('Failed to add logo to PDF:', e);
    doc.rect(10, 10, 30, 30, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 18, 27);
  }
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TBJ HUB', 50, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Construction & Renovation Services', 50, 32);
  doc.text('Jakarta, Indonesia | www.tbjconstech.com', 50, 37);

  doc.line(10, 45, 200, 45);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RENCANA ANGGARAN BIAYA (RAB)', 10, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  let headerY = 65;
  if (projectIdentity) {
    doc.text(`NAMA PROYEK: ${projectIdentity.name.toUpperCase()}`, 10, headerY);
    doc.text(`LOKASI: ${projectIdentity.location.toUpperCase()}`, 10, headerY + 5);
    doc.text(`KLIEN: ${projectIdentity.client.toUpperCase()}`, 10, headerY + 10);
    headerY += 20;
  } else {
    doc.text(`PROJECT: ${projectName.toUpperCase()}`, 10, headerY);
    headerY += 10;
  }
  
  doc.setFont('helvetica', 'normal');
  doc.text(`TANGGAL: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 10, headerY);

  let currentY = headerY + 10;

  categories.forEach((cat) => {
    const catItems = items.filter(i => i.categoryId === cat.id);
    if (catItems.length === 0) return;

    // Check for page break
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(245, 245, 245);
    doc.rect(10, currentY - 5, 190, 8, 'F');
    doc.text(cat.name.toUpperCase(), 12, currentY);
    currentY += 8;

    const tableData = catItems.map(item => [
      { 
        content: `${item.name}${item.technicalSpecs ? `\nSpesifikasi: ${item.technicalSpecs}` : ''}`, 
        styles: { fontStyle: 'bold' } 
      },
      item.quantity,
      item.unit,
      `Rp ${item.pricePerUnit.toLocaleString('id-ID')}`,
      `Rp ${item.totalPrice.toLocaleString('id-ID')}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['URAIAN PEKERJAAN', 'QTY', 'UNIT', 'HARGA SATUAN', 'JUMLAH HARGA']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data: any) => {
        currentY = data.cursor.y;
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  });

  const totalBudget = items.reduce((acc, i) => acc + i.totalPrice, 0);
  
  // Final summary
  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.line(130, currentY, 200, currentY);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ESTIMASI BIAYA:', 110, currentY + 10);
  doc.text(`Rp ${totalBudget.toLocaleString('id-ID')}`, 200, currentY + 10, { align: 'right' });

  // Footer / Signature
  currentY += 30;
  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setFontSize(10);
  doc.text('Hormat Kami,', 150, currentY);
  doc.text('TBJ HUB', 150, currentY + 5);
  
  doc.line(140, currentY + 30, 190, currentY + 30);
  doc.text('Official Estimator', 150, currentY + 35);

  doc.save(`RAB-${projectName.replace(/\s+/g, '-')}.pdf`);
};

export const generatePOPDF = async (request: any, vendor: any, customLogoUrl?: string) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  const base64Logo = await imageUrlToBase64(logoUrl);

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 10, 30, 30);
  } catch (e) {
    console.error('Failed to add logo to PDF:', e);
    doc.rect(10, 10, 30, 30, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 18, 27);
  }
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TBJ HUB', 50, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Construction & Renovation Services', 50, 32);
  doc.text('Jakarta, Indonesia | www.tbjconstech.com', 50, 37);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', 140, 25);
  doc.setFontSize(9);
  doc.text(`NO: PO-${request.id.substring(0, 8).toUpperCase()}`, 140, 32);
  doc.text(`TGL: ${new Date(request.createdAt).toLocaleDateString('id-ID')}`, 140, 37);

  doc.line(10, 45, 200, 45);

  // Vendor Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDOR / SUPPLIER:', 10, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(vendor.name.toUpperCase(), 10, 62);
  doc.text(vendor.address || 'Alamat tidak tersedia', 10, 68);
  doc.text(`UP: Bagian Pengiriman`, 10, 74);
  doc.text(`WA: ${vendor.whatsapp}`, 10, 80);

  // Project Info
  doc.setFont('helvetica', 'bold');
  doc.text('LOKASI PENGIRIMAN (SHIP TO):', 110, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(request.projectName.toUpperCase(), 110, 62);
  doc.text('Gudang Proyek TBJ Constech', 110, 68);
  doc.text('Harap konfirmasi sebelum pengiriman.', 110, 74);

  const tableBody = request.items && request.items.length > 0
    ? request.items.map((it: any, idx: number) => [idx + 1, it.name.toUpperCase(), it.quantity, it.unit, it.specs || it.note || '-'])
    : [[1, request.itemName.toUpperCase(), request.quantity, request.unit, request.note || '-']];

  autoTable(doc, {
    startY: 90,
    head: [['NO', 'ITEM DESCRIPTION / MATERIAL', 'QTY', 'UNIT', 'REMARKS']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 100 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { cellWidth: 40 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  
  // Terms
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Syarat & Ketentuan:', 10, finalY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Barang harus sesuai dengan spesifikasi yang diminta.', 10, finalY + 20);
  doc.text('2. Lampirkan copy PO ini saat pengiriman barang.', 10, finalY + 25);
  doc.text('3. Pembayaran dilakukan sesuai termin yang disepakati.', 10, finalY + 30);

  // Signature
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized By,', 150, finalY + 15);
  doc.text('TBJ Management', 150, finalY + 20);
  
  doc.line(140, finalY + 45, 190, finalY + 45);
  doc.setFontSize(9);
  doc.text('Project Manager / Procurement', 145, finalY + 50);

  doc.save(`PO-${request.id.substring(0, 8).toUpperCase()}.pdf`);
};

export const generateAIPDF = async (projectName: string, estimation: AIEstimateResponse, customLogoUrl?: string) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  const base64Logo = await imageUrlToBase64(logoUrl);

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 10, 30, 30);
  } catch (e) {
    console.error('Failed to add logo to PDF:', e);
    doc.rect(10, 10, 30, 30, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 18, 27);
  }
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TBJ HUB', 50, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AI ESTIMATION SUMMARY', 150, 25);

  doc.line(10, 45, 200, 45);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Project: ${projectName}`, 10, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('AI ANALYSIS:', 10, 72);
  doc.setFont('helvetica', 'normal');
  const splitAnalysis = doc.splitTextToSize(estimation.analysis, 180);
  doc.text(splitAnalysis, 10, 79);

  const startY = 79 + (splitAnalysis.length * 5) + 10;

  const tableData = estimation.items.map(item => [
    item.name,
    item.quantity,
    item.unit,
    `Rp ${item.pricePerUnit.toLocaleString()}`,
    `Rp ${item.totalPrice.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Item Description', 'Qty', 'Unit', 'Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL ESTIMATED COST: Rp ${estimation.totalEstimatedCost.toLocaleString()}`, 10, finalY + 15);

  doc.save(`AI-Estimation-${projectName.replace(/\s+/g, '-')}.pdf`);
};
