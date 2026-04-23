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
  projectIdentity?: { name: string, location: string, client: string, phone?: string, rabNumber?: string }
) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  const base64Logo = await imageUrlToBase64(logoUrl);
  const orange = [255, 107, 0]; // Cosmic Orange
  const rabNo = projectIdentity?.rabNumber || `RAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Helper for footer and page numbers
  const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100);
    
    // Page Number
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 105, pageHeight - 10, { align: 'center' });
    
    // Brand Footer
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('TUKANG BANGUNAN JAKARTA (TBJ CONSTECH)', 10, pageHeight - 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: TBJ Constech', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
  };

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 8, 18, 18);
  } catch (e) {
    doc.rect(10, 8, 18, 18, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 15, 18);
  }

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('TBJ CONSTECH', 32, 18);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('Virtual Construction System & Renovation Specialist', 32, 23);
  doc.text('WA: 081213496672 | Jakarta, Indonesia', 32, 27);

  // Orange Line
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 45, 200, 45);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RENCANA ANGGARAN BIAYA (RAB)', 10, 55);
  
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`RAB NUMBER: ${rabNo}`, 200, 55, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  let headerY = 65;
  if (projectIdentity) {
    doc.text(`NAMA PROYEK: ${projectIdentity.name.toUpperCase()}`, 10, headerY);
    doc.text(`LOKASI: ${projectIdentity.location.toUpperCase()}`, 10, headerY + 5);
    doc.text(`KLIEN: ${projectIdentity.client.toUpperCase()} (${projectIdentity.phone || '081213496672'})`, 10, headerY + 10);
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

    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(255, 107, 0, 0.1); // Light orange background for cat headers
    doc.rect(10, currentY - 5, 190, 8, 'F');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(cat.name.toUpperCase(), 12, currentY);
    doc.setTextColor(0);
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
  
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setDrawColor(0);
  doc.line(130, currentY, 200, currentY);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL BIAYA:', 110, currentY + 10);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text(`Rp ${totalBudget.toLocaleString('id-ID')}`, 200, currentY + 10, { align: 'right' });

  // Signature
  currentY += 30;
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text('Hormat Kami,', 150, currentY);
  doc.text('TBJ CONSTECH OS', 150, currentY + 5);
  
  doc.line(140, currentY + 30, 190, currentY + 30);
  doc.text('Official Estimator', 150, currentY + 35);

  // Add Page Numbers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`${rabNo}-${projectName.replace(/\s+/g, '-')}.pdf`);
};

export const generatePOPDF = async (request: any, vendor: any, customLogoUrl?: string, recipientInfo?: { name: string, phone: string, address: string }) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  const base64Logo = await imageUrlToBase64(logoUrl);
  const orange = [255, 107, 0];

  // Brand Footer Helper
  const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 105, pageHeight - 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('TUKANG BANGUNAN JAKARTA (TBJ CONSTECH)', 10, pageHeight - 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: TBJ Constech', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
  };

  try {
    doc.addImage(base64Logo, 'PNG', 10, 8, 16, 16);
  } catch (e) {
    doc.rect(10, 8, 16, 16, 'S');
    doc.setFontSize(7);
    doc.text('LOGO', 14, 16);
  }
  doc.setFontSize(16); // Reduced from 18 to prevent overlap
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('TBJ CONSTECH', 28, 17); 
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('Virtual Construction & Material Supply System', 28, 22);
  doc.text('QA/QC Verified | 081213496672', 28, 26);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', 200, 18, { align: 'right' }); 
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`NO: PO-${request.id.substring(0, 8).toUpperCase()}`, 200, 23, { align: 'right' });
  doc.text(`TGL: ${new Date(request.createdAt).toLocaleDateString('id-ID')}`, 200, 27, { align: 'right' });

  doc.setTextColor(0);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 45, 200, 45);

  // Vendor Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDOR / SUPPLIER:', 10, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(vendor.name.toUpperCase(), 10, 62);
  
  const vendorAddr = doc.splitTextToSize(vendor.address || 'Alamat tidak tersedia', 90);
  doc.text(vendorAddr, 10, 68);
  const addrHeight = vendorAddr.length * 5;
  
  doc.text(`UP: ${vendor.contactName || 'Bagian Pengiriman'}`, 10, 70 + addrHeight);
  doc.text(`WA: ${vendor.whatsapp}`, 10, 75 + addrHeight);

  // Project Info
  doc.setFont('helvetica', 'bold');
  doc.text('LOKASI PENGIRIMAN (SHIP TO):', 110, 55);
  doc.setFont('helvetica', 'normal');
  const projectLine = doc.splitTextToSize(request.projectName.toUpperCase(), 85);
  doc.text(projectLine, 110, 62);
  const projectLineHeight = projectLine.length * 5;
  
  const shipAddr = doc.splitTextToSize(recipientInfo?.address || 'Gudang Proyek TBJ Constech', 85);
  doc.text(shipAddr, 110, 62 + projectLineHeight);
  const shipAddrHeight = shipAddr.length * 5;

  doc.text(`PENERIMA: ${recipientInfo?.name || 'TIM LOGISTIK TBJ'}`, 110, 65 + projectLineHeight + shipAddrHeight);
  doc.text(`KONTAK: ${recipientInfo?.phone || '081213496672'}`, 110, 70 + projectLineHeight + shipAddrHeight);

  const tableStartY = Math.max(80 + addrHeight, 75 + projectLineHeight + shipAddrHeight);

  const tableBody = request.items && request.items.length > 0
    ? request.items.map((it: any, idx: number) => [idx + 1, it.name.toUpperCase(), it.quantity, it.unit, it.specs || it.note || '-'])
    : [[1, (request.itemName || '').toUpperCase(), request.quantity, request.unit, request.note || '-']];

  autoTable(doc, {
    startY: tableStartY,
    head: [['NO', 'ITEM DESCRIPTION / MATERIAL', 'QTY', 'UNIT', 'REMARKS']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 100 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { cellWidth: 40 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Terms
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('Syarat & Ketentuan:', 10, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('1. Barang harus sesuai dengan spesifikasi yang diminta.', 10, finalY + 5);
  doc.text('2. Lampirkan copy PO ini saat pengiriman barang.', 10, finalY + 10);
  doc.text('3. Pembayaran dilakukan sesuai termin yang disepakati (Official Invoicing).', 10, finalY + 15);

  // Signature
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized By,', 150, finalY);
  doc.text('TBJ MANAGEMENT', 150, finalY + 5);
  
  doc.line(140, finalY + 30, 190, finalY + 30);
  doc.setFontSize(9);
  doc.text('Project Manager / Procurement', 145, finalY + 35);

  // Add Page Numbers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`PO-${request.id.substring(0, 8).toUpperCase()}.pdf`);
};

export const generateInvoicePDF = async (
  invoiceData: {
    number: string,
    date: string,
    dueDate: string,
    clientName: string,
    clientPhone: string,
    projectName: string,
    items: { desc: string, qty: number, unit: string, price: number, total: number }[],
    total: number,
    bankInfo: { bank: string, accNo: string, accName: string }
  },
  customLogoUrl?: string
) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  const base64Logo = await imageUrlToBase64(logoUrl);
  const orange = [255, 107, 0];

  // Brand Footer Helper
  const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 105, pageHeight - 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('TUKANG BANGUNAN JAKARTA (TBJ CONSTECH)', 10, pageHeight - 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: TBJ Constech', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
  };

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 8, 18, 18);
  } catch (e) {
    doc.rect(10, 8, 18, 18, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 15, 18);
  }
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('TBJ CONSTECH', 32, 18);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('Professional Billing & Invoice Statement', 32, 23);
  doc.text('Jakarta | 081213496672 | finance@tbjconstech.com', 32, 27);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL INVOICE', 200, 25, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`INV No: ${invoiceData.number}`, 200, 32, { align: 'right' });
  doc.text(`Tanggal: ${invoiceData.date}`, 200, 37, { align: 'right' });

  doc.setTextColor(0);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 45, 200, 45);

  // Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 10, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.clientName.toUpperCase(), 10, 62);
  doc.text(invoiceData.clientPhone, 10, 68);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT:', 10, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.projectName, 10, 84);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS:', 140, 55);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('UNPAID / OUTSTANDING', 140, 62);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Due Date: ${invoiceData.dueDate}`, 140, 68);

  const tableData = invoiceData.items.map(it => [
    it.desc,
    it.qty,
    it.unit,
    `Rp ${it.price.toLocaleString('id-ID')}`,
    `Rp ${it.total.toLocaleString('id-ID')}`
  ]);

  autoTable(doc, {
    startY: 95,
    head: [['DESKRIPSI PEKERJAAN', 'QTY', 'UNIT', 'HARGA', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TAGIHAN:', 130, finalY);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text(`Rp ${invoiceData.total.toLocaleString('id-ID')}`, 200, finalY, { align: 'right' });

  // Bank Info
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PEMBAYARAN:', 10, finalY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank: ${invoiceData.bankInfo.bank}`, 10, finalY + 27);
  doc.text(`No Rekening: ${invoiceData.bankInfo.accNo}`, 10, finalY + 32);
  doc.text(`Atas Nama: ${invoiceData.bankInfo.accName}`, 10, finalY + 37);

  // Footer / Notes
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Note: Mohon kirimkan bukti transfer ke WhatsApp 081213496672 agar dapat segera diproses.', 10, finalY + 50 > 270 ? 270 : finalY + 50);

  // Add Page Numbers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`${invoiceData.number}.pdf`);
};

export const generateAIPDF = async (projectName: string, estimation: AIEstimateResponse, customLogoUrl?: string) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  const base64Logo = await imageUrlToBase64(logoUrl);
  const orange = [255, 107, 0];

  // Brand Footer Helper
  const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 105, pageHeight - 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('TUKANG BANGUNAN JAKARTA (TBJ CONSTECH)', 10, pageHeight - 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: TBJ Constech', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
  };

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 8, 18, 18);
  } catch (e) {
    doc.rect(10, 8, 18, 18, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 15, 18);
  }
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('TBJ CONSTECH', 32, 18);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('AI Strategic Estimation & Technical Insight', 32, 23);
  doc.text('Jakarta | Verified AI Prediction v2.4', 32, 27);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('AI ESTIMATION RESULT', 200, 25, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`TGL: ${new Date().toLocaleDateString('id-ID')}`, 200, 31, { align: 'right' });

  // Orange Line
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 45, 200, 45);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`PROYEK: ${projectName.toUpperCase()}`, 10, 55);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AI STRATEGIC SUMMARY:', 10, 68);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  const splitAnalysis = doc.splitTextToSize(`"${estimation.analysis}"`, 180);
  doc.text(splitAnalysis, 10, 75);

  const startY = 75 + (splitAnalysis.length * 6) + 5;

  const tableData = estimation.items.map((item, idx) => [
    idx + 1,
    item.name.toUpperCase(),
    item.quantity,
    item.unit,
    `Rp ${item.pricePerUnit.toLocaleString('id-ID')}`,
    `Rp ${item.totalPrice.toLocaleString('id-ID')}`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['NO', 'ITEM DESCRIPTION', 'QTY', 'UNIT', 'PRICE/UNIT', 'TOTAL PRICE']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 70 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 35 },
      5: { halign: 'right', cellWidth: 35 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  if (finalY > 260) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTIMASI TOTAL:', 130, 20);
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(`Rp ${estimation.totalEstimatedCost.toLocaleString('id-ID')}`, 200, 20, { align: 'right' });
  } else {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTIMASI TOTAL:', 130, finalY);
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(`Rp ${estimation.totalEstimatedCost.toLocaleString('id-ID')}`, 200, finalY, { align: 'right' });
  }

  // Footer with Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`AI-Estimation-${projectName.replace(/\s+/g, '-')}.pdf`);
};
