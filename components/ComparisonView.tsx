

import React, { useMemo, useState } from 'react';
import { TestPath, TestItem, TestStatus } from '../types';
import StatusBadge from './StatusBadge';
import AggregatedReportCard from './AggregatedReportCard';
import AggregatedDetailModal from './AggregatedDetailModal';
import DiffViewModal from './HtmlReportModal';

// Make TypeScript aware of the globals from CDNs
declare var Chart: any;

// Fix: Correctly type the jsPDF library attached to the window object.
declare global {
    interface Window {
        jspdf: any;
    }
}


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
const ReportCard: React.FC<{ report: TestPath; onViewDetails: () => void; onSelect: () => void; isSelected: boolean; }> = ({ report, onViewDetails, onSelect, isSelected }) => {
    const summary = useMemo(() => {
        const total = report.items.length;
        if (total === 0) return { completion: 0, passed: 0, failed: 0, total: 0 };
        const passed = report.items.filter(item => item.status === TestStatus.PASSED).length;
        const failed = report.items.filter(item => item.status === TestStatus.FAILED).length;
        const completion = Math.round(((passed + failed) / total) * 100);
        return { completion, passed, failed, total };
    }, [report.items]);
    
    return (
        <div 
            onClick={onSelect}
            title="Zum Vergleich auswählen/abwählen"
            className={`bg-slate-900/50 rounded-lg border border-white/10 p-4 flex flex-col justify-between transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 relative cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
        >
            <div className="absolute top-2 right-2 z-10">
                <input 
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                />
            </div>
            
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
            <button onClick={(e) => { e.stopPropagation(); onViewDetails(); }} className="mt-4 w-full text-center px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors relative z-10">
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
  selectedForDiff: TestPath[];
  isDiffing: boolean;
  aggregatedReports: any[]; // Replace with a more specific type if possible
  overallSummary: any;
  performanceChartData: any;
  topFailuresData: any;
  onSelectForDiff: (report: TestPath) => void;
  setIsDiffing: (isDiffing: boolean) => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ 
    reports,
    selectedForDiff,
    isDiffing,
    aggregatedReports,
    overallSummary,
    performanceChartData,
    topFailuresData,
    onSelectForDiff,
    setIsDiffing
}) => {
  const [selectedReport, setSelectedReport] = useState<TestPath | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingAggregatedReport, setViewingAggregatedReport] = useState<string | null>(null);

  return (
    <main className="p-4 sm:p-6 md:p-8">
      <div>
        {/* The main header has been removed from this component */}

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
                        <ReportCard 
                            key={`${report.title}-${report.testerName}-${index}`} 
                            report={report} 
                            onViewDetails={() => setSelectedReport(report)}
                            onSelect={() => onSelectForDiff(report)}
                            isSelected={selectedForDiff.some(r => r === report)}
                        />
                    ))}
                </div>
            </div>
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
      {isDiffing && selectedForDiff.length >= 2 && (
        <DiffViewModal 
            reports={selectedForDiff}
            onClose={() => setIsDiffing(false)}
            onViewImage={setViewingImage}
        />
      )}
    </main>
  );
};

export default ComparisonView;
