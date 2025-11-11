
import React, { useMemo } from 'react';
import { TestPath, TestItem, TestStatus } from '../types';

interface AggregatedDetailModalProps {
  reportTitle: string;
  reports: TestPath[];
  onClose: () => void;
  onViewImage: (src: string) => void;
}

interface AggregatedItem {
    description: string;
    runs: number;
    passed: number;
    failed: number;
    inProgress: number;
    notStarted: number;
    comments: {
        testerName: string;
        comment?: string;
        commentImage?: string;
    }[];
}

const AggregatedDetailModal: React.FC<AggregatedDetailModalProps> = ({ reportTitle, reports, onClose, onViewImage }) => {
    const aggregatedData = useMemo(() => {
        const relevantReports = reports.filter(r => r.title === reportTitle);
        const itemMap = new Map<string, AggregatedItem>();

        relevantReports.forEach(report => {
            report.items.forEach(item => {
                if (!itemMap.has(item.description)) {
                    itemMap.set(item.description, {
                        description: item.description,
                        runs: 0, passed: 0, failed: 0, inProgress: 0, notStarted: 0,
                        comments: [],
                    });
                }
                const aggItem = itemMap.get(item.description)!;
                aggItem.runs++;
                if (item.status === TestStatus.PASSED) aggItem.passed++;
                if (item.status === TestStatus.FAILED) aggItem.failed++;
                if (item.status === TestStatus.IN_PROGRESS) aggItem.inProgress++;
                if (item.status === TestStatus.NOT_STARTED) aggItem.notStarted++;

                if (item.comment || item.commentImage) {
                    aggItem.comments.push({
                        testerName: report.testerName || 'Unbekannt',
                        comment: item.comment,
                        commentImage: item.commentImage,
                    });
                }
            });
        });

        // Use the order from the first report as the canonical order
        const firstReport = relevantReports[0];
        if (!firstReport) return [];

        return firstReport.items.map(item => itemMap.get(item.description)!).filter(Boolean);

    }, [reportTitle, reports]);

    return (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Aggregierte Details für "{reportTitle}"</h2>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="divide-y divide-slate-700">
                        {aggregatedData.map((item, index) => (
                            <div key={item.description} className="py-4">
                               <div className="flex justify-between items-start">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-8 text-sm font-medium text-slate-400 text-right mr-4">{index + 1}.</div>
                                        <p className="flex-1 text-slate-200 font-medium">{item.description}</p>
                                    </div>
                                    <div className="text-sm text-slate-400 text-right flex-shrink-0 ml-4">
                                        <span className="text-green-400">B: {item.passed}</span> | 
                                        <span className="text-red-400"> F: {item.failed}</span> | 
                                        <span className="text-slate-400"> G: {item.runs}</span>
                                    </div>
                               </div>
                               {item.comments.length > 0 && (
                                   <div className="pl-12 mt-2 space-y-2">
                                       {item.comments.map((c, cIndex) => (
                                           <div key={cIndex} className="bg-slate-900/50 p-2 rounded-md border border-slate-700">
                                               <p className="text-xs font-semibold text-indigo-300">{c.testerName}</p>
                                               {c.comment && <p className="text-sm text-slate-300 italic">"{c.comment}"</p>}
                                               {c.commentImage && (
                                                   <img 
                                                     src={c.commentImage} 
                                                     alt="Kommentar Anhang" 
                                                     className="mt-1 max-w-xs max-h-32 rounded-md border border-slate-600 cursor-pointer hover:border-indigo-400 transition" 
                                                     onClick={() => onViewImage(c.commentImage!)}
                                                   />
                                               )}
                                           </div>
                                       ))}
                                   </div>
                               )}
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

export default AggregatedDetailModal;
