
import React, { useState, useMemo, useRef } from 'react';
import { Contact } from '../types';

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

interface Transaction {
  id: string;
  date: Date;
  description: string;
  projectName: string;
  clientName: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
}

interface FinancialData {
  monthly: MonthlyData[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  categories: Record<string, number>;
}

interface FinancialReportProps {
  contacts: Contact[];
  onClose: () => void;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({ contacts, onClose }) => {
  const [view, setView] = useState<'monthly' | 'yearly' | 'ledger' | 'custom'>('monthly');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [yearlySubView, setYearlySubView] = useState<'revenue' | 'expenses'>('revenue');
  const printRef = useRef<HTMLDivElement>(null);
  
  // Custom Date Range State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Start of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { financialData, transactions }: { financialData: FinancialData; transactions: Transaction[] } = useMemo(() => {
    const trans: Transaction[] = [];

    contacts.forEach(contact => {
      // Loop through projects
      contact.projects.forEach(project => {
          // Revenue (Project Value)
          trans.push({
            id: `rev-${project.id}`,
            date: project.startDate, // Use project creation date for revenue
            description: 'Venta de Proyecto',
            projectName: project.name,
            clientName: contact.clientName,
            amount: project.value,
            type: 'income'
          });

          // Expenses
          project.expenses.forEach(exp => {
            trans.push({
              id: `exp-${exp.id}`,
              date: new Date(exp.date),
              description: exp.description,
              projectName: project.name,
              clientName: contact.clientName,
              amount: exp.amount,
              type: 'expense',
              category: exp.category
            });
          });
      });
    });

    // Sort by date desc (Newest first)
    trans.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate Totals & Monthly Data
    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
    let totalRevenue = 0;
    let totalExpenses = 0;
    const categories: Record<string, number> = {};

    trans.forEach(t => {
      const monthKey = t.date.toLocaleString('es-CO', { month: 'short', year: 'numeric' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { revenue: 0, expenses: 0 });
      }
      
      const m = monthlyMap.get(monthKey)!;

      if (t.type === 'income') {
        m.revenue += t.amount;
        totalRevenue += t.amount;
      } else {
        m.expenses += t.amount;
        totalExpenses += t.amount;
        
        // Categories
        const cat = t.category || 'other';
        categories[cat] = (categories[cat] || 0) + t.amount;
      }
    });

    const monthly: MonthlyData[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses
      }))
      .sort((a, b) => {
        // Ordenar por fecha, más reciente primero
        const dateA = new Date(a.month + ' 1');
        const dateB = new Date(b.month + ' 1');
        return dateB.getTime() - dateA.getTime();
      });

    return {
      financialData: {
        monthly,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        categories
      },
      transactions: trans
    };
  }, [contacts]);

  // Filter transactions for Custom View
  const customRangeData = useMemo(() => {
    if (view !== 'custom') return null;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = transactions.filter(t => t.date >= start && t.date <= end);
    
    const rev = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      revenue: rev,
      expenses: exp,
      profit: rev - exp,
      transactions: filtered
    };
  }, [view, startDate, endDate, transactions]);

  const ledgerTransactions = useMemo(() => {
    if (projectFilter === 'all') return transactions;
    const [clientName, projectName] = projectFilter.split('|');
    return transactions.filter(t => t.projectName === projectName && t.clientName === clientName);
  }, [transactions, projectFilter]);

  const uniqueProjects = useMemo(() => {
    const projectsMap = new Map<string, {name: string, clientName: string}>();
    contacts.forEach(c => {
      c.projects.forEach(p => {
        // Crear una clave única basada en cliente y nombre del proyecto
        const key = `${c.clientName}|${p.name}`;
        // Solo agregar si no existe ya
        if (!projectsMap.has(key)) {
          projectsMap.set(key, { name: p.name, clientName: c.clientName });
        }
      });
    });
    return Array.from(projectsMap.values());
  }, [contacts]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  const maxVal = Math.max(...financialData.monthly.map(m => Math.max(m.revenue, m.expenses))) || 1;

  const generatePrintContent = (): string => {
    const reportTitle = 
      view === 'monthly' ? 'Reporte Mensual' :
      view === 'yearly' ? 'Resumen Anual' :
      view === 'ledger' ? 'Movimientos' :
      'Rango Personalizado';

    let content = '';

    if (view === 'monthly') {
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('es-CO', { month: 'short', year: 'numeric' });
      const currentMonthData = financialData.monthly.find(m => m.month === currentMonth);
      
      content += '<div class="summary-box">';
      content += '<h2 style="margin-top: 0; color: #0f172a;">Mes Actual</h2>';
      if (currentMonthData) {
        content += `<div class="summary-row"><span>Mes:</span><span>${currentMonthData.month}</span></div>`;
        content += `<div class="summary-row"><span>Ingresos:</span><span class="amount-income">${formatCurrency(currentMonthData.revenue)}</span></div>`;
        content += `<div class="summary-row"><span>Gastos:</span><span class="amount-expense">${formatCurrency(currentMonthData.expenses)}</span></div>`;
        const profit = currentMonthData.revenue - currentMonthData.expenses;
        content += `<div class="summary-row"><span>Ganancia:</span><span class="${profit >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(profit)}</span></div>`;
      } else {
        content += '<p>No hay datos para el mes actual.</p>';
      }
      content += '</div>';

      if (financialData.monthly.length > 0) {
        content += '<h2 style="margin-top: 30px; color: #0f172a;">Historial de Meses</h2>';
        content += '<table>';
        content += '<thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Ganancia</th></tr></thead>';
        content += '<tbody>';
        financialData.monthly.forEach(m => {
          const profit = m.revenue - m.expenses;
          content += `<tr>
            <td>${m.month}</td>
            <td class="amount-income">${formatCurrency(m.revenue)}</td>
            <td class="amount-expense">${formatCurrency(m.expenses)}</td>
            <td class="${profit >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(profit)}</td>
          </tr>`;
        });
        content += '</tbody></table>';
      }
    } else if (view === 'yearly') {
      content += '<div class="summary-box">';
      content += '<h2 style="margin-top: 0; color: #0f172a;">Resumen Anual</h2>';
      content += `<div class="summary-row"><span>Ingresos Totales:</span><span class="amount-income">${formatCurrency(financialData.totalRevenue)}</span></div>`;
      content += `<div class="summary-row"><span>Gastos Totales:</span><span class="amount-expense">${formatCurrency(financialData.totalExpenses)}</span></div>`;
      content += `<div class="summary-row"><span>Ganancia Neta:</span><span class="${financialData.netProfit >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(financialData.netProfit)}</span></div>`;
      content += '</div>';

      if (yearlySubView === 'revenue') {
        const incomeTrans = transactions.filter(t => t.type === 'income');
        if (incomeTrans.length > 0) {
          content += '<h2 style="margin-top: 30px; color: #0f172a;">Historial de Ventas</h2>';
          content += '<table>';
          content += '<thead><tr><th>Fecha</th><th>Descripción</th><th>Cliente</th><th>Proyecto</th><th>Monto</th></tr></thead>';
          content += '<tbody>';
          incomeTrans.forEach(t => {
            content += `<tr>
              <td>${t.date.toLocaleDateString('es-CO')}</td>
              <td>${t.description}</td>
              <td>${t.clientName}</td>
              <td>${t.projectName}</td>
              <td class="amount-income">${formatCurrency(t.amount)}</td>
            </tr>`;
          });
          content += '</tbody></table>';
        }
      } else {
        if (Object.keys(financialData.categories).length > 0) {
          content += '<h2 style="margin-top: 30px; color: #0f172a;">Desglose de Gastos por Categoría</h2>';
          content += '<table>';
          content += '<thead><tr><th>Categoría</th><th>Monto</th><th>Porcentaje</th></tr></thead>';
          content += '<tbody>';
          Object.entries(financialData.categories).forEach(([cat, amount]) => {
            const percentage = ((amount / financialData.totalExpenses) * 100).toFixed(1);
            const catName = cat === 'material' ? 'Materia Prima' : cat === 'labor' ? 'Mano de Obra' : 'Otros';
            content += `<tr>
              <td>${catName}</td>
              <td class="amount-expense">${formatCurrency(amount)}</td>
              <td>${percentage}%</td>
            </tr>`;
          });
          content += '</tbody></table>';
        }

        const expenseTrans = transactions.filter(t => t.type === 'expense');
        if (expenseTrans.length > 0) {
          content += '<h2 style="margin-top: 30px; color: #0f172a;">Historial de Gastos</h2>';
          content += '<table>';
          content += '<thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Cliente</th><th>Proyecto</th><th>Monto</th></tr></thead>';
          content += '<tbody>';
          expenseTrans.forEach(t => {
            const catName = t.category === 'material' ? 'Materia Prima' : t.category === 'labor' ? 'Mano de Obra' : 'Otros';
            content += `<tr>
              <td>${t.date.toLocaleDateString('es-CO')}</td>
              <td>${t.description}</td>
              <td>${catName}</td>
              <td>${t.clientName}</td>
              <td>${t.projectName}</td>
              <td class="amount-expense">${formatCurrency(t.amount)}</td>
            </tr>`;
          });
          content += '</tbody></table>';
        }
      }
    } else if (view === 'ledger' || view === 'custom') {
      const transToShow = view === 'ledger' ? ledgerTransactions : (customRangeData?.transactions || []);
      
      if (view === 'custom' && customRangeData) {
        content += '<div class="summary-box">';
        content += '<h2 style="margin-top: 0; color: #0f172a;">Resumen del Rango</h2>';
        content += `<div class="summary-row"><span>Fecha Desde:</span><span>${new Date(startDate).toLocaleDateString('es-CO')}</span></div>`;
        content += `<div class="summary-row"><span>Fecha Hasta:</span><span>${new Date(endDate).toLocaleDateString('es-CO')}</span></div>`;
        content += `<div class="summary-row"><span>Ingresos:</span><span class="amount-income">${formatCurrency(customRangeData.revenue)}</span></div>`;
        content += `<div class="summary-row"><span>Gastos:</span><span class="amount-expense">${formatCurrency(customRangeData.expenses)}</span></div>`;
        content += `<div class="summary-row"><span>Ganancia:</span><span class="${customRangeData.profit >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(customRangeData.profit)}</span></div>`;
        content += '</div>';
      }

      if (transToShow.length > 0) {
        content += `<h2 style="margin-top: 30px; color: #0f172a;">${view === 'ledger' ? 'Movimientos' : 'Transacciones del Rango'}</h2>`;
        if (view === 'ledger' && projectFilter !== 'all') {
          const [clientName, projectName] = projectFilter.split('|');
          content += `<p style="color: #64748b; margin-bottom: 15px;"><strong>Filtro:</strong> ${clientName} - ${projectName}</p>`;
        }
        content += '<table>';
        content += '<thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cliente</th><th>Proyecto</th><th>Monto</th></tr></thead>';
        content += '<tbody>';
        transToShow.forEach(t => {
          content += `<tr>
            <td>${t.date.toLocaleDateString('es-CO')}</td>
            <td>${t.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
            <td>${t.description}</td>
            <td>${t.clientName}</td>
            <td>${t.projectName}</td>
            <td class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
          </tr>`;
        });
        content += '</tbody></table>';
      } else {
        content += '<p style="text-align: center; color: #64748b; padding: 40px;">No hay transacciones para mostrar.</p>';
      }
    }

    return content;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportTitle = 
      view === 'monthly' ? 'Reporte Mensual' :
      view === 'yearly' ? 'Resumen Anual' :
      view === 'ledger' ? 'Movimientos' :
      'Rango Personalizado';

    const printContent = generatePrintContent();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle} - Estados Financieros</title>
          <meta charset="UTF-8">
          <style>
            @page {
              margin: 1.5cm;
              size: A4;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              background: white;
              font-size: 12px;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #475569;
            }
            .print-header h1 {
              font-size: 28px;
              font-weight: bold;
              color: #0f172a;
              margin: 0 0 10px 0;
            }
            .print-header p {
              font-size: 14px;
              color: #64748b;
              margin: 0;
            }
            .print-date {
              text-align: right;
              font-size: 11px;
              color: #64748b;
              margin-bottom: 25px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
              color: #0f172a;
              font-size: 11px;
              text-transform: uppercase;
            }
            td {
              font-size: 12px;
            }
            .amount-income {
              color: #059669;
              font-weight: bold;
            }
            .amount-expense {
              color: #dc2626;
              font-weight: bold;
            }
            .summary-box {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              page-break-inside: avoid;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .summary-row:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 16px;
            }
            h2 {
              font-size: 18px;
              color: #0f172a;
              margin: 25px 0 15px 0;
              page-break-after: avoid;
            }
            @media print {
              body {
                padding: 0;
              }
              .summary-box {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Estados Financieros</h1>
            <p>${reportTitle}</p>
          </div>
          <div class="print-date">
            Fecha de generación: ${new Date().toLocaleDateString('es-CO', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[100] flex justify-center items-start pt-10 px-4 animate-fade-in backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-700/50">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex justify-between items-center" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
          <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <i className="fa-solid fa-chart-pie"></i>
               </div>
               Estados Financieros
             </h2>
             <p className="text-slate-400 text-sm mt-1 ml-14">Control detallado de rentabilidad</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint} 
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 shadow-lg shadow-blue-500/30"
              title="Imprimir o guardar como PDF"
            >
              <i className="fa-solid fa-print"></i>
              Imprimir / PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition bg-slate-700/50 w-10 h-10 rounded-full flex items-center justify-center">
               <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900/50 p-1 border-b border-slate-700/50">
           {['monthly', 'yearly', 'ledger', 'custom'].map((v) => (
             <button
               key={v}
               onClick={() => setView(v as any)}
               className={`flex-1 py-3 text-sm font-bold transition rounded-xl ${view === v ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
               {v === 'monthly' && 'Reporte Mensual'}
               {v === 'yearly' && 'Resumen Anual'}
               {v === 'ledger' && 'Movimientos'}
               {v === 'custom' && <span><i className="fa-regular fa-calendar-days mr-2"></i> Rango Personalizado</span>}
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-800">
          <div ref={printRef} className="print-content">
            {/* MONTHLY VIEW */}
            {view === 'monthly' && (
              <div className="space-y-8">
                 <div className="flex justify-between items-center">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest">Mes Actual</h3>
                 </div>
                 
                 {(() => {
                    // Obtener el mes actual
                    const currentDate = new Date();
                    const currentMonth = currentDate.toLocaleString('es-CO', { month: 'short', year: 'numeric' });
                    const currentMonthData = financialData.monthly.find(m => m.month === currentMonth);
                    
                    if (!currentMonthData) {
                      return (
                        <div className="text-center py-12 text-slate-500 italic bg-slate-700/30 rounded-xl border border-dashed border-slate-600/50">
                          No hay datos financieros para el mes actual.
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex gap-4 justify-center">
                        <div className="min-w-[200px] bg-slate-50 p-6 rounded-xl flex flex-col items-center justify-end h-72 border border-slate-100 relative flex-1 group hover:shadow-md transition max-w-md">
                            <div className="flex gap-6 items-end h-48 w-full justify-center mb-4">
                                {/* Revenue Bar */}
                                <div className="flex flex-col items-center">
                                    <div 
                                    className="w-12 bg-emerald-500 rounded-t-md opacity-90 hover:opacity-100 transition relative"
                                    style={{ height: `${Math.min((currentMonthData.revenue / Math.max(currentMonthData.revenue, currentMonthData.expenses, 1)) * 100, 100)}%` }}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-bold transition-opacity">
                                        +{formatCurrency(currentMonthData.revenue)}
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500 mt-2 font-bold">Ingresos</span>
                                </div>
                                {/* Expense Bar */}
                                <div className="flex flex-col items-center">
                                    <div 
                                    className="w-12 bg-rose-500 rounded-t-md opacity-90 hover:opacity-100 transition relative"
                                    style={{ height: `${Math.min((currentMonthData.expenses / Math.max(currentMonthData.revenue, currentMonthData.expenses, 1)) * 100, 100)}%` }}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-bold transition-opacity">
                                        -{formatCurrency(currentMonthData.expenses)}
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500 mt-2 font-bold">Gastos</span>
                                </div>
                            </div>
                            <span className="text-slate-600 font-bold text-lg capitalize mb-2">{currentMonthData.month}</span>
                            <div className="text-sm font-medium text-center bg-white px-4 py-2 rounded border border-slate-100 shadow-sm w-full">
                                <span className={currentMonthData.revenue - currentMonthData.expenses > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {formatCurrency(currentMonthData.revenue - currentMonthData.expenses)}
                                </span>
                            </div>
                        </div>
                      </div>
                    );
                 })()}
                 
                 {financialData.monthly.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-4">Historial de Meses</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {financialData.monthly.map((m, idx) => (
                        <div key={idx} className="min-w-[120px] bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-end h-72 border border-slate-100 relative flex-1 group hover:shadow-md transition">
                            <div className="flex gap-3 items-end h-48 w-full justify-center mb-4">
                                {/* Revenue Bar */}
                                <div 
                                className="w-6 bg-emerald-500 rounded-t-md opacity-90 hover:opacity-100 transition relative"
                                style={{ height: `${(m.revenue / maxVal) * 100}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-bold transition-opacity">
                                    +{formatCurrency(m.revenue)}
                                    </div>
                                </div>
                                {/* Expense Bar */}
                                <div 
                                className="w-6 bg-rose-500 rounded-t-md opacity-90 hover:opacity-100 transition relative"
                                style={{ height: `${(m.expenses / maxVal) * 100}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-bold transition-opacity">
                                    -{formatCurrency(m.expenses)}
                                    </div>
                                </div>
                            </div>
                            <span className="text-slate-600 font-bold text-sm capitalize">{m.month}</span>
                            <div className="text-[11px] font-medium mt-1 text-center bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                                <span className={m.revenue - m.expenses > 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(m.revenue - m.expenses)}</span>
                            </div>
                        </div>
                        ))}
                      </div>
                    </div>
                 )}
              </div>
            )}

            {/* YEARLY VIEW */}
            {view === 'yearly' && (
               <div className="space-y-6">
                  {/* Sub-tabs for Revenue and Expenses */}
                  <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                     <button
                        onClick={() => setYearlySubView('revenue')}
                        className={`flex-1 py-3 px-4 rounded-md font-semibold text-sm transition ${
                           yearlySubView === 'revenue'
                              ? 'bg-white text-emerald-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                        }`}
                     >
                        <i className="fa-solid fa-arrow-trend-up mr-2"></i>
                        Ventas
                     </button>
                     <button
                        onClick={() => setYearlySubView('expenses')}
                        className={`flex-1 py-3 px-4 rounded-md font-semibold text-sm transition ${
                           yearlySubView === 'expenses'
                              ? 'bg-white text-rose-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                        }`}
                     >
                        <i className="fa-solid fa-arrow-trend-down mr-2"></i>
                        Gastos
                     </button>
                  </div>

                  {/* Revenue Tab Content */}
                  {yearlySubView === 'revenue' && (
                     <div className="space-y-6">
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-8 rounded-2xl shadow-lg text-white">
                           <div className="flex justify-between items-center">
                              <div>
                                 <p className="text-emerald-100 text-xs font-bold uppercase mb-2">Ventas Totales</p>
                                 <h3 className="text-5xl font-bold">{formatCurrency(financialData.totalRevenue)}</h3>
                              </div>
                              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
                                 <i className="fa-solid fa-arrow-trend-up"></i>
                              </div>
                           </div>
                        </div>

                        {/* Revenue Transactions List */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <h4 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                              <i className="fa-solid fa-receipt text-emerald-600"></i>
                              Historial de Ventas
                           </h4>
                           <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                              {transactions.filter(t => t.type === 'income').length > 0 ? (
                                 transactions.filter(t => t.type === 'income').map(t => (
                                    <div key={t.id} className="bg-white p-4 rounded-xl flex justify-between items-center border border-slate-100 hover:shadow-md transition">
                                       <div className="flex-1">
                                          <div className="font-bold text-slate-800 text-sm">{t.description}</div>
                                          <div className="text-xs text-slate-500 mt-1">
                                             {t.clientName} • {t.projectName}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-1">
                                             {t.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                          </div>
                                       </div>
                                       <div className="text-emerald-600 font-bold text-lg ml-4">
                                          +{formatCurrency(t.amount)}
                                       </div>
                                    </div>
                                 ))
                              ) : (
                                 <div className="text-center py-8 text-slate-400 italic">
                                    No hay ventas registradas.
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Expenses Tab Content */}
                  {yearlySubView === 'expenses' && (
                     <div className="space-y-6">
                        <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-8 rounded-2xl shadow-lg text-white">
                           <div className="flex justify-between items-center">
                              <div>
                                 <p className="text-rose-100 text-xs font-bold uppercase mb-2">Gastos Totales</p>
                                 <h3 className="text-5xl font-bold">{formatCurrency(financialData.totalExpenses)}</h3>
                              </div>
                              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
                                 <i className="fa-solid fa-arrow-trend-down"></i>
                              </div>
                           </div>
                        </div>

                        {/* Categories */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <h4 className="text-slate-800 font-bold mb-6 flex items-center gap-2">
                              <i className="fa-solid fa-chart-pie text-rose-600"></i>
                              Desglose de Gastos
                           </h4>
                           <div className="space-y-4">
                              {Object.entries(financialData.categories).map(([cat, amount]) => (
                                 <div key={cat} className="flex items-center gap-4">
                                    <div className="w-32 text-xs font-bold text-slate-500 uppercase text-right">
                                       {cat === 'material' ? 'Materia Prima' : cat === 'labor' ? 'Mano de Obra' : 'Otros'}
                                    </div>
                                    <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                       <div className="bg-rose-500 h-full rounded-full shadow-sm" style={{ width: `${(amount / financialData.totalExpenses) * 100}%` }}></div>
                                    </div>
                                    <div className="w-24 text-right text-slate-800 text-sm font-bold font-mono">
                                       {formatCurrency(amount)}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Expenses Transactions List */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <h4 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                              <i className="fa-solid fa-receipt text-rose-600"></i>
                              Historial de Gastos
                           </h4>
                           <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                              {transactions.filter(t => t.type === 'expense').length > 0 ? (
                                 transactions.filter(t => t.type === 'expense').map(t => (
                                    <div key={t.id} className="bg-white p-4 rounded-xl flex justify-between items-center border border-slate-100 hover:shadow-md transition">
                                       <div className="flex-1">
                                          <div className="font-bold text-slate-800 text-sm">{t.description}</div>
                                          <div className="text-xs text-slate-500 mt-1">
                                             {t.clientName} • {t.projectName}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-1">
                                             {t.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                          </div>
                                       </div>
                                       <div className="text-rose-600 font-bold text-lg ml-4">
                                          -{formatCurrency(t.amount)}
                                       </div>
                                    </div>
                                 ))
                              ) : (
                                 <div className="text-center py-8 text-slate-400 italic">
                                    No hay gastos registrados.
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Net Profit Summary (Always visible) */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-2xl shadow-lg text-white flex items-center justify-between">
                     <div>
                        <p className="text-slate-300 text-sm font-bold uppercase mb-2">Ganancia Neta Anual</p>
                        <h3 className={`text-4xl font-bold ${financialData.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {formatCurrency(financialData.netProfit)}
                        </h3>
                     </div>
                     <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-white/10 backdrop-blur`}>
                        <i className={`fa-solid fa-sack-dollar ${financialData.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}></i>
                     </div>
                  </div>
               </div>
            )}

            {/* LEDGER & CUSTOM Views (Simplified for brevity - adapting styles) */}
            {(view === 'ledger' || view === 'custom') && (
                <div className="space-y-4">
                    {view === 'custom' && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
                            <h3 className="text-indigo-600 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-regular fa-calendar-days"></i> Seleccionar Rango de Fechas
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                        Fecha Desde
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-white text-slate-700 rounded-lg p-3 border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                        Fecha Hasta
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-white text-slate-700 rounded-lg p-3 border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                            </div>
                            {customRangeData && (
                                <div className="mt-4 pt-4 border-t border-indigo-200 grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Ingresos</div>
                                        <div className="text-lg font-bold text-emerald-600">{formatCurrency(customRangeData.revenue)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Gastos</div>
                                        <div className="text-lg font-bold text-rose-600">{formatCurrency(customRangeData.expenses)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Ganancia</div>
                                        <div className={`text-lg font-bold ${customRangeData.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(customRangeData.profit)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {view === 'ledger' && (
                        <div className="relative">
                            <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="w-full bg-slate-50 text-slate-700 text-sm font-medium rounded-lg p-3 outline-none border border-slate-200 focus:border-indigo-500 appearance-none cursor-pointer"
                            >
                                <option value="all">📁 Todos los proyectos</option>
                                {uniqueProjects.map(p => <option key={`${p.clientName}|${p.name}`} value={`${p.clientName}|${p.name}`}>📁 {p.clientName} - {p.name}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {/* Reuse Transaction List Logic with Light Theme */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {(view === 'ledger' ? ledgerTransactions : customRangeData?.transactions || []).map(t => (
                            <div key={t.id} className="bg-white p-4 rounded-xl flex justify-between items-center border border-slate-100 hover:shadow-md transition group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                        <i className={`fa-solid ${t.type === 'income' ? 'fa-money-bill-wave' : 'fa-receipt'}`}></i>
                                    </div>
                                    <div>
                                        <div className="text-slate-800 font-bold text-sm">{t.description}</div>
                                        <div className="text-slate-400 text-xs font-medium flex gap-2">
                                            <span>{t.date.toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="text-slate-600 font-bold">{t.clientName}</span>
                                            <span>•</span>
                                            <span className="text-indigo-500">{t.projectName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`font-bold font-mono ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
