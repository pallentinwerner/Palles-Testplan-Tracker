
import React, { useState } from 'react';
import { TestPath, TestStatus } from '../types';
import StatusBadge from './StatusBadge';
import ImageComparisonModal from './ImageComparisonModal';

interface DiffViewModalProps {
    reports: TestPath[];
    onClose: () => void;
    onViewImage: (src: string) => void;
}

const areStringsSimilar = (a: string, b: string) => {
    return a.trim() === b.trim();
};

const DiffViewModal: React.FC<DiffViewModalProps> = ({ reports, onClose, onViewImage }) => {
    const [comparingImagesOfItem, setComparingImagesOfItem] = useState<{description: string, index: number} | null>(null);
    const maxItems = Math.max(0, ...reports.map(r => r.items.length));
    const itemRows = Array.from({ length: maxItems }, (_, i) => i);

    const getUniqueStatuses = (itemIndex: number): TestStatus[] => {
        const statuses = new Set<TestStatus>();
        reports.forEach(r => {
            if (r.items[itemIndex]) {
                statuses.add(r.items[itemIndex].status);
            }
        });
        return Array.from(statuses);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-7xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Detailvergleich: {reports[0]?.title}</h2>
                        <p className="text-sm text-gray-400">{reports.length} Berichte im Vergleich</p>
                    </div>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500">
                        Schließen
                    </button>
                </div>
                <div className="overflow-y-auto">
                    <style>{`
                        .diff-comment-content ul { list-style-type: disc; margin-left: 1.25rem; }
                        .diff-comment-content ol { list-style-type: decimal; margin-left: 1.25rem; }
                    `}</style>
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-gray-800/50 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-12 font-semibold text-gray-300">#</th>
                                <th className="p-4 w-2/5 font-semibold text-gray-300">Testpunkt-Beschreibung</th>
                                {reports.map((report, index) => (
                                    <th key={index} className="p-4 font-semibold text-gray-300 truncate" title={report.testerName}>
                                        {report.testerName || `Bericht ${index + 1}`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {itemRows.map(i => {
                                const referenceItem = reports.find(r => r.items[i])?.items[i];
                                const statuses = getUniqueStatuses(i);
                                const hasDifference = statuses.length > 1;

                                const descriptions = reports.map(r => r.items[i]?.description).filter(Boolean) as string[];
                                const descriptionMismatch = descriptions.length > 0 && descriptions.some(d => !areStringsSimilar(d, descriptions[0]));

                                const hasImages = reports.some(r => r.items[i]?.commentImages && r.items[i].commentImages!.length > 0);

                                return (
                                    <tr key={i} className={`transition-colors hover:bg-gray-700/50 ${hasDifference ? 'bg-yellow-500/10' : ''}`}>
                                        <td className="p-4 align-top text-gray-400">{i + 1}.</td>
                                        <td className={`p-4 align-top ${descriptionMismatch ? 'text-red-400' : 'text-gray-200'}`}>
                                            <p className="font-semibold">{referenceItem?.description || 'N/A'}</p>
                                            {referenceItem?.details && <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{referenceItem.details}</p>}
                                            {descriptionMismatch && <div className="text-xs text-red-500 mt-1 font-semibold">Beschreibung weicht in anderen Berichten ab!</div>}
                                            {hasImages && (
                                                <button 
                                                    onClick={() => setComparingImagesOfItem({description: referenceItem!.description, index: i})}
                                                    className="mt-3 flex items-center gap-2 text-xs px-2 py-1 rounded-md bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                                    </svg>
                                                    Bilder vergleichen
                                                </button>
                                            )}
                                        </td>
                                        {reports.map((report, reportIndex) => {
                                            const item = report.items[i];
                                            return (
                                                <td key={reportIndex} className={`p-4 align-top border-l border-gray-700`}>
                                                    {item ? (
                                                        <div className="flex flex-col gap-3">
                                                            <StatusBadge status={item.status} />
                                                            {item.comment && (
                                                                <blockquote className="diff-comment-content text-sm text-cyan-300/90 p-2 border-l-4 border-cyan-500/50 bg-gray-900/50 rounded-r-md">
                                                                    <div dangerouslySetInnerHTML={{ __html: item.comment }} />
                                                                </blockquote>
                                                            )}
                                                             {item.details && (
                                                                <div className="text-xs text-gray-400 whitespace-pre-wrap border-l-4 border-gray-600 pl-2">{item.details}</div>
                                                            )}
                                                            {item.commentImages && item.commentImages.length > 0 && (
                                                                <div className="mt-1 flex flex-wrap gap-2">
                                                                    {item.commentImages.map((imgSrc, imgIndex) => (
                                                                        <img 
                                                                            key={imgIndex}
                                                                            src={imgSrc} 
                                                                            alt={`Kommentar Anhang ${imgIndex + 1}`}
                                                                            className="max-w-full max-h-32 rounded-md border border-gray-600 cursor-pointer hover:border-blue-500 transition" 
                                                                            onClick={() => onViewImage(imgSrc)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {comparingImagesOfItem !== null && (
                    <ImageComparisonModal
                        itemDescription={comparingImagesOfItem.description}
                        reports={reports}
                        itemIndex={comparingImagesOfItem.index}
                        onClose={() => setComparingImagesOfItem(null)}
                        onViewImage={onViewImage}
                    />
                )}
            </div>
        </div>
    );
};

export default DiffViewModal;