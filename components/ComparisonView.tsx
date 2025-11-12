

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
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Details für "{report.title}"</h2>
                    <p className="text-sm text-gray-400">Getestet von: {report.testerName || 'N/A'}</p>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="divide-y divide-gray-700">
                        {report.items.map((item, index) => (
                            <div key={item.id} className="py-3 flex justify-between items-start">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-8 text-sm font-medium text-gray-400 text-right mr-4">{index + 1}.</div>
                                    <div className="flex-1">
                                        <p className="text-gray-200">{item.description}</p>
                                        {item.comment && (
                                            <p className="text-xs text-cyan-300/80 mt-1 pl-2 border-l-2 border-cyan-500/50 italic">
                                                {item.comment}
                                            </p>
                                        )}
                                        {item.commentImages && item.commentImages.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {item.commentImages.map((imgSrc, imgIndex) => (
                                                    <img
                                                      key={imgIndex}
                                                      src={imgSrc}
                                                      alt={`Kommentar Anhang ${imgIndex + 1}`}
                                                      className="max-w-xs max-h-48 rounded-lg border border-gray-600 cursor-pointer hover:border-blue-500 transition"
                                                      onClick={() => onViewImage(imgSrc)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <StatusBadge status={item.status} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500">
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
            className={`bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col justify-between transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 relative cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
            <div className="absolute top-2 right-2 z-10">
                <input 
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-5 w-5 rounded bg-gray-700 border-gray-500 text-blue-600 focus:ring-blue-500 pointer-events-none"
                />
            </div>
            
            <div>
                <h3 className="font-semibold text-gray-100 truncate">{report.title}</h3>
                <p className="text-sm text-gray-400">Von: {report.testerName || 'N/A'}</p>
                <p className="text-xs text-gray-500">{report.exportTimestamp ? new Date(report.exportTimestamp).toLocaleString('de-DE') : 'Kein Datum'}</p>
                
                <div className="w-full bg-gray-700 rounded-full h-2 my-3">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${summary.completion}%` }}></div>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-green-400">Bestanden: {summary.passed}</span>
                    <span className="text-red-400">Fehlgeschlagen: {summary.failed}</span>
                    <span className="text-gray-300">Gesamt: {summary.total}</span>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onViewDetails(); }} className="mt-4 w-full text-center px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 transition-colors relative z-10">
                Details ansehen
            </button>
        </div>
    );
};


const commonTooltipOptions = {
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    titleColor: '#e5e7eb',
    bodyColor: '#d1d5db',
    borderColor: '#3b82f6',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 4,
};


// --- Chart Components for Dark Theme ---
const ChartContainer: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col ${className}`}>
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
                    backgroundColor: ['#22c55e', '#ef4444', '#3b82f6', '#6b7280'],
                    hoverBackgroundColor: ['#4ade80', '#f87171', '#60a5fa', '#9ca3af'],
                    borderColor: '#1f2937',
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
                        labels: { color: '#9ca3af', padding: 20, boxWidth: 12 }
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
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        borderColor: '#22c55e',
                        hoverBackgroundColor: 'rgba(34, 197, 94, 0.75)',
                        borderWidth: 1
                    },
                    {
                        label: 'Fehlgeschlagen',
                        data: data.failedData,
                        backgroundColor: 'rgba(239, 68, 68, 0.5)',
                        borderColor: '#ef4444',
                        hoverBackgroundColor: 'rgba(239, 68, 68, 0.75)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                aspectRatio: 3,
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
                },
                plugins: {
                    legend: { labels: { color: '#9ca3af' } },
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
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: '#ef4444',
                    hoverBackgroundColor: 'rgba(239, 68, 68, 0.8)',
                    hoverBorderColor: '#f87171',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        ticks: { color: '#9ca3af', stepSize: 1, precision: 0 }, 
                        grid: { color: '#374151' } 
                    },
                    y: { 
                        ticks: { color: '#d1d5db' }, 
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
  const [filterText, setFilterText] = useState('');

  const filteredReports = useMemo(() => {
    if (!filterText) {
        return reports;
    }
    const lowercasedFilter = filterText.toLowerCase();
    return reports.filter(report =>
        report.title.toLowerCase().includes(lowercasedFilter) ||
        (report.testerName && report.testerName.toLowerCase().includes(lowercasedFilter))
    );
  }, [reports, filterText]);


  return (
    <main className="p-4 sm:p-6 md:p-8">
      <div>
        {/* The main header has been removed from this component */}

        {/* --- Overall Summary --- */}
        <div className="bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-gray-800 p-6 md:p-8 mb-8">
            <div className="border-b border-gray-700 pb-3 mb-4">
                <h3 className="text-xl font-semibold text-white">Gesamtübersicht</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-green-400">{overallSummary.passed}</div>
                    <div className="text-sm text-gray-400">Bestanden</div>
                </div>
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-red-400">{overallSummary.failed}</div>
                    <div className="text-sm text-gray-400">Fehlgeschlagen</div>
                </div>
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-blue-400">{overallSummary.inProgress}</div>
                    <div className="text-sm text-gray-400">In Bearbeitung</div>
                </div>
                <div className="p-2 rounded-md">
                    <div className="text-3xl font-bold text-gray-400">{overallSummary.notStarted}</div>
                    <div className="text-sm text-gray-400">Nicht begonnen</div>
                </div>
            </div>
        </div>

        {/* --- Visual Analysis --- */}
        <div className="bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-gray-800 p-6 md:p-8 mb-8">
            <div className="border-b border-gray-700 pb-3 mb-4">
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
                <div className="border-b border-gray-700 pb-3 mb-4">
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
                 <div className="border-b border-gray-700 pb-3 mb-4 flex justify-between items-center flex-wrap gap-4">
                    <h3 className="text-xl font-semibold text-white">Einzelne Berichte ({filteredReports.length})</h3>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filtern nach Titel oder Tester..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-gray-200 placeholder-gray-400"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredReports.map((report, index) => (
                        <ReportCard 
                            key={`${report.title}-${report.testerName}-${index}`} 
                            report={report} 
                            onViewDetails={() => setSelectedReport(report)}
                            onSelect={() => onSelectForDiff(report)}
                            isSelected={selectedForDiff.some(r => r === report)}
                        />
                    ))}
                </div>
                 {filteredReports.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p>Keine Berichte entsprechen Ihrem Filter.</p>
                    </div>
                )}
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