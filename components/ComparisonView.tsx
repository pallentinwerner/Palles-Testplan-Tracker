
import React, { useMemo, useState, useCallback } from 'react';
import { TestPath, TestItem, TestStatus } from '../types';
import StatusBadge from './StatusBadge';
import { GoogleGenAI } from "@google/genai";
import AggregatedReportCard from './AggregatedReportCard';
import AggregatedDetailModal from './AggregatedDetailModal';

// Make TypeScript aware of the globals from CDNs
declare var Chart: any;
declare var XLSX: any;

// Fix: Correctly type the jsPDF library attached to the window object.
declare global {
    interface Window {
        jspdf: any;
    }
}


// --- Simple Markdown Renderer for AI Output ---
const SimpleMarkdownRenderer: React.FC<{ content: string | null }> = ({ content }) => {
    if (!content) return null;

    const elements: React.ReactNode[] = [];
    let currentTable: React.ReactNode[][] = [];

    const flushTable = () => {
        if (currentTable.length > 0) {
            const headerCells = currentTable[0];
            const bodyRows = currentTable.slice(1);
            elements.push(
                <table key={`table-${elements.length}`} className="w-full my-4 text-sm table-auto border-collapse">
                    <thead>
                        <tr className="border-b border-slate-600">
                            {headerCells.map((cell, i) => <th key={i} className="p-2 text-left font-semibold">{cell}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {bodyRows.map((row, i) => (
                            <tr key={i} className="border-b border-slate-800 last:border-b-0">
                                {row.map((cell, j) => <td key={j} className="p-2 align-top">{cell}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            currentTable = [];
        }
    };

    content.split('\n').forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
            if (trimmedLine.includes('---')) return;
            const cells = trimmedLine.split('|').slice(1, -1).map(c => c.trim());
            currentTable.push(cells);
        } else {
            flushTable();
            if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                elements.push(<li key={index} className="ml-5 list-disc my-1">{trimmedLine.substring(2)}</li>);
            } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                elements.push(<h4 key={index} className="font-semibold text-slate-200 mt-4">{trimmedLine.substring(2, trimmedLine.length - 2)}</h4>);
            }
            else if (trimmedLine) {
                elements.push(<p key={index} className="my-2">{trimmedLine}</p>);
            }
        }
    });

    flushTable(); // Flush any remaining table at the end

    return <div className="space-y-2">{elements}</div>;
};


// --- Report Detail Modal Component ---
const ReportDetailModal: React.FC<{ report: TestPath; onClose: () => void; onViewImage: (src: string) => void; }> = ({ report, onClose, onViewImage }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Details für "{report.title}"</h2>
                    <p className="text-sm text-slate-400">Getestet von: {report.testerName || 'N/A'}</p>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="divide-y divide-slate-700">
                        {report.items.map((item, index) => (
                            <div key={item.id} className="py-3 flex justify-between items-start">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-8 text-sm font-medium text-slate-400 text-right mr-4">{index + 1}.</div>
                                    <div className="flex-1">
                                        <p className="text-slate-200">{item.description}</p>
                                        {item.comment && (
                                            <p className="text-xs text-cyan-300/80 mt-1 pl-2 border-l-2 border-cyan-500/50 italic">
                                                {item.comment}
                                            </p>
                                        )}
                                        {item.commentImage && (
                                            <div className="mt-2">
                                                <img 
                                                  src={item.commentImage} 
                                                  alt="Kommentar Anhang" 
                                                  className="max-w-xs max-h-48 rounded-lg border border-slate-600 cursor-pointer hover:border-indigo-400 transition" 
                                                  onClick={() => onViewImage(item.commentImage!)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <StatusBadge status={item.status} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-800/50 border-t border-slate-700 px-6 py-4 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500">
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Image Modal Component (Lightbox) ---
const ImageModal: React.FC<{ imgSrc: string; onClose: () => void }> = ({ imgSrc, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 cursor-pointer" 
            onClick={onClose}
        >
            <img 
                src={imgSrc} 
                alt="Kommentar Anhang Vollansicht" 
                className="max-w-full max-h-full object-contain cursor-default"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
        </div>
    );
};


// --- Report Card Component ---
const ReportCard: React.FC<{ report: TestPath; onViewDetails: () => void; }> = ({ report, onViewDetails }) => {
    const summary = useMemo(() => {
        const total = report.items.length;
        if (total === 0) return { completion: 0, passed: 0, failed: 0, total: 0 };
        const passed = report.items.filter(item => item.status === TestStatus.PASSED).length;
        const failed = report.items.filter(item => item.status === TestStatus.FAILED).length;
        const completion = Math.round(((passed + failed) / total) * 100);
        return { completion, passed, failed, total };
    }, [report.items]);
    
    return (
        <div className="bg-slate-900/50 rounded-lg border border-white/10 p-4 flex flex-col justify-between transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1">
            <div>
                <h3 className="font-semibold text-slate-100 truncate">{report.title}</h3>
                <p className="text-sm text-slate-400">Von: {report.testerName || 'N/A'}</p>
                <p className="text-xs text-slate-500">{report.exportTimestamp ? new Date(report.exportTimestamp).toLocaleString('de-DE') : 'Kein Datum'}</p>
                
                <div className="w-full bg-slate-700 rounded-full h-2 my-3">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${summary.completion}%` }}></div>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-green-400">Bestanden: {summary.passed}</span>
                    <span className="text-red-400">Fehlgeschlagen: {summary.failed}</span>
                    <span className="text-slate-300">Gesamt: {summary.total}</span>
                </div>
            </div>
            <button onClick={onViewDetails} className="mt-4 w-full text-center px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors">
                Details ansehen
            </button>
        </div>
    );
};


const commonTooltipOptions = {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    titleColor: '#e2e8f0',
    bodyColor: '#cbd5e1',
    borderColor: '#4f46e5',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 4,
};


// --- Chart Components for Dark Theme ---
const ChartContainer: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-slate-900/50 p-4 rounded-lg border border-white/10 flex flex-col ${className}`}>
        <h4 className="text-lg font-semibold text-white mb-3 text-center">{title}</h4>
        <div className="relative flex-grow">
          {children}
        </div>
    </div>
);

const OverallStatusChart: React.FC<{ data: any }> = ({ data }) => {
    const chartRef = React.useRef<HTMLCanvasElement>(null);
    React.useEffect(() => {
        if (!chartRef.current || !data) return;
        const chart = new Chart(chartRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Bestanden', 'Fehlgeschlagen', 'In Bearbeitung', 'Nicht begonnen'],
                datasets: [{
                    data: [data.passed, data.failed, data.inProgress, data.notStarted],
                    backgroundColor: ['#4ade80', '#f87171', '#60a5fa', '#94a3b8'],
                    hoverBackgroundColor: ['#6ee7b7', '#fda4af', '#93c5fd', '#cbd5e1'],
                    borderColor: '#1e293b',
                    borderWidth: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1', padding: 20, boxWidth: 12 }
                    },
                    tooltip: commonTooltipOptions,
                }
            }
        });
        return () => chart.destroy();
    }, [data]);
    return <canvas ref={chartRef}></canvas>;
};

const PerformanceComparisonChart: React.FC<{ data: any }> = ({ data }) => {
    const chartRef = React.useRef<HTMLCanvasElement>(null);
    React.useEffect(() => {
        if (!chartRef.current || !data) return;
        const chart = new Chart(chartRef.current, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Bestanden',
                        data: data.passedData,
                        backgroundColor: '#22c55e50',
                        borderColor: '#22c55e',
                        hoverBackgroundColor: '#22c55e80',
                        borderWidth: 1
                    },
                    {
                        label: 'Fehlgeschlagen',
                        data: data.failedData,
                        backgroundColor: '#ef444450',
                        borderColor: '#ef4444',
                        hoverBackgroundColor: '#ef444480',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                aspectRatio: 3,
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#33415580' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#33415580' } }
                },
                plugins: {
                    legend: { labels: { color: '#cbd5e1' } },
                    tooltip: commonTooltipOptions,
                }
            }
        });
        return () => chart.destroy();
    }, [data]);
    return <canvas ref={chartRef}></canvas>;
};

const TopFailuresChart: React.FC<{ data: any }> = ({ data }) => {
    const chartRef = React.useRef<HTMLCanvasElement>(null);
    React.useEffect(() => {
        if (!chartRef.current || !data) return;
        const chart = new Chart(chartRef.current, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Fehleranzahl',
                    data: data.counts,
                    backgroundColor: (context: any) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
                        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
                        return gradient;
                    },
                    borderColor: '#ef4444',
                    hoverBackgroundColor: (context: any) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, 'rgba(248, 113, 113, 0.9)');
                        gradient.addColorStop(1, 'rgba(248, 113, 113, 0.4)');
                        return gradient;
                    },
                    hoverBorderColor: '#f87171',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        ticks: { color: '#94a3b8', stepSize: 1, precision: 0 }, 
                        grid: { color: '#33415540' } 
                    },
                    y: { 
                        ticks: { color: '#cbd5e1' }, 
                        grid: { display: false } 
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltipOptions,
                }
            }
        });
        return () => chart.destroy();
    }, [data]);
    return <canvas ref={chartRef}></canvas>;
};


// --- Main Comparison View Component ---
interface ComparisonViewProps {
  reports: TestPath[];
  onClose: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ reports, onClose }) => {
  const [selectedReport, setSelectedReport] = useState<TestPath | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingAggregatedReport, setViewingAggregatedReport] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const aggregatedReports = useMemo(() => {
    const reportGroups: { [title: string]: { items: TestItem[], testers: Set<string> } } = {};

    reports.forEach(report => {
        if (!reportGroups[report.title]) {
            reportGroups[report.title] = {
                items: [],
                testers: new Set(),
            };
        }
        reportGroups[report.title].items.push(...report.items);
        if (report.testerName) {
            reportGroups[report.title].testers.add(report.testerName);
        }
    });

    return Object.entries(reportGroups).map(([title, data]) => ({
        title,
        testerCount: data.testers.size,
        items: data.items,
    })).sort((a,b) => a.title.localeCompare(b.title));
  }, [reports]);

  const overallSummary = useMemo(() => {
    const allItems = reports.flatMap(r => r.items);
    const total = allItems.length;
    if (total === 0) {
        return { passed: 0, failed: 0, inProgress: 0, notStarted: 0, total: 0 };
    }
    const passed = allItems.filter(item => item.status === TestStatus.PASSED).length;
    const failed = allItems.filter(item => item.status === TestStatus.FAILED).length;
    const inProgress = allItems.filter(item => item.status === TestStatus.IN_PROGRESS).length;
    const notStarted = allItems.filter(item => item.status === TestStatus.NOT_STARTED).length;
    return { passed, failed, inProgress, notStarted, total };
  }, [reports]);

  const performanceChartData = useMemo(() => {
    const labels = reports.map(r => `${r.title} (${r.testerName || 'N/A'})`);
    const passedData = reports.map(r => r.items.filter(i => i.status === TestStatus.PASSED).length);
    const failedData = reports.map(r => r.items.filter(i => i.status === TestStatus.FAILED).length);
    return { labels, passedData, failedData };
  }, [reports]);

  const topFailuresData = useMemo(() => {
      const failureCounts: { [key: string]: number } = {};
      reports.flatMap(r => r.items)
          .filter(item => item.status === TestStatus.FAILED)
          .forEach(item => {
              failureCounts[item.description] = (failureCounts[item.description] || 0) + 1;
          });
      
      const sortedFailures = Object.entries(failureCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);

      return {
          labels: sortedFailures.map(([desc]) => desc),
          counts: sortedFailures.map(([, count]) => count),
      };
  }, [reports]);

  const handleGenerateAIAnalysis = useCallback(async () => {
    // ... (rest of the function is unchanged)
    if (reports.length === 0) {
        setAiError("Keine Berichte zur Analyse verfügbar.");
        return;
    }

    setIsLoadingAI(true);
    setAiReport(null);
    setAiEvaluation(null);
    setAiError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const simplifiedReports = reports.map(report => ({
            titel: report.title,
            testerName: report.testerName,
            exportZeitstempel: report.exportTimestamp,
            testpunkte: report.items.map(item => ({
                beschreibung: item.description,
                status: item.status,
                kommentar: item.comment || "N/A",
                hatBild: !!item.commentImage,
            }))
        }));

        const prompt = `
Handeln Sie als erfahrener QS-Analyst aus Deutschland. Ihre Aufgabe ist es, eine gründliche Analyse der folgenden Testberichte durchzuführen und einen strukturierten Bericht in deutscher Sprache im Markdown-Format zu erstellen.

Testdaten (JSON):
${JSON.stringify(simplifiedReports, null, 2)}

Bitte erstellen Sie den Bericht mit der folgenden exakten Struktur und den folgenden Überschriften:

### KI-Bericht (Zusammenfassung)
Erstellen Sie eine prägnante, übergeordnete Zusammenfassung. Berücksichtigen Sie dabei:
- Gesamtzahl der analysierten Berichte.
- Gesamtzahl der ausgeführten Testfälle (bestanden + fehlgeschlagen).
- Gesamt-Erfolgsquote in Prozent.
- Ein kurzer Schlusssatz zum Gesamtergebnis der Tests.

### KI-Auswertung (Detaillierte Analyse)
Erstellen Sie eine detaillierte, tiefgehende Auswertung, die die folgenden Punkte abdeckt:

**1. Häufigste Fehlerpunkte:**
Präsentieren Sie die 5 häufigsten Fehler in einer Markdown-Tabelle mit den Spalten "Fehlerbeschreibung" und "Anzahl".

**2. Leistungsvergleich:**
Vergleichen Sie direkt die Leistung der verschiedenen Testpläne (z. B. "Weg 1: Satteldach" vs. "Weg 2: Flachdach"). Geben Sie die Erfolgsquote für jeden Plan an und heben Sie hervor, welcher besser abgeschnitten hat.

**3. Analyse der Kommentare:**
Analysieren Sie die Kommentare zu fehlgeschlagenen Testpunkten, um mögliche Ursachen oder wiederkehrende Themen zu identifizieren.

**4. Handlungsempfehlungen:**
Geben Sie klare, umsetzbare Empfehlungen, die in folgende Kategorien unterteilt sind:
- **Prozessverbesserungen:** Vorschläge zur Verbesserung des Testprozesses.
- **Anpassungen der Testfälle:** Empfehlungen zur Änderung oder Ergänzung von Testfällen.
- **Mögliche Systemfehler:** Weisen Sie auf potenzielle Bugs oder Probleme in der getesteten Anwendung hin, die untersucht werden müssen.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
        });

        const text = response.text;
        
        const reportMatch = text.match(/### KI-Bericht \(Zusammenfassung\)([\s\S]*?)### KI-Auswertung \(Detaillierte Analyse\)/);
        const evaluationMatch = text.match(/### KI-Auswertung \(Detaillierte Analyse\)([\s\S]*)/);

        setAiReport(reportMatch ? reportMatch[1].trim() : "KI-Bericht konnte nicht geparst werden.");
        setAiEvaluation(evaluationMatch ? evaluationMatch[1].trim() : "KI-Auswertung konnte nicht geparst werden.");

    } catch (error) {
        console.error("Fehler bei der KI-Analyse:", error);
        setAiError("Fehler bei der Erstellung der KI-Analyse. Bitte prüfen Sie die Konsole für Details.");
    } finally {
        setIsLoadingAI(false);
    }
  }, [reports]);

    // --- NEW, OPTIMIZED PDF EXPORT HANDLER ---
    const handleExportPDF = useCallback(async () => {
        if (isExporting) return;
        setIsExporting(true);
        setShowExportDropdown(false);
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    
            const MARGIN = 40;
            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
            const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
            let y = MARGIN;
            let pageCount = 1;
    
            const sanitizeForPdf = (text: string | null | undefined): string => {
                if (!text) return '';
                const replacements: { [key: string]: string } = { '…': '...', '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '•': '*', '\u00A0': ' ' };
                let sanitized = text.replace(/[…‘’“”––•\u00A0]/g, char => replacements[char] || char);
                return sanitized.replace(/[^ -~äöüÄÖÜß\n\r]/g, '');
            };
    
            const addPage = () => {
                doc.addPage();
                pageCount++;
                y = MARGIN;
            };
    
            const checkPageBreak = (heightNeeded: number) => {
                if (y + heightNeeded > PAGE_HEIGHT - MARGIN) {
                    addPage();
                }
            };
    
            const renderChartToImage = async (chartConfig: any, width: number, height: number): Promise<string> => {
                const offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = width;
                offscreenCanvas.height = height;
                const chart = new Chart(offscreenCanvas, { ...chartConfig, options: { ...chartConfig.options, animation: false, responsive: false, devicePixelRatio: 2 } });
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for render
                const dataUrl = offscreenCanvas.toDataURL('image/png', 1.0);
                chart.destroy();
                return dataUrl;
            };
    
            const lightThemeColors = { text: '#333333', heading: '#000000', subHeading: '#555555', green: '#28a745', red: '#dc3545', blue: '#007bff', gray: '#6c757d' };
            const renderMarkdownToPdf = (markdown: string) => {
                 markdown.split('\n').forEach(line => {
                    const trimmedLine = line.trim();
                    checkPageBreak(20);
                    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
                       // Simple table rendering is complex, this will be text for now
                       doc.setFontSize(9).setFont('courier', 'normal').setTextColor(lightThemeColors.text);
                       doc.text(sanitizeForPdf(trimmedLine), MARGIN, y);
                       y += 10;
                    } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                       doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
                       const text = trimmedLine.substring(2, trimmedLine.length - 2);
                       doc.text(sanitizeForPdf(text), MARGIN, y);
                       y += 14;
                    } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                       doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(lightThemeColors.text);
                       const text = trimmedLine.substring(2);
                       const lines = doc.splitTextToSize(sanitizeForPdf(text), CONTENT_WIDTH - 15);
                       doc.text('•', MARGIN, y);
                       doc.text(lines, MARGIN + 15, y);
                       y += lines.length * 12;
                    } else if (trimmedLine) {
                       doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(lightThemeColors.text);
                       const lines = doc.splitTextToSize(sanitizeForPdf(trimmedLine), CONTENT_WIDTH);
                       doc.text(lines, MARGIN, y);
                       y += lines.length * 12 + 4;
                    }
                });
            };
    
            // --- PAGE 1: Dashboard ---
            doc.setFontSize(24).setTextColor(lightThemeColors.heading).setFont('helvetica', 'bold');
            doc.text('Test-Vergleichsbericht', PAGE_WIDTH / 2, y, { align: 'center' });
            y += 40;
    
            const lightChartOptions = (textColor: string, gridColor: string) => ({
                plugins: { legend: { labels: { color: textColor, boxWidth: 10, padding: 10 }, position: 'right' } },
                scales: { x: { ticks: { color: textColor }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } }
            });
    
            const overallChartImg = await renderChartToImage({
                type: 'doughnut',
                data: { labels: ['Bestanden', 'Fehlgeschlagen', 'In Bearbeitung', 'Nicht begonnen'], datasets: [{ data: [overallSummary.passed, overallSummary.failed, overallSummary.inProgress, overallSummary.notStarted], backgroundColor: [lightThemeColors.green, lightThemeColors.red, lightThemeColors.blue, lightThemeColors.gray], borderColor: '#fff', borderWidth: 2 }] },
                options: { ...lightChartOptions(lightThemeColors.text, '#e9ecef'), cutout: '70%' }
            }, 600, 300);
            
            doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
            doc.text('Visuelle Analyse', MARGIN, y);
            y += 20;
            doc.addImage(overallChartImg, 'PNG', MARGIN, y, CONTENT_WIDTH, CONTENT_WIDTH / 2);
            y += (CONTENT_WIDTH / 2) + 20;
    
            // --- DETAILED REPORTS ---
            addPage();
            doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
            doc.text('Detaillierte Testberichte', MARGIN, y);
            y += 25;
    
            for (const report of reports) {
                const reportHeader = `${report.title} (Tester: ${report.testerName || 'N/A'})`;
                checkPageBreak(40);
                doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
                doc.text(sanitizeForPdf(reportHeader), MARGIN, y);
                y += 20;
    
                for (const item of report.items) {
                    checkPageBreak(15);
                    const statusColors: { [key: string]: string } = { [TestStatus.PASSED]: lightThemeColors.green, [TestStatus.FAILED]: lightThemeColors.red, [TestStatus.IN_PROGRESS]: lightThemeColors.blue, [TestStatus.NOT_STARTED]: lightThemeColors.gray };
                    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(statusColors[item.status] || lightThemeColors.text);
                    doc.text(`[${item.status}]`, MARGIN, y, { charSpace: 0.5 });
                    
                    doc.setFont('helvetica', 'normal').setTextColor(lightThemeColors.text);
                    const descLines = doc.splitTextToSize(sanitizeForPdf(item.description), CONTENT_WIDTH - 80);
                    doc.text(descLines, MARGIN + 80, y);
                    y += descLines.length * 12;

                    if (item.comment) {
                        checkPageBreak(12);
                        doc.setFont('helvetica', 'italic').setTextColor(lightThemeColors.subHeading);
                        const commentLines = doc.splitTextToSize(sanitizeForPdf(`Kommentar: ${item.comment}`), CONTENT_WIDTH - 90);
                        doc.text(commentLines, MARGIN + 90, y);
                        y += commentLines.length * 12;
                    }
                    y += 5;
                }
                y += 15;
            }
    
            // --- AI ANALYSIS ---
            if (aiReport && aiEvaluation) {
                addPage();
                doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
                doc.text('KI-gestützte Analyse', MARGIN, y);
                y += 25;
                
                doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
                doc.text("KI-Bericht (Zusammenfassung)", MARGIN, y);
                y += 15;
                renderMarkdownToPdf(aiReport);
    
                checkPageBreak(40);
                y += 20;
                doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
                doc.text("KI-Auswertung (Detaillierte Analyse)", MARGIN, y);
                y += 15;
                renderMarkdownToPdf(aiEvaluation);
            }
    
            // Add footers to all pages
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8).setTextColor(150);
                doc.text(`Seite ${i} von ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 20, { align: 'right' });
                doc.text('Test-Vergleichsbericht', MARGIN, PAGE_HEIGHT - 20);
            }
    
            doc.save('test-vergleichsbericht.pdf');
        } catch (error) {
            console.error("PDF-Export fehlgeschlagen:", error);
            alert("PDF-Export fehlgeschlagen. Details in der Konsole.");
        } finally {
            setIsExporting(false);
        }
    }, [reports, overallSummary, performanceChartData, topFailuresData, aiReport, aiEvaluation, isExporting]);


  const handleExportHTML = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
        const renderChartToImage = async (chartConfig: any, width: number, height: number): Promise<string> => {
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = width;
            offscreenCanvas.height = height;
            const chart = new Chart(offscreenCanvas, { ...chartConfig, options: {...chartConfig.options, animation: false, responsive: false, devicePixelRatio: 2} });
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for render
            const dataUrl = offscreenCanvas.toDataURL('image/png', 1.0);
            chart.destroy();
            return dataUrl;
        };
        
        const darkThemeChartOptions = {
            plugins: { legend: { labels: { color: '#cbd5e1' } } },
            scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#33415580' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#33415580' } } }
        };

        const overallChartLabelsWithCount = [
            `${TestStatus.PASSED} (${overallSummary.passed})`,
            `${TestStatus.FAILED} (${overallSummary.failed})`,
            `${TestStatus.IN_PROGRESS} (${overallSummary.inProgress})`,
            `${TestStatus.NOT_STARTED} (${overallSummary.notStarted})`,
        ];

        const overallChartConfig = {
            type: 'doughnut', data: { 
                labels: overallChartLabelsWithCount, 
                datasets: [{ data: [overallSummary.passed, overallSummary.failed, overallSummary.inProgress, overallSummary.notStarted], backgroundColor: ['#4ade80', '#f87171', '#60a5fa', '#94a3b8'], borderColor: '#1e293b', borderWidth: 4 }] 
            },
            options: { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', padding: 20, boxWidth: 12 } } } }
        };

        const topFailuresChartConfig = {
             type: 'bar', data: { labels: topFailuresData.labels, datasets: [{ label: 'Fehleranzahl', data: topFailuresData.counts, backgroundColor: '#ef444480', borderColor: '#ef4444', borderWidth: 1, borderRadius: 6 }] },
             options: { ...darkThemeChartOptions, indexAxis: 'y', plugins: { legend: { display: false } } }
        };
        
        const topChartHeight = 350;
        const overallChartImg = await renderChartToImage(overallChartConfig, topChartHeight, topChartHeight);
        const topFailuresChartImg = topFailuresData.labels.length > 0 ? await renderChartToImage(topFailuresChartConfig, topChartHeight * 3, topChartHeight) : '';

        const simpleMarkdownToHtml = (text: string) => {
             if (!text) return '';
             let html = '';
             let inTable = false;
             text.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                    if (!inTable) { html += '<table class="w-full my-4 text-sm table-auto border-collapse">'; inTable = true; }
                    if(trimmed.includes('---')) {
                         html += `<thead><tr class="border-b border-slate-600">${trimmed.split('|').slice(1, -1).map(c => `<th class="p-2 text-left font-semibold">${c.replace(/---/g, '').trim()}</th>`).join('')}</tr></thead><tbody>`;
                    } else {
                         html += `<tr class="border-b border-slate-800 last:border-b-0">${trimmed.split('|').slice(1, -1).map(c => `<td class="p-2 align-top">${c.trim()}</td>`).join('')}</tr>`;
                    }
                } else {
                    if (inTable) { html += '</tbody></table>'; inTable = false; }
                    if (trimmed.startsWith('**') && trimmed.endsWith('**')) html += `<h4 class="font-semibold text-slate-200 mt-4">${trimmed.substring(2, trimmed.length - 2)}</h4>`;
                    else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) html += `<li class="ml-5 list-disc my-1">${trimmed.substring(2)}</li>`;
                    else if (trimmed) html += `<p class="my-2">${trimmed}</p>`;
                }
             });
             if (inTable) html += '</tbody></table>';
             return html;
        };
        
        const getStatusBadgeHtml = (status: TestStatus) => {
            let styles = '';
            switch (status) {
                case TestStatus.PASSED: styles = 'bg-green-500/20 text-green-300'; break;
                case TestStatus.FAILED: styles = 'bg-red-500/20 text-red-300'; break;
                case TestStatus.IN_PROGRESS: styles = 'bg-blue-500/20 text-blue-300'; break;
                default: styles = 'bg-slate-500/20 text-slate-300'; break;
            }
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles} flex-shrink-0">${status}</span>`;
        };

        const htmlContent = `
            <!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Test-Vergleichsbericht</title><script src="https://cdn.tailwindcss.com"></script><style>body{background-color:#0f172a;color:#cbd5e1;font-family:sans-serif;}</style></head>
            <body><main class="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
                <h1 class="text-3xl font-bold text-white mb-6 text-center">Test-Vergleichsbericht</h1>
                
                <div class="bg-slate-800 rounded-2xl p-6 md:p-8 mb-8">
                    <h3 class="text-xl font-semibold text-white text-center mb-4">Gesamtübersicht</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div><div class="text-3xl font-bold text-green-400">${overallSummary.passed}</div><div class="text-sm text-slate-400">Bestanden</div></div>
                        <div><div class="text-3xl font-bold text-red-400">${overallSummary.failed}</div><div class="text-sm text-slate-400">Fehlgeschlagen</div></div>
                        <div><div class="text-3xl font-bold text-blue-400">${overallSummary.inProgress}</div><div class="text-sm text-slate-400">In Bearbeitung</div></div>
                        <div><div class="text-3xl font-bold text-slate-400">${overallSummary.notStarted}</div><div class="text-sm text-slate-400">Nicht begonnen</div></div>
                    </div>
                </div>

                <div class="bg-slate-800 rounded-2xl p-6 md:p-8 mb-8">
                    <h3 class="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-3">Visuelle Analyse</h3>
                     <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div class="md:col-span-1 bg-slate-900/50 p-4 rounded-lg"><h4 class="text-lg font-semibold text-white mb-3 text-center">Gesamtstatusverteilung</h4><img src="${overallChartImg}" alt="Gesamtstatus-Diagramm"/></div>
                        <div class="md:col-span-3 bg-slate-900/50 p-4 rounded-lg">${topFailuresData.labels.length > 0 ? `<h4 class="text-lg font-semibold text-white mb-3 text-center">Top 5 Fehlerpunkte</h4><img src="${topFailuresChartImg}" alt="Top-Fehler-Diagramm"/>` : ''}</div>
                    </div>
                </div>
                
                <div class="mb-8">
                    <h3 class="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-3">Aggregierte Testpfad-Analyse</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                        ${aggregatedReports.map(aggReport => {
                            const summary = {
                                passed: aggReport.items.filter(i => i.status === 'Bestanden').length,
                                failed: aggReport.items.filter(i => i.status === 'Fehlgeschlagen').length,
                                total: aggReport.items.length
                            };
                            const passedPercent = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
                            const failedPercent = summary.total > 0 ? (summary.failed / summary.total) * 100 : 0;
                            return `<div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-indigo-500/30 p-4">
                                <h3 class="font-semibold text-indigo-300 truncate">${aggReport.title}</h3>
                                <p class="text-sm text-slate-400 mb-3">${aggReport.testerCount} ${aggReport.testerCount > 1 ? 'Tester' : 'Tester'}</p>
                                <div class="w-full bg-slate-700 rounded-full h-2.5 my-3 flex overflow-hidden">
                                    <div class="bg-green-500 h-2.5" style="width: ${passedPercent}%"></div>
                                    <div class="bg-red-500 h-2.5" style="width: ${failedPercent}%"></div>
                                </div>
                                <div class="flex justify-between text-sm mt-2">
                                    <span class="text-green-400">Bestanden: ${summary.passed}</span>
                                    <span class="text-red-400">Fehlgeschlagen: ${summary.failed}</span>
                                    <span class="text-slate-300">Gesamt: ${summary.total}</span>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <div class="mb-8">
                     <h3 class="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-3">Einzelne Berichte (${reports.length})</h3>
                     <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                        ${reports.map(report => {
                             const summary = {
                                total: report.items.length,
                                passed: report.items.filter(item => item.status === 'Bestanden').length,
                                failed: report.items.filter(item => item.status === 'Fehlgeschlagen').length,
                             };
                             const completion = summary.total > 0 ? Math.round(((summary.passed + summary.failed) / summary.total) * 100) : 0;
                             return `<div class="bg-slate-900/50 rounded-lg border border-white/10 p-4">
                                <h3 class="font-semibold text-slate-100 truncate">${report.title}</h3>
                                <p class="text-sm text-slate-400">Von: ${report.testerName || 'N/A'}</p>
                                <p class="text-xs text-slate-500">${report.exportTimestamp ? new Date(report.exportTimestamp).toLocaleString('de-DE') : 'Kein Datum'}</p>
                                <div class="w-full bg-slate-700 rounded-full h-2 my-3"><div class="bg-indigo-500 h-2 rounded-full" style="width: ${completion}%"></div></div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-green-400">Bestanden: ${summary.passed}</span>
                                    <span class="text-red-400">Fehlgeschlagen: ${summary.failed}</span>
                                    <span class="text-slate-300">Gesamt: ${summary.total}</span>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                
                ${(aiReport && aiEvaluation) ? `
                <div class="bg-slate-800 rounded-2xl p-6 md:p-8 mt-8">
                    <h3 class="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-3">KI-gestützte Analyse</h3>
                    <div class="prose prose-invert prose-slate max-w-none prose-h3:text-indigo-400 prose-table:w-full prose-th:text-left">
                        <h4 class="font-semibold text-indigo-400">KI-Bericht (Zusammenfassung)</h4>
                        ${simpleMarkdownToHtml(aiReport)}
                        <h4 class="font-semibold text-indigo-400 mt-6">KI-Auswertung (Detaillierte Analyse)</h4>
                        ${simpleMarkdownToHtml(aiEvaluation)}
                    </div>
                </div>` : ''}

                <div class="mt-8">
                    <h3 class="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-3">Detaillierte Testberichte</h3>
                    <div class="space-y-6 mt-4">
                        ${reports.map(report => `
                            <div class="bg-slate-900/50 rounded-lg border border-white/10 p-4">
                                <h4 class="font-semibold text-slate-100">${report.title}</h4>
                                <p class="text-sm text-slate-400">Von: ${report.testerName || 'N/A'}</p>
                                <p class="text-xs text-slate-500">${report.exportTimestamp ? new Date(report.exportTimestamp).toLocaleString('de-DE') : 'Kein Datum'}</p>
                                <div class="mt-4 divide-y divide-slate-700">
                                    ${report.items.map((item, index) => `
                                        <div class="py-2 flex justify-between items-start gap-4">
                                            <div class="flex items-start">
                                                <div class="w-8 text-slate-400 flex-shrink-0">${index + 1}.</div>
                                                <div class="flex-grow">
                                                    <p class="text-slate-200">${item.description}</p>
                                                    ${item.comment ? `<p class="text-sm text-cyan-300/80 italic mt-1">"${item.comment}"</p>` : ''}
                                                    ${item.commentImage ? `<img src="${item.commentImage}" alt="Anhang" class="max-w-xs mt-2 rounded border border-slate-600"/>` : ''}
                                                </div>
                                            </div>
                                            ${getStatusBadgeHtml(item.status)}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </main></body></html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'test-vergleichsbericht.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("HTML-Export fehlgeschlagen:", error);
        alert("HTML-Export fehlgeschlagen.");
    } finally {
        setIsExporting(false);
    }
  }, [reports, overallSummary, performanceChartData, topFailuresData, aggregatedReports, aiReport, aiEvaluation, isExporting]);

  const handleExportXLSX = useCallback(() => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
        const wb = XLSX.utils.book_new();

        type OverviewRow = {
            "Testplan": string;
            "Tester": number | string;
            "Gesamtdurchläufe": number | string;
            "Bestanden": number | string;
            "Fehlgeschlagen": number | string;
            "Erfolgsquote (%)": number | string;
        };
        const overviewData: OverviewRow[] = aggregatedReports.map(r => {
            const passed = r.items.filter(i => i.status === TestStatus.PASSED).length;
            const failed = r.items.filter(i => i.status === TestStatus.FAILED).length;
            const totalRuns = r.items.length / r.testerCount; // Assuming items are duplicated per tester run
            return {
                "Testplan": r.title,
                "Tester": r.testerCount,
                "Gesamtdurchläufe": totalRuns,
                "Bestanden": passed,
                "Fehlgeschlagen": failed,
                "Erfolgsquote (%)": totalRuns > 0 ? Math.round((passed / totalRuns) * 100) : 0,
            };
        });
        overviewData.unshift({
            "Testplan": "--- GESAMTÜBERSICHT ---", "Tester": "", "Gesamtdurchläufe": "", "Bestanden": "", "Fehlgeschlagen": "", "Erfolgsquote (%)": ""
        });
        const totalPassRate = (overallSummary.passed + overallSummary.failed) > 0 ? Math.round((overallSummary.passed / (overallSummary.passed + overallSummary.failed)) * 100) : 0;
        overviewData.push({
            "Testplan": "Gesamt", "Tester": "", "Gesamtdurchläufe": overallSummary.passed + overallSummary.failed,
            "Bestanden": overallSummary.passed, "Fehlgeschlagen": overallSummary.failed, 
            "Erfolgsquote (%)": totalPassRate
        });
        const wsOverview = XLSX.utils.json_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, "Übersicht");

        // Sheet 2: AI Analysis
        if (aiReport && aiEvaluation) {
            const aiData = [{ "Abschnitt": "KI-Bericht (Zusammenfassung)", "Inhalt": aiReport }, { "Abschnitt": "KI-Auswertung (Detaillierte Analyse)", "Inhalt": aiEvaluation }];
            const wsAi = XLSX.utils.json_to_sheet(aiData);
            wsAi['!cols'] = [{ wch: 40 }, { wch: 100 }];
            XLSX.utils.book_append_sheet(wb, wsAi, "KI-Analyse");
        }

        // Sheet 3: Raw Data
        const rawData = reports.flatMap(r => 
            r.items.map(item => ({
                "Berichtstitel": r.title,
                "Tester": r.testerName || 'N/A',
                "Zeitstempel": r.exportTimestamp ? new Date(r.exportTimestamp).toLocaleString('de-DE') : '',
                "Testpunkt-Beschreibung": item.description,
                "Status": item.status,
                "Kommentar": item.comment || '',
                "Hat Bild": item.commentImage ? 'Ja' : 'Nein',
            }))
        );
        const wsRaw = XLSX.utils.json_to_sheet(rawData);
        wsRaw['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 60 }, { wch: 15 }, { wch: 60 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsRaw, "Rohdaten");

        XLSX.writeFile(wb, "test-vergleichsbericht.xlsx");
    } catch (error) {
        console.error("XLSX-Export fehlgeschlagen:", error);
        alert("Excel-Export fehlgeschlagen.");
    } finally {
        setIsExporting(false);
    }
  }, [reports, aggregatedReports, aiReport, aiEvaluation, isExporting, overallSummary]);


  return (
    <main className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">Vergleichsbericht</h2>
          <div className="flex items-center space-x-2">
             {/* --- EXPORT DROPDOWN --- */}
             <div className="relative">
                <button 
                    onClick={() => setShowExportDropdown(prev => !prev)}
                    disabled={isExporting}
                    className="inline-flex items-center justify-center w-36 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                    {isExporting ? 'Exportiere...' : 'Exportieren'}
                    <svg className={`w-4 h-4 ml-2 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showExportDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10">
                        <button onClick={handleExportPDF} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">Als PDF exportieren</button>
                        <button onClick={handleExportHTML} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">Als HTML exportieren</button>
                        <button onClick={handleExportXLSX} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">Nach Excel exportieren</button>
                    </div>
                )}
             </div>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors">
                Schließen
            </button>
          </div>
        </div>

        {/* --- Overall Summary --- */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-white/10 p-6 md:p-8 mb-8">
            <div className="border-b border-slate-700 pb-3 mb-4">
                <h3 className="text-xl font-semibold text-white">Gesamtübersicht</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-green-400">{overallSummary.passed}</div>
                    <div className="text-sm text-slate-400">Bestanden</div>
                </div>
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-red-400">{overallSummary.failed}</div>
                    <div className="text-sm text-slate-400">Fehlgeschlagen</div>
                </div>
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-blue-400">{overallSummary.inProgress}</div>
                    <div className="text-sm text-slate-400">In Bearbeitung</div>
                </div>
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-slate-400">{overallSummary.notStarted}</div>
                    <div className="text-sm text-slate-400">Nicht begonnen</div>
                </div>
            </div>
        </div>

        {/* --- Visual Analysis --- */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-white/10 p-6 md:p-8 mb-8">
            <div className="border-b border-slate-700 pb-3 mb-4">
                <h3 className="text-xl font-semibold text-white">Visuelle Analyse</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div className="md:col-span-1">
                    <ChartContainer title="Gesamtstatusverteilung" className="h-full">
                        <OverallStatusChart data={overallSummary} />
                    </ChartContainer>
                </div>
                <div className="md:col-span-3">
                    {topFailuresData.labels.length > 0 && (
                      <ChartContainer title="Top 5 Fehlerpunkte" className="h-full">
                          <TopFailuresChart data={topFailuresData} />
                      </ChartContainer>
                    )}
                </div>
            </div>
            <div>
                <ChartContainer title="Leistung pro Bericht">
                    <PerformanceComparisonChart data={performanceChartData} />
                </ChartContainer>
            </div>
        </div>
        
        {/* --- Aggregated & Imported Reports Section --- */}
        <div className="space-y-8">
            <div>
                <div className="border-b border-slate-700 pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-white">Aggregierte Testpfad-Analyse</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {aggregatedReports.map((aggReport) => (
                        <AggregatedReportCard
                            key={aggReport.title}
                            title={aggReport.title}
                            testerCount={aggReport.testerCount}
                            items={aggReport.items}
                            onViewDetails={() => setViewingAggregatedReport(aggReport.title)}
                        />
                    ))}
                </div>
            </div>
        
            <div>
                 <div className="border-b border-slate-700 pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-white">Einzelne Berichte (${reports.length})</h3>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {reports.map((report, index) => (
                        <ReportCard key={index} report={report} onViewDetails={() => setSelectedReport(report)} />
                    ))}
                </div>
            </div>
        </div>


        {/* --- AI Analysis --- */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-white/10 p-6 md:p-8 mt-8">
            <div className="border-b border-slate-700 pb-3 mb-4">
                <h3 className="text-xl font-semibold text-white">KI-gestützte Analyse</h3>
            </div>
            {!aiReport && !isLoadingAI && !aiError && (
                 <div className="text-center">
                    <p className="text-slate-400 mb-4">Erstellen Sie eine KI-Zusammenfassung und -Auswertung der importierten Berichte.</p>
                    <button 
                        onClick={handleGenerateAIAnalysis}
                        className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
                    >
                        Analyse erstellen
                    </button>
                 </div>
            )}
            {isLoadingAI && (
                <div className="flex items-center justify-center space-x-3 text-slate-300">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>KI-Bericht wird erstellt...</span>
                </div>
            )}
            {aiError && <p className="text-red-400 text-center">{aiError}</p>}
            {aiReport && aiEvaluation && (
                 <div className="prose prose-invert prose-slate max-w-none prose-h3:text-indigo-400 prose-table:w-full prose-th:text-left">
                    <h3 className="!text-lg !font-semibold !text-indigo-400">KI-Bericht (Zusammenfassung)</h3>
                    <SimpleMarkdownRenderer content={aiReport} />
                    <h3 className="!text-lg !font-semibold !text-indigo-400 mt-6">KI-Auswertung (Detaillierte Analyse)</h3>
                    <SimpleMarkdownRenderer content={aiEvaluation} />
                </div>
            )}
        </div>
      </div>

      {selectedReport && <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} onViewImage={setViewingImage} />}
      {viewingImage && <ImageModal imgSrc={viewingImage} onClose={() => setViewingImage(null)} />}
      {viewingAggregatedReport && (
        <AggregatedDetailModal
          reportTitle={viewingAggregatedReport}
          reports={reports}
          onClose={() => setViewingAggregatedReport(null)}
          onViewImage={setViewingImage}
        />
      )}
    </main>
  );
};

export default ComparisonView;