

import React, { useMemo, useState } from 'react';
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
        commentImages?: string[];
    }[];
}

const AggregatedDetailModal: React.FC<AggregatedDetailModalProps> = ({ reportTitle, reports, onClose, onViewImage }) => {
    const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);

    const handleCopyComment = (commentHtml: string, uniqueId: string) => {
        if (!commentHtml) return;
        const tempEl = document.createElement('div');
        tempEl.innerHTML = commentHtml;
        const textToCopy = tempEl.textContent || tempEl.innerText || '';

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedCommentId(uniqueId);
            setTimeout(() => setCopiedCommentId(null), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Kopieren fehlgeschlagen!');
        });
    };
    
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

                if (item.comment || (item.commentImages && item.commentImages.length > 0)) {
                    aggItem.comments.push({
                        testerName: report.testerName || 'Unbekannt',
                        comment: item.comment,
                        commentImages: item.commentImages,
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
         <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Aggregierte Details für "{reportTitle}"</h2>
                </div>
                <div className="p-6 overflow-y-auto">
                    <style>{`
                        .agg-comment-content ul { list-style-type: disc; margin-left: 1.5rem; }
                        .agg-comment-content ol { list-style-type: decimal; margin-left: 1.5rem; }
                    `}</style>
                    <div className="divide-y divide-gray-700">
                        {aggregatedData.map((item, index) => (
                            <div key={item.description} className="py-4">
                               <div className="flex justify-between items-start">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-8 text-sm font-medium text-gray-400 text-right mr-4">{index + 1}.</div>
                                        <p className="flex-1 text-gray-200 font-medium">{item.description}</p>
                                    </div>
                                    <div className="text-sm text-gray-400 text-right flex-shrink-0 ml-4">
                                        <span className="text-green-400">B: {item.passed}</span> | 
                                        <span className="text-red-400"> F: {item.failed}</span> | 
                                        <span className="text-gray-400"> G: {item.runs}</span>
                                    </div>
                               </div>
                               {item.comments.length > 0 && (
                                   <div className="pl-12 mt-2 space-y-2">
                                       {item.comments.map((c, cIndex) => (
                                           <div key={cIndex} className="bg-gray-900/50 p-2 rounded-md border border-gray-700">
                                               <p className="text-xs font-semibold text-blue-400">{c.testerName}</p>
                                                {c.comment && (
                                                    <div className="group relative mt-1">
                                                        <div className="agg-comment-content text-sm text-gray-300 pr-8" dangerouslySetInnerHTML={{ __html: c.comment }} />
                                                        <button
                                                            onClick={() => handleCopyComment(c.comment as string, `${item.description}-${cIndex}`)}
                                                            title="Kommentar kopieren"
                                                            className="absolute -top-1 right-0 p-1 text-gray-400 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-gray-700"
                                                        >
                                                            {copiedCommentId === `${item.description}-${cIndex}` ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                               {c.commentImages && c.commentImages.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {c.commentImages.map((imgSrc, imgIndex) => (
                                                            <img 
                                                              key={imgIndex}
                                                              src={imgSrc} 
                                                              alt={`Kommentar Anhang ${imgIndex + 1}`}
                                                              className="max-w-xs max-h-32 rounded-md border border-gray-600 cursor-pointer hover:border-blue-500 transition" 
                                                              onClick={() => onViewImage(imgSrc)}
                                                            />
                                                        ))}
                                                    </div>
                                               )}
                                           </div>
                                       ))}
                                   </div>
                               )}
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

export default AggregatedDetailModal;
