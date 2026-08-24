import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ContractGeneratorProps {
  defaultContractorName?: string;
  defaultContractorId?: string;
  defaultLogo?: string;
  digitalSignature?: string;
  documents?: Array<{ id: string, name: string, type: string, file: string, uploadDate: Date, description?: string }>;
  contacts?: Array<{ id: string, clientName: string, role: string }>;
  onShareContractPdf?: (contactId: string, pdfBlob: Blob, filename: string) => Promise<void>;
  onUploadContractPdf?: (pdfBlob: Blob, filename: string) => Promise<string>;
}

export default function ContractGenerator({
  defaultContractorName = '',
  defaultContractorId = '',
  defaultLogo = '',
  digitalSignature = '',
  documents = [],
  contacts = [],
  onShareContractPdf,
  onUploadContractPdf,
}: ContractGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedContactForShare, setSelectedContactForShare] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [sharingWorky, setSharingWorky] = useState(false);
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false);

  const [formData, setFormData] = useState({
    contractorName: '',
    contractorId: '',
    clientName: '',
    clientId: '',
    description: '',
    totalValue: '',
    paymentTerms: '50% de anticipo, 50% al finalizar la obra',
    startDate: '',
    endDate: '',
    penaltyPercent: '10',
  });

  const [hasPenaltyClause, setHasPenaltyClause] = useState(false);
  const [showSignatureBoxes, setShowSignatureBoxes] = useState(true);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [contractorSignature, setContractorSignature] = useState<string>('');
  const [contractPreview, setContractPreview] = useState('');

  // Efecto para inicializar datos automáticos (nombre, CC/NIT, logo y firma)
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      contractorName: prev.contractorName || defaultContractorName || '',
      contractorId: prev.contractorId || defaultContractorId || '',
    }));

    // Auto-detectar Logo
    let detectedLogo = defaultLogo || '';
    if (!detectedLogo && documents && documents.length > 0) {
      const logoDoc = documents.find(doc =>
        doc.name.toLowerCase().includes('logo') &&
        doc.file.startsWith('data:image/')
      );
      if (logoDoc) {
        detectedLogo = logoDoc.file;
      }
    }
    if (detectedLogo) {
      setLogoBase64(detectedLogo);
    }

    // Auto-detectar Firma
    let detectedSignature = digitalSignature || '';
    if (!detectedSignature && documents && documents.length > 0) {
      const signatureDoc = documents.find(doc =>
        doc.name.toLowerCase().includes('firma') &&
        doc.file.startsWith('data:image/')
      );
      if (signatureDoc) {
        detectedSignature = signatureDoc.file;
      }
    }
    if (detectedSignature) {
      setContractorSignature(detectedSignature);
    }
  }, [defaultContractorName, defaultContractorId, defaultLogo, digitalSignature, documents]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateContract = () => {
    let text = `CONTRATO DE PRESTACIÓN DE SERVICIOS DE OBRA CIVIL\n\n`;
    text += `Entre los suscritos a saber: de una parte el CONTRATISTA ${formData.contractorName.toUpperCase() || '[NOMBRE DEL CONTRATISTA]'}, identificado con CC/NIT ${formData.contractorId || '[DOCUMENTO CONTRATISTA]'} y de la otra ${formData.clientName.toUpperCase() || '[NOMBRE DEL CLIENTE]'}, identificado con CC/NIT ${formData.clientId || '[DOCUMENTO CLIENTE]'}, denominado el CLIENTE, acuerdan celebrar el presente contrato bajo las siguientes cláusulas:\n\n`;
    text += `PRIMERA - OBJETO: El CONTRATISTA se compromete a realizar a favor del CLIENTE la siguiente obra o labor: ${formData.description || '[DESCRIPCIÓN DE LA OBRA]'}.\n\n`;
    text += `SEGUNDA - VALOR: El valor total acordado para la ejecución de esta obra es de $${formData.totalValue || '[VALOR]'} (Moneda Corriente).\n\n`;
    text += `TERCERA - FORMA DE PAGO: El CLIENTE pagará al CONTRATISTA el valor estipulado de la siguiente manera: ${formData.paymentTerms}.\n\n`;
    text += `CUARTA - TIEMPO DE EJECUCIÓN: Las labores iniciarán el ${formData.startDate || '[FECHA INICIO]'} y se estiman finalizar el ${formData.endDate || '[FECHA FIN]'}, sujeto a novedades climáticas o retrasos en entrega de materiales por parte del CLIENTE.`;

    if (hasPenaltyClause) {
      text += `\n\nQUINTA - CLÁUSULA PENAL: En caso de incumplimiento de cualquiera de las obligaciones del presente contrato, la parte incumplida pagará a la otra parte una penalidad equivalente al ${formData.penaltyPercent}% del valor total del contrato como estimación anticipada de perjuicios.`;
    }

    text += `\n\nPara constancia se firma a través de la plataforma o físicamente.`;

    setContractPreview(text);
    setStep(2);
    setShowShareOptions(false);
  };

  const getContractHtmlElement = () => {
    const element = document.createElement('div');
    const logoHtml = logoBase64 ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${logoBase64}" style="max-height: 80px;" alt="Logo" /></div>` : '';

    const contractorSignatureHtml = contractorSignature ? `
      <img src="${contractorSignature}" style="max-height: 50px; max-width: 150px; object-fit: contain;" alt="Firma Contratista" />
    ` : '';

    const signatureHtml = showSignatureBoxes ? `
      <div class="signatures">
        <div class="signature-container">
          <div class="signature-space">${contractorSignatureHtml}</div>
          <div class="signature-line">Firma CONTRATISTA</div>
        </div>
        <div class="signature-container">
          <div class="signature-space"></div>
          <div class="signature-line">Firma CLIENTE</div>
        </div>
      </div>
    ` : '';

    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #000; line-height: 1.6; max-width: 800px; margin: 0 auto; background-color: #fff;">
        <style>
          h1 { text-align: center; font-size: 16px; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; }
          p { text-align: justify; white-space: pre-wrap; font-size: 12px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
          .signature-container { width: 45%; display: flex; flex-direction: column; }
          .signature-space { height: 60px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; }
          .signature-line { border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 12px; font-weight: bold; }
        </style>
        ${logoHtml}
        <h1>CONTRATO DE PRESTACIÓN DE SERVICIOS DE OBRA CIVIL</h1>
        <p>${contractPreview.replace('CONTRATO DE PRESTACIÓN DE SERVICIOS DE OBRA CIVIL\n\n', '')}</p>
        ${signatureHtml}
      </div>
    `;
    return element;
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const element = getContractHtmlElement();
    const opt = {
      margin: 0.5,
      filename: `Contrato_${formData.clientName.replace(/\s+/g, '_') || 'Generado'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // @ts-ignore
    const worker = window.html2pdf().from(element).set(opt);
    return await worker.output('blob');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const logoHtml = logoBase64 ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${logoBase64}" style="max-height: 80px;" alt="Logo" /></div>` : '';

      const contractorSignatureHtml = contractorSignature ? `
        <img src="${contractorSignature}" style="max-height: 50px; max-width: 150px; object-fit: contain;" alt="Firma Contratista" />
      ` : '';

      const signatureHtml = showSignatureBoxes ? `
        <div class="signatures">
          <div class="signature-container">
            <div class="signature-space">${contractorSignatureHtml}</div>
            <div class="signature-line">Firma CONTRATISTA</div>
          </div>
          <div class="signature-container">
            <div class="signature-space"></div>
            <div class="signature-line">Firma CLIENTE</div>
          </div>
        </div>
      ` : '';

      printWindow.document.write(`
        <html>
          <head>
            <title>Contrato - Worky</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #000; line-height: 1.6; }
              h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
              p { text-align: justify; white-space: pre-wrap; font-size: 14px; }
              .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
              .signature-container { width: 45%; display: flex; flex-direction: column; }
              .signature-space { height: 60px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; }
              .signature-line { border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 14px; font-weight: bold; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            ${logoHtml}
            <h1>CONTRATO DE PRESTACIÓN DE SERVICIOS DE OBRA CIVIL</h1>
            <p>${contractPreview.replace('CONTRATO DE PRESTACIÓN DE SERVICIOS DE OBRA CIVIL\n\n', '')}</p>
            ${signatureHtml}
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleShareToWorky = async () => {
    if (!selectedContactForShare || !onShareContractPdf) return;
    try {
      setSharingWorky(true);
      const blob = await generatePdfBlob();
      const filename = `Contrato_${formData.clientName.replace(/\s+/g, '_') || 'Generado'}.pdf`;
      await onShareContractPdf(selectedContactForShare, blob, filename);
      setSharingWorky(false);
      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setSelectedContactForShare('');
        setShowShareOptions(false);
      }, 2000);
    } catch (err) {
      console.error('Error enviando contrato por chat de Worky:', err);
      setSharingWorky(false);
    }
  };

  const handleShareToWhatsapp = async () => {
    if (!onUploadContractPdf) return;
    try {
      setSharingWhatsapp(true);
      const blob = await generatePdfBlob();
      const filename = `Contrato_${formData.clientName.replace(/\s+/g, '_') || 'Generado'}.pdf`;
      const publicUrl = await onUploadContractPdf(blob, filename);

      const textMessage = `Hola, te comparto el contrato formalizado en formato PDF: ${publicUrl}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`, '_blank');
      setSharingWhatsapp(false);
      setShowShareOptions(false);
    } catch (err) {
      console.error('Error subiendo PDF para WhatsApp:', err);
      setSharingWhatsapp(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-white p-3.5 rounded-xl transition shadow-sm hover:shadow-md flex flex-col items-center gap-2.5 w-full"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span className="text-slate-700 text-[12.5px] font-semibold">Contrato</span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Generador de Contratos</h2>
              <button onClick={() => { setIsOpen(false); setStep(1); }} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center transition">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {step === 1 ? (
              <div className="space-y-4">
                {/* Datos del Contratista */}
                <div className="bg-slate-50 p-3 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Datos del Contratista</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Nombre Contratista</label>
                      <input type="text" name="contractorName" value={formData.contractorName} onChange={handleInputChange} className="w-full bg-white rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" placeholder="Tu nombre" required />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">CC / NIT Contratista</label>
                      <input type="text" name="contractorId" value={formData.contractorId} onChange={handleInputChange} className="w-full bg-white rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" placeholder="Tu identificación" required />
                    </div>
                  </div>
                </div>

                {/* Datos del Cliente */}
                <div className="bg-slate-50 p-3 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wide">Datos del Cliente</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Nombre Cliente</label>
                      <input type="text" name="clientName" value={formData.clientName} onChange={handleInputChange} className="w-full bg-white rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" placeholder="Ej. Juan Pérez" required />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">CC / NIT Cliente</label>
                      <input type="text" name="clientId" value={formData.clientId} onChange={handleInputChange} className="w-full bg-white rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" placeholder="Ej. 12345678" required />
                    </div>
                  </div>
                </div>

                {/* Datos del Proyecto */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Descripción de la Obra</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-slate-50 rounded-lg p-2 text-slate-900 border border-slate-200 h-20 outline-none focus:border-blue-500 text-xs" placeholder="Ej. Instalación de pisos y enchape en baños..." required></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Valor Total ($)</label>
                      <input type="number" name="totalValue" value={formData.totalValue} onChange={handleInputChange} className="w-full bg-slate-50 rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" required />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Forma de Pago</label>
                      <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleInputChange} className="w-full bg-slate-50 rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha de Inicio</label>
                      <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full bg-slate-50 rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" required />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha Estimada Fin</label>
                      <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full bg-slate-50 rounded-lg p-2 text-slate-900 border border-slate-200 outline-none focus:border-blue-500 text-xs" required />
                    </div>
                  </div>
                </div>

                {/* Subidas y Configuraciones */}
                <div className="bg-slate-50 p-3 rounded-xl space-y-3 text-xs">
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide">Opciones del Documento</h3>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Logo del Contratista (Imagen)</label>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-slate-500 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer" />
                    {logoBase64 && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={logoBase64} alt="Previsualización" className="h-8 max-w-[80px] rounded object-contain border border-slate-200" />
                        <button type="button" onClick={() => setLogoBase64('')} className="text-rose-500 hover:text-rose-600">Remover</button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="flex items-center gap-2 text-slate-600 select-none cursor-pointer">
                      <input type="checkbox" checked={hasPenaltyClause} onChange={e => setHasPenaltyClause(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4" />
                      <span>Incluir Cláusula Penal (Multa por incumplimiento)</span>
                    </label>

                    {hasPenaltyClause && (
                      <div className="pl-6 animate-fade-in">
                        <label className="inline-flex items-center gap-1.5 text-slate-500">
                          <span>Porcentaje de multa:</span>
                          <input type="number" name="penaltyPercent" value={formData.penaltyPercent} onChange={handleInputChange} min="1" max="100" className="w-16 bg-white rounded-lg p-1 text-slate-900 border border-slate-200 text-center outline-none focus:border-blue-500 text-xs" />
                          <span>%</span>
                        </label>
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-slate-600 select-none cursor-pointer">
                      <input type="checkbox" checked={showSignatureBoxes} onChange={e => setShowSignatureBoxes(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4" />
                      <span>Mostrar cajas para firmas físicas</span>
                    </label>
                  </div>
                </div>

                <button onClick={generateContract} className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold py-3 rounded-xl mt-4 shadow-md shadow-blue-500/30 hover:shadow-lg transition">
                  Generar Borrador
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={contractPreview}
                  onChange={e => setContractPreview(e.target.value)}
                  className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-900 h-64 outline-none focus:border-blue-500 custom-scrollbar resize-none leading-relaxed"
                />

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setStep(1)} className="flex-1 min-w-[70px] bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition text-xs">
                    Editar
                  </button>
                  <button onClick={() => setShowPreviewModal(true)} className="flex-1 min-w-[70px] bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition text-xs">
                    Preview
                  </button>
                  <button onClick={handlePrint} className="flex-1 min-w-[70px] bg-rose-600 text-white font-bold py-2.5 rounded-xl hover:bg-rose-700 transition text-xs">
                    Imprimir
                  </button>
                  <button
                    onClick={() => setShowShareOptions(!showShareOptions)}
                    className={`flex-1 min-w-[70px] text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1 ${showShareOptions ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <i className="fa-solid fa-share-nodes"></i> Compartir
                  </button>
                </div>

                {showShareOptions && (
                  <div className="bg-slate-50 p-4 rounded-xl space-y-4 animate-scale-in">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-share text-blue-600"></i> Opciones de Envío (PDF)
                    </h3>

                    {/* WhatsApp Button */}
                    <button
                      onClick={handleShareToWhatsapp}
                      disabled={sharingWhatsapp}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition text-xs"
                    >
                      {sharingWhatsapp ? (
                        <>
                          <i className="fa-solid fa-circle-notch animate-spin"></i> Generando PDF...
                        </>
                      ) : (
                        <>
                          <i className="fa-brands fa-whatsapp text-sm"></i> Compartir por WhatsApp
                        </>
                      )}
                    </button>

                    {/* Worky Chat Dropdown */}
                    {onShareContractPdf && contacts.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase">Enviar al chat de Worky</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedContactForShare}
                            onChange={e => setSelectedContactForShare(e.target.value)}
                            className="flex-1 bg-white text-slate-900 p-2 rounded-lg border border-slate-200 outline-none text-xs"
                          >
                            <option value="">-- Elige un contacto --</option>
                            {contacts.map(c => (
                              <option key={c.id} value={c.id}>{c.clientName}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleShareToWorky}
                            disabled={!selectedContactForShare || shareSuccess || sharingWorky}
                            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:shadow-lg disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md shadow-blue-500/30 transition flex items-center justify-center min-w-[85px]"
                          >
                            {sharingWorky ? (
                              <i className="fa-solid fa-circle-notch animate-spin"></i>
                            ) : shareSuccess ? (
                              '¡Enviado!'
                            ) : (
                              'Enviar PDF'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* High-Fidelity Paper sheet preview overlay */}
      {showPreviewModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[1000] animate-fade-in" onClick={() => setShowPreviewModal(false)}>
          <div
            className="bg-white text-black w-full max-w-2xl rounded-2xl shadow-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative animate-scale-in flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Control Bar */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
              <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                <i className="fa-solid fa-file-pdf text-red-500 text-base"></i> Vista Previa de Impresión
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Paper Sheet */}
            <div className="flex-1 bg-white p-8 md:p-12 shadow-inner border border-slate-200 rounded-lg text-justify whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800 max-w-[800px] mx-auto w-full">
              {logoBase64 && (
                <div className="flex justify-center mb-6">
                  <img src={logoBase64} alt="Logo" className="max-h-16 object-contain" />
                </div>
              )}
              <h1 className="text-center font-bold text-sm mb-6 text-black uppercase tracking-wide">CONTRATO DE PRESTACIÓN DE SERVICIOS DE OBRA CIVIL</h1>
              <p className="text-justify font-sans text-xs leading-relaxed text-slate-800 mb-8 select-all">
                {contractPreview.replace('CONTRATO DE PRESTACIÓN DE SERVICIOS DE OBRA CIVIL\n\n', '')}
              </p>

              {showSignatureBoxes && (
                <div className="flex justify-between mt-16 pt-4 text-black">
                  <div className="w-[45%] flex flex-col">
                    <div className="h-16 flex items-end justify-center pb-1">
                      {contractorSignature ? (
                        <img src={contractorSignature} alt="Firma Contratista" className="max-h-12 max-w-full object-contain" />
                      ) : (
                        <div className="h-12"></div>
                      )}
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-center text-slate-700 font-bold text-[10px]">
                      Firma CONTRATISTA
                    </div>
                  </div>
                  <div className="w-[45%] flex flex-col">
                    <div className="h-16 flex items-end justify-center pb-1">
                      <div className="h-12"></div>
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-center text-slate-700 font-bold text-[10px]">
                      Firma CLIENTE
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions inside Preview */}
            <div className="flex flex-col gap-4 mt-5 pt-3 border-t border-slate-100">
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-print"></i> Imprimir / Descargar
                </button>
                <button
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className={`flex-1 text-white font-bold py-2.5 rounded-lg transition text-xs flex items-center justify-center gap-1.5 ${showShareOptions ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  <i className="fa-solid fa-share-nodes"></i> Compartir PDF
                </button>
                <button
                  onClick={() => { setShowPreviewModal(false); setShowShareOptions(false); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-lg text-xs transition"
                >
                  Cerrar
                </button>
              </div>

              {showShareOptions && (
                <div className="bg-slate-50 p-4 rounded-xl space-y-4 animate-scale-in text-black">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-share text-blue-600"></i> Enviar Contrato en PDF
                  </h3>

                  {/* WhatsApp Button */}
                  <button
                    onClick={handleShareToWhatsapp}
                    disabled={sharingWhatsapp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition text-xs"
                  >
                    {sharingWhatsapp ? (
                      <>
                        <i className="fa-solid fa-circle-notch animate-spin"></i> Generando PDF...
                      </>
                    ) : (
                      <>
                        <i className="fa-brands fa-whatsapp text-sm"></i> Enviar por WhatsApp
                      </>
                    )}
                  </button>

                  {/* Worky Chat Dropdown */}
                  {onShareContractPdf && contacts.length > 0 && (
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">Enviar al chat de Worky</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedContactForShare}
                          onChange={e => setSelectedContactForShare(e.target.value)}
                          className="flex-1 bg-white text-slate-900 p-2 rounded-lg border border-slate-200 outline-none text-xs"
                        >
                          <option value="">-- Elige un contacto --</option>
                          {contacts.map(c => (
                            <option key={c.id} value={c.id}>{c.clientName}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleShareToWorky}
                          disabled={!selectedContactForShare || shareSuccess || sharingWorky}
                          className="bg-gradient-to-br from-blue-600 to-blue-700 hover:shadow-lg disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md shadow-blue-500/30 transition flex items-center justify-center min-w-[85px]"
                        >
                          {sharingWorky ? (
                            <i className="fa-solid fa-circle-notch animate-spin"></i>
                          ) : shareSuccess ? (
                            '¡Enviado!'
                          ) : (
                            'Enviar PDF'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
