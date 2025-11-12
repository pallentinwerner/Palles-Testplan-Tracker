
import React from 'react';
import { TestPath, TestStatus } from '../types';
import StatusBadge from './StatusBadge';

interface DiffViewModalProps {
    reports: TestPath[];
    onClose: () => void;
    onViewImage: (src: string) => void;
}

const areStringsSimilar = (a: string, b: string) => {
    return a.trim() === b.trim();
};

const DiffViewModal: React.FC<DiffViewModalProps> = ({ reports, onClose, onViewImage }) => {
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

                                return (
                                    <tr key={i} className={`transition-colors hover:bg-gray-700/50 ${hasDifference ? 'bg-yellow-500/10' : ''}`}>
                                        <td className="p-4 align-top text-gray-400">{i + 1}.</td>
                                        <td className={`p-4 align-top ${descriptionMismatch ? 'text-red-400' : 'text-gray-200'}`}>
                                            {referenceItem?.description || 'N/A'}
                                            {descriptionMismatch && <div className="text-xs text-red-500 mt-1 font-semibold">Beschreibung weicht in anderen Berichten ab!</div>}
                                        </td>
                                        {reports.map((report, reportIndex) => {
                                            const item = report.items[i];
                                            return (
                                                <td key={reportIndex} className={`p-4 align-top border-l border-gray-700`}>
                                                    {item ? (
                                                        <div className="flex flex-col gap-3">
                                                            <StatusBadge status={item.status} />
                                                            {item.comment && (
                                                                <blockquote className="text-sm text-cyan-300/90 p-2 border-l-4 border-cyan-500/50 italic bg-gray-900/50 rounded-r-md">
                                                                    {item.comment}
                                                                </blockquote>
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
            </div>
        </div>
    );
};

export default DiffViewModal;