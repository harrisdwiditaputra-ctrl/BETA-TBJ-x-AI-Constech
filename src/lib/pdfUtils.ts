import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TBJ_LOGO } from '../constants';
import { AIEstimateResponse } from '../types';
import { roundToRibuan } from './utils';

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
  projectIdentity?: { name: string, location: string, client: string, phone?: string, rabNumber?: string },
  finance?: { discount?: number, taxPercentage?: number, assessmentDeposit?: number },
  shareMode: boolean = false,
  shareText?: string
) => {
  const doc = new jsPDF();
  const logoUrl = customLogoUrl || TBJ_LOGO;
  const base64Logo = await imageUrlToBase64(logoUrl);
  const orange = [255, 107, 0]; // Cosmic Orange
  const generateRABNumber = (pName: string) => {
    const date = new Date();
    const datePart = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const projectPart = pName.substring(0, 3).toUpperCase().replace(/\s+/g, 'X');
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `RAB-${datePart}-${projectPart}-${randomPart}`;
  };

  const rabNo = projectIdentity?.rabNumber || generateRABNumber(projectName);
  const filename = `${rabNo}-${projectName.replace(/\s+/g, '-')}.pdf`;

  // Header Helper - Called on every page
  const drawRABHeader = (doc: jsPDF, pageNumber: number) => {
    // Top Right Info
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text(`RAB NO: ${rabNo}`, 200, 10, { align: 'right' });

    try {
      doc.addImage(base64Logo, 'PNG', 10, 5, 20, 20); // Smaller logo
    } catch (e) {
      doc.rect(10, 5, 20, 20, 'S');
      doc.setFontSize(8);
      doc.text('LOGO', 16, 16);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('RENCANA ANGGARAN BIAYA (RAB)', 10, 32);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Professional Renovation & AI Data-Driven Estimation', 10, 37);
  };

  const addRABFooter = (doc: jsPDF, pageNumber: number) => {
    const pageHeight = doc.internal.pageSize.height;
    const totalPages = (doc as any).internal.getNumberOfPages();
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('Tukang Bangunan Jakarta - Professional Renovation & AI Data-Driven Estimation', 10, pageHeight - 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: Tukang Bangunan Jakarta', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
    
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 200, pageHeight - 10, { align: 'right' });
  };

    // Header will use headerY starting from 55
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  let headerY = 55;
  if (projectIdentity) {
    doc.text(`NAMA PROYEK: ${projectIdentity.name.toUpperCase()}`, 10, headerY);
    doc.text(`LOKASI: ${projectIdentity.location.toUpperCase()}`, 10, headerY + 5);
    doc.text(`KLIEN: ${projectIdentity.client.toUpperCase()} (${projectIdentity.phone || 'N/A'})`, 10, headerY + 10);
    headerY += 20;
  } else {
    doc.text(`PROJECT: ${projectName.toUpperCase()}`, 10, headerY);
    headerY += 10;
  }
  
  doc.setFont('helvetica', 'normal');
  doc.text(`TANGGAL: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 10, headerY);

  let currentY = headerY + 15;

  categories.forEach((cat) => {
    const catItems = items.filter(i => i.categoryId === cat.id);
    if (catItems.length === 0) return;

    if (currentY > 240) {
      doc.addPage();
      drawRABHeader(doc, (doc as any).internal.getNumberOfPages());
      currentY = 55;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 30, 30); // Dark neutral gray instead of blue/orange
    doc.rect(10, currentY - 5, 190, 8, 'F');
    doc.setTextColor(255, 255, 255); // White text on dark background
    doc.text(cat.name.toUpperCase(), 12, currentY);
    doc.setTextColor(0);
    currentY += 8;

    const tableData = catItems.map((item, idx) => [
      idx + 1,
      item.code || '-',
      { 
        content: `${item.name}${item.technicalSpecs ? `\nSpesifikasi: ${item.technicalSpecs}` : ''}`, 
        styles: { fontStyle: 'bold' } 
      },
      item.quantity,
      item.unit,
      `Rp ${Math.round(item.pricePerUnit).toLocaleString('id-ID')}`,
      `Rp ${Math.round(item.totalPrice).toLocaleString('id-ID')}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['NO', 'KODE', 'URAIAN PEKERJAAN', 'QTY', 'UNIT', 'HARGA SATUAN', 'JUMLAH HARGA']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 15 },
        2: { cellWidth: 62 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 35 },
        6: { halign: 'right', cellWidth: 40 }
      },
      margin: { left: 10, right: 10, top: 55, bottom: 25 },
      didDrawPage: (data: any) => {
        drawRABHeader(doc, data.pageNumber);
        addRABFooter(doc, data.pageNumber);
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  });

  // Summary Calculations
  const subtotal = Math.round(items.reduce((acc, i) => acc + i.totalPrice, 0));
  const discount = finance?.discount || 0;
  const deposit = finance?.assessmentDeposit || 0;
  const taxPercentage = finance?.taxPercentage || 0;
  
  const amountBeforeTax = subtotal - discount;
  const taxAmount = amountBeforeTax > 0 ? (amountBeforeTax * (taxPercentage / 100)) : 0;
  
  // Grand Total: (Subtotal - Discount) + Tax - Deposit
  const totalBudget = roundToRibuan(amountBeforeTax + taxAmount - deposit);
  
  if (currentY > 200) { 
    doc.addPage();
    drawRABHeader(doc, (doc as any).internal.getNumberOfPages());
    currentY = 55;
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);
  
  const labelX = 100; // Moved further left to allow more space for long labels like "PENGURANGAN DEPOSIT SURVEY"
  const valueX = 200;
  const lineSpacing = 8; // Increased from 7 for better breathing room
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);

  doc.text('SUBTOTAL PEKERJAAN:', labelX, currentY + 5);
  doc.text(`Rp ${subtotal.toLocaleString('id-ID')}`, valueX, currentY + 5, { align: 'right' });
  
  if (discount > 0) {
    currentY += lineSpacing;
    doc.text('DISKON / POTONGAN:', labelX, currentY + 5);
    doc.text(`- Rp ${discount.toLocaleString('id-ID')}`, valueX, currentY + 5, { align: 'right' });
  }

  if (deposit > 0) {
    currentY += lineSpacing;
    doc.text('PENGURANGAN DEPOSIT SURVEY:', labelX, currentY + 5);
    doc.text(`- Rp ${deposit.toLocaleString('id-ID')}`, valueX, currentY + 5, { align: 'right' });
  }

  if (taxAmount > 0) {
    currentY += lineSpacing;
    doc.text(`PAJAK (${taxPercentage}%):`, labelX, currentY + 5);
    doc.text(`Rp ${Math.round(taxAmount).toLocaleString('id-ID')}`, valueX, currentY + 5, { align: 'right' });
  }

  currentY += lineSpacing + 4;
  doc.setDrawColor(200);
  doc.setLineWidth(0.3); // Slightly thicker separator
  doc.line(labelX, currentY, valueX, currentY);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('GRAND TOTAL:', labelX, currentY + 10);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text(`Rp ${totalBudget.toLocaleString('id-ID')}`, valueX, currentY + 10, { align: 'right' });

  // Signature
  currentY += 30;
  if (currentY > 240) {
    doc.addPage();
    drawRABHeader(doc, (doc as any).internal.getNumberOfPages());
    currentY = 55;
  }
  
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text('Hormat Kami,', 150, currentY);
  doc.text('TUKANG BANGUNAN JAKARTA', 150, currentY + 5);
  
  doc.line(140, currentY + 30, 190, currentY + 30);
  doc.text('Official Estimator', 150, currentY + 35);
  
  // Total Pages Handling - ensuring all pages have footers if some were missed
  const totalPagesCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    // Footers are already handled by didDrawPage for most scenarios, 
    // but summary page might not have a table.
    addRABFooter(doc, i);
  }

  if (shareMode && navigator.share && navigator.canShare) {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `RAB - ${projectName}`,
          text: shareText || `Berikut adalah dokumen RAB untuk Proyek ${projectName}.`,
        });
        return;
      } catch (err) {
        console.error('Sharing failed', err);
      }
    }
  }

  doc.save(filename);
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('Tukang Bangunan Jakarta - Professional Renovation & AI Data-Driven Estimation', 10, pageHeight - 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: Tukang Bangunan Jakarta', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
    
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 200, pageHeight - 10, { align: 'right' });
  };

  try {
    doc.addImage(base64Logo, 'PNG', 10, 5, 38, 38);
  } catch (e) {
    doc.rect(10, 5, 38, 38, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 24, 22);
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', 200, 22, { align: 'right' }); 
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`NO: PO-${request.id.substring(0, 8).toUpperCase()}`, 200, 27, { align: 'right' });
  doc.text(`TGL: ${new Date(request.createdAt).toLocaleDateString('id-ID')}`, 200, 31, { align: 'right' });

  doc.setTextColor(0);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 42, 200, 42);

  // Vendor Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDOR / SUPPLIER:', 10, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(vendor.name.toUpperCase(), 10, 52);
  
  const vendorAddr = doc.splitTextToSize(vendor.address || 'Alamat tidak tersedia', 90);
  doc.text(vendorAddr, 10, 58);
  const addrHeight = vendorAddr.length * 5;
  
  doc.text(`UP: ${vendor.contactName || 'Bagian Pengiriman'}`, 10, 60 + addrHeight);
  doc.text(`WA: ${vendor.whatsapp}`, 10, 65 + addrHeight);

  // Project Info
  doc.setFont('helvetica', 'bold');
  doc.text('LOKASI PENGIRIMAN (SHIP TO):', 110, 45);
  doc.setFont('helvetica', 'normal');
  const projectLine = doc.splitTextToSize(request.projectName.toUpperCase(), 85);
  doc.text(projectLine, 110, 52);
  const projectLineHeight = projectLine.length * 5;
  
  const shipAddr = doc.splitTextToSize(recipientInfo?.address || 'Gudang Proyek TBJ Constech', 85);
  doc.text(shipAddr, 110, 52 + projectLineHeight);
  const shipAddrHeight = shipAddr.length * 5;

  doc.text(`PENERIMA: ${recipientInfo?.name || 'TIM LOGISTIK TBJ'}`, 110, 55 + projectLineHeight + shipAddrHeight);
  doc.text(`KONTAK: ${recipientInfo?.phone || '081213496672'}`, 110, 60 + projectLineHeight + shipAddrHeight);

  const tableStartY = Math.max(70 + addrHeight, 65 + projectLineHeight + shipAddrHeight);

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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('Tukang Bangunan Jakarta - Professional Renovation & AI Data-Driven Estimation', 10, pageHeight - 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: Tukang Bangunan Jakarta', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
    
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 200, pageHeight - 10, { align: 'right' });
  };

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 5, 38, 38);
  } catch (e) {
    doc.rect(10, 5, 38, 38, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 24, 22);
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL INVOICE', 200, 22, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`INV No: ${invoiceData.number}`, 200, 27, { align: 'right' });
  doc.text(`Tanggal: ${invoiceData.date}`, 200, 31, { align: 'right' });

  doc.setTextColor(0);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 48, 200, 48);

  // Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 10, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.clientName.toUpperCase(), 10, 59);
  doc.text(invoiceData.clientPhone, 10, 65);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT:', 10, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.projectName, 10, 81);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS:', 140, 45);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('UNPAID / OUTSTANDING', 140, 52);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Due Date: ${invoiceData.dueDate}`, 140, 58);

  const tableData = invoiceData.items.map(it => [
    it.desc,
    it.qty,
    it.unit,
    `Rp ${it.price.toLocaleString('id-ID')}`,
    `Rp ${it.total.toLocaleString('id-ID')}`
  ]);

  autoTable(doc, {
    startY: 85,
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

export const generateReceiptPDF = async (
  paymentData: {
    number: string,
    date: string,
    paymentDate: string,
    clientName: string,
    clientPhone: string,
    projectName: string,
    items: { desc: string, qty: number, unit: string, price: number, total: number }[],
    total: number,
    method: string
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('Tukang Bangunan Jakarta - Professional Renovation & AI Data-Driven Estimation', 10, pageHeight - 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: Tukang Bangunan Jakarta', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
    
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 200, pageHeight - 10, { align: 'right' });
  };

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 5, 38, 38);
  } catch (e) {
    doc.rect(10, 5, 38, 38, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 24, 22);
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RECEIPT', 200, 22, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Receipt No: ${paymentData.number}`, 200, 28, { align: 'right' });
  doc.text(`Tanggal Bayar: ${paymentData.paymentDate}`, 200, 33, { align: 'right' });

  doc.setTextColor(0);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 48, 200, 48);

  // Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIVED FROM:', 10, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(paymentData.clientName.toUpperCase(), 10, 59);
  doc.text(paymentData.clientPhone, 10, 65);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT:', 10, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(paymentData.projectName, 10, 81);

  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT STATUS:', 140, 45);
  doc.setTextColor(34, 197, 94); // Green
  doc.text('PAID / LUNAS', 140, 52);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Method: ${paymentData.method}`, 140, 58);

  const tableData = paymentData.items.map(it => [
    it.desc,
    it.qty,
    it.unit,
    `Rp ${it.price.toLocaleString('id-ID')}`,
    `Rp ${it.total.toLocaleString('id-ID')}`
  ]);

  autoTable(doc, {
    startY: 85,
    head: [['DESKRIPSI PEMBAYARAN', 'QTY', 'UNIT', 'HARGA', 'TOTAL']],
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
  doc.text('TOTAL DIBAYAR:', 130, finalY);
  doc.setTextColor(34, 197, 94);
  doc.text(`Rp ${paymentData.total.toLocaleString('id-ID')}`, 200, finalY, { align: 'right' });

  // Thank you note
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Terima kasih atas kepercayaan Anda menggunakan layanan TBJ Constech.', 10, finalY + 20);
  doc.text('Pembayaran Anda telah kami terima dan tervalidasi secara sistem.', 10, finalY + 25);

  // Footer / Notes
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Dokumen ini adalah bukti pembayaran yang sah dan dihasilkan secara otomatis oleh sistem TBJ Constech OS.', 10, finalY + 50 > 270 ? 270 : finalY + 50);

  // Add Page Numbers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`Receipt-${paymentData.number}.pdf`);
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text('Tukang Bangunan Jakarta - Professional Renovation & AI Data-Driven Estimation', 10, pageHeight - 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Instagram: @tukang.bangunan.jakarta | Find us on Google Maps: Tukang Bangunan Jakarta', 10, pageHeight - 15);
    doc.text('Contact: 081213496672 | www.tbjconstech.com', 10, pageHeight - 10);
    
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, 200, pageHeight - 10, { align: 'right' });
  };

  // Header
  try {
    doc.addImage(base64Logo, 'PNG', 10, 5, 38, 38);
  } catch (e) {
    doc.rect(10, 5, 38, 38, 'S');
    doc.setFontSize(8);
    doc.text('LOGO', 24, 22);
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('AI ESTIMATION RESULT', 200, 22, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`TGL: ${new Date().toLocaleDateString('id-ID')}`, 200, 28, { align: 'right' });

  // Orange Line
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(1);
  doc.line(10, 48, 200, 48);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`PROYEK: ${projectName.toUpperCase()}`, 10, 55);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AI STRATEGIC SUMMARY:', 10, 58);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  const splitAnalysis = doc.splitTextToSize(`"${estimation.analysis}"`, 180);
  doc.text(splitAnalysis, 10, 65);

  const startY = 65 + (splitAnalysis.length * 6) + 5;

  const tableData = estimation.items.map((item, idx) => [
    idx + 1,
    item.name.toUpperCase(),
    item.quantity,
    item.unit,
    `Rp ${item.totalPrice.toLocaleString('id-ID')}`
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['NO', 'ITEM DESCRIPTION', 'QTY', 'UNIT', 'TOTAL PRICE']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 105 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 35 }
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
