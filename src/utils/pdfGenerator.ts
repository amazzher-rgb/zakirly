import { PaymentInvoice, PayrollRecord, Teacher } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Downloads high-quality rendered document as a PDF file directly onto the user's device.
 * No browser print dialogs are opened.
 */
async function downloadDocumentAsPdf(htmlContent: string, fileName: string) {
  // Create an off-screen container for rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '700px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Small delay to ensure styles and embedded fonts are loaded
    await new Promise((resolve) => setTimeout(resolve, 150));

    const targetElement = (container.querySelector('.card, .receipt-card, .slip-card') || container) as HTMLElement;

    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pageWidth = 210; // A4 mm
    const pageHeight = 297; // A4 mm
    const margin = 10;
    const maxContentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * maxContentWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', margin, margin, maxContentWidth, Math.min(contentHeight, pageHeight - margin * 2));
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.warn('PDF direct rendering failed, falling back to direct file download', error);
    // Instant fallback: Download standalone printable Arabic invoice file
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export async function generatePrePaymentNoticePDF(
  invoice: PaymentInvoice,
  tenantName: string = 'أكاديمية ذاكرلي',
  currencySymbol: string = 'ر.س'
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>إشعار تجديد اشتراك ومطالبة - ${invoice.invoiceNumber}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; font-family: 'Cairo', system-ui, sans-serif; }
        body { margin: 0; padding: 24px; background-color: #f8fafc; color: #0f172a; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #d97706, #b45309); padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 900; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.95; font-weight: 700; }
        .content { padding: 24px; }
        .greeting { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.7; color: #92400e; font-weight: 700; margin-bottom: 20px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f1f5f9; border-radius: 12px; font-size: 13px; font-weight: 700; }
        .meta-item { display: flex; justify-content: space-between; }
        .meta-label { color: #64748b; }
        .meta-val { color: #0f172a; }
        .details-box { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #475569; font-weight: 700; }
        .detail-value { font-weight: 800; color: #0f172a; }
        .amount-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px; }
        .amount-title { font-size: 12px; color: #92400e; font-weight: 800; margin-bottom: 4px; }
        .amount-val { font-size: 26px; color: #b45309; font-weight: 900; }
        .pay-instructions { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 12px; color: #334155; line-height: 1.8; }
        .pay-instructions h4 { margin: 0 0 6px 0; font-size: 13px; color: #0f172a; font-weight: 800; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; padding-top: 16px; border-top: 1px solid #e2e8f0; font-weight: 700; }
        .stamp { display: inline-block; border: 2px dashed #f59e0b; color: #b45309; padding: 4px 14px; border-radius: 8px; font-weight: 900; font-size: 12px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${tenantName}</h1>
          <p>إشعار تجديد اشتراك ومطالبة سداد رسمية (قبل الدفع)</p>
        </div>
        <div class="content">
          <div class="greeting">
            السيد ولي الأمر الفاضل / <strong>${invoice.parentNameAr}</strong>، المحترم<br/>
            تحية طيبة وبعد،،، نود إحاطتكم بضرورة تجديد الاشتراك الدراسي للطالب/ة (<strong>${invoice.studentNameAr}</strong>) لتأكيد استمرار جدول الحصص المخصص والتسجيل للمرحلة القادمة.
          </div>

          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">رقم المطالبة:</span> <span class="meta-val">${invoice.invoiceNumber}</span></div>
            <div class="meta-item"><span class="meta-label">تاريخ الإصدار:</span> <span class="meta-val">${invoice.createdAt}</span></div>
            <div class="meta-item"><span class="meta-label">تاريخ الاستحقاق:</span> <span class="meta-val">${invoice.dueDate || 'قبل بداية الحصص'}</span></div>
            <div class="meta-item"><span class="meta-label">حالة المطالبة:</span> <span class="meta-val" style="color: #b45309">في انتظار التجديد والسداد</span></div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">اسم الطالب:</span>
              <span class="detail-value">${invoice.studentNameAr}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ولي الأمر:</span>
              <span class="detail-value">${invoice.parentNameAr}</span>
            </div>
            ${invoice.subjectNameAr ? `
            <div class="detail-row">
              <span class="detail-label">المادة / الباقة الدراسية:</span>
              <span class="detail-value">${invoice.subjectNameAr}</span>
            </div>
            ` : ''}
            ${invoice.teacherNameAr ? `
            <div class="detail-row">
              <span class="detail-label">المعلم المخصص:</span>
              <span class="detail-value">${invoice.teacherNameAr}</span>
            </div>
            ` : ''}
            ${invoice.sessionsCount ? `
            <div class="detail-row">
              <span class="detail-label">عدد الحصص المقررة:</span>
              <span class="detail-value">${invoice.sessionsCount} حصة</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">إجمالي تكلفة الباقة:</span>
              <span class="detail-value">${invoice.amount.toLocaleString()} ${currencySymbol}</span>
            </div>
            ${invoice.paidAmount > 0 ? `
            <div class="detail-row">
              <span class="detail-label">المبلغ المسدد سابقاً:</span>
              <span class="detail-value" style="color: #059669;">${invoice.paidAmount.toLocaleString()} ${currencySymbol}</span>
            </div>
            ` : ''}
          </div>

          <div class="amount-box">
            <div class="amount-title">إجمالي المبلغ المطلوب لسداد/تجديد الاشتراك</div>
            <div class="amount-val">${(invoice.remainingAmount || invoice.amount).toLocaleString()} ${currencySymbol}</div>
          </div>

          <div style="text-align: center;">
            <div class="stamp">⚠️ إشعار تجديد اشتراك ومطالبة سداد رسمية</div>
          </div>

          <div class="footer">
            أكاديمية ذاكرلي التعليمية • إشعار تجديد رسمي موجه لولي الأمر
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const fileName = `اشعار_تجديد_${invoice.invoiceNumber || 'INV'}_${invoice.studentNameAr.replace(/\s+/g, '_')}`;
  await downloadDocumentAsPdf(htmlContent, fileName);
}

export async function generatePaymentReceiptPDF(
  invoice: PaymentInvoice,
  tenantName: string = 'أكاديمية ذاكرلي',
  currencySymbol: string = 'ر.س'
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>إيصال سداد وتأكيد اشتراك - ${invoice.receiptNumber || invoice.invoiceNumber}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; font-family: 'Cairo', system-ui, sans-serif; }
        body { margin: 0; padding: 24px; background-color: #f8fafc; color: #0f172a; }
        .receipt-card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #059669, #047857); padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 900; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.95; font-weight: 700; }
        .content { padding: 24px; }
        .confirmation { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.7; color: #065f46; font-weight: 700; margin-bottom: 20px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f1f5f9; border-radius: 12px; font-size: 13px; font-weight: 700; }
        .meta-item { display: flex; justify-content: space-between; }
        .meta-label { color: #64748b; }
        .meta-val { color: #0f172a; }
        .details-box { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #475569; font-weight: 700; }
        .detail-value { font-weight: 800; color: #0f172a; }
        .amount-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px; }
        .amount-title { font-size: 12px; color: #047857; font-weight: 800; margin-bottom: 4px; }
        .amount-val { font-size: 26px; color: #059669; font-weight: 900; }
        .remaining-val { font-size: 13px; color: #dc2626; font-weight: 800; margin-top: 6px; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; padding-top: 16px; border-top: 1px solid #e2e8f0; font-weight: 700; }
        .stamp { display: inline-block; border: 2px dashed #10b981; color: #047857; padding: 4px 14px; border-radius: 8px; font-weight: 900; font-size: 12px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <h1>${tenantName}</h1>
          <p>إيصال سداد وتأكيد تجديد الاشتراك رسمي معتمد</p>
        </div>
        <div class="content">
          <div class="confirmation">
            السيد ولي الأمر الفاضل / <strong>${invoice.parentNameAr}</strong>، المحترم<br/>
            نشكركم على ثقتكم الغالية بأكاديمية ذاكرلي. تم استلام قيمة الاشتراك بنجاح وتأكيد تفعيل الحصص والدروس المقررة للطالب/ة (<strong>${invoice.studentNameAr}</strong>).
          </div>

          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">رقم الإيصال:</span> <span class="meta-val">${invoice.receiptNumber || 'REC-' + invoice.id.slice(-6)}</span></div>
            <div class="meta-item"><span class="meta-label">تاريخ السداد:</span> <span class="meta-val">${invoice.paidDate || invoice.createdAt}</span></div>
            <div class="meta-item"><span class="meta-label">رقم الفاتورة:</span> <span class="meta-val">${invoice.invoiceNumber}</span></div>
            <div class="meta-item"><span class="meta-label">حالة السداد:</span> <span class="meta-val" style="color: #059669; font-weight: 900;">${invoice.status === 'paid' ? 'تم السداد والتأكيد بالكامل' : 'سداد جزئي'}</span></div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">اسم الطالب:</span>
              <span class="detail-value">${invoice.studentNameAr}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ولي الأمر:</span>
              <span class="detail-value">${invoice.parentNameAr}</span>
            </div>
            ${invoice.subjectNameAr ? `
            <div class="detail-row">
              <span class="detail-label">المادة / الكورس:</span>
              <span class="detail-value">${invoice.subjectNameAr}</span>
            </div>
            ` : ''}
            ${invoice.teacherNameAr ? `
            <div class="detail-row">
              <span class="detail-label">المعلم المخصص:</span>
              <span class="detail-value">${invoice.teacherNameAr}</span>
            </div>
            ` : ''}
            ${invoice.sessionsCount ? `
            <div class="detail-row">
              <span class="detail-label">عدد الحصص المفعلة بالباقة:</span>
              <span class="detail-value">${invoice.sessionsCount} حصة</span>
            </div>
            ` : ''}
            ${invoice.notes ? `
            <div class="detail-row">
              <span class="detail-label">ملاحظات العملية:</span>
              <span class="detail-value">${invoice.notes}</span>
            </div>
            ` : ''}
          </div>

          <div class="amount-box">
            <div class="amount-title">إجمالي المبلغ المسدد وتأكيد الاشتراك</div>
            <div class="amount-val">${invoice.paidAmount.toLocaleString()} ${currencySymbol}</div>
            ${invoice.remainingAmount > 0 ? `
              <div class="remaining-val">المبلغ المتبقي الملتزم به: ${invoice.remainingAmount.toLocaleString()} ${currencySymbol}</div>
            ` : ''}
          </div>

          <div style="text-align: center;">
            <div class="stamp">✓ تم السداد بنجاح وتأكيد الاشتراك بالمحتوى التعليمي</div>
          </div>

          <div class="footer">
            أكاديمية ذاكرلي التعليمية • إيصال سداد وتأكيد اشتراك موثق
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const fileName = `ايصال_سداد_${invoice.receiptNumber || invoice.invoiceNumber || 'REC'}_${invoice.studentNameAr.replace(/\s+/g, '_')}`;
  await downloadDocumentAsPdf(htmlContent, fileName);
}

export async function generateSalarySlipPDF(
  payroll: PayrollRecord,
  teacher?: Teacher,
  currencySymbol: string = 'ج.م'
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>كشف راتب معلم - ${payroll.teacherNameAr}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; font-family: 'Cairo', system-ui, sans-serif; }
        body { margin: 0; padding: 24px; background-color: #f8fafc; color: #0f172a; }
        .slip-card { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 900; }
        .header p { margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 600; }
        .content { padding: 24px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f1f5f9; border-radius: 12px; font-size: 13px; font-weight: 700; }
        .meta-item { display: flex; justify-content: space-between; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { background: #f8fafc; padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: right; font-size: 13px; font-weight: 800; }
        .table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; }
        .net-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .net-title { font-size: 15px; color: #065f46; font-weight: 900; }
        .net-val { font-size: 22px; color: #047857; font-weight: 900; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; font-weight: 700; }
        .sig-box { text-align: center; width: 40%; border-top: 2px solid #cbd5e1; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="slip-card">
        <div class="header">
          <h1>أكاديمية ذاكرلي التعليمية</h1>
          <p>كشف حساب وتحويل مستحقات المعلم - شهر ${payroll.month} / ${payroll.year}</p>
        </div>
        <div class="content">
          <div class="meta-grid">
            <div class="meta-item"><span>اسم المعلم:</span> <span>${payroll.teacherNameAr}</span></div>
            <div class="meta-item"><span>كود المعلم:</span> <span>${teacher?.code || 'TCH-' + payroll.teacherId.slice(-4)}</span></div>
            <div class="meta-item"><span>الهاتف:</span> <span>${teacher?.phone || 'غير مدخل'}</span></div>
            <div class="meta-item"><span>تاريخ الإصدار:</span> <span>${new Date().toISOString().split('T')[0]}</span></div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>بيان المستحقات والاستقطاعات</th>
                <th>العدد / الأجر</th>
                <th style="text-align: left;">المبلغ الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>الحصص المنفذة المكتملة</td>
                <td>${payroll.sessionsCount} حصة × ${payroll.ratePerSession} ${currencySymbol}</td>
                <td style="text-align: left; color: #1e40af;">${payroll.grossAmount.toLocaleString()} ${currencySymbol}</td>
              </tr>
              <tr>
                <td>المكافآت والحوافز الإضافية</td>
                <td>-</td>
                <td style="text-align: left; color: #047857;">+ ${payroll.bonus.toLocaleString()} ${currencySymbol}</td>
              </tr>
              <tr>
                <td>الخصومات والجزاءات</td>
                <td>-</td>
                <td style="text-align: left; color: #dc2626;">- ${payroll.deductions.toLocaleString()} ${currencySymbol}</td>
              </tr>
            </tbody>
          </table>

          <div class="net-box">
            <span class="net-title">صافي الراتب والمستحقات المدفوعة:</span>
            <span class="net-val">${payroll.netSalary.toLocaleString()} ${currencySymbol}</span>
          </div>

          <div class="signatures">
            <div class="sig-box">توقيع المحاسب المالي</div>
            <div class="sig-box">توقيع واعتماد إدارة الأكاديمية</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const fileName = `كشف_راتب_${payroll.teacherNameAr.replace(/\s+/g, '_')}_${payroll.month}_${payroll.year}`;
  await downloadDocumentAsPdf(htmlContent, fileName);
}

