import React, { useMemo } from 'react';
import { TestItem, TestStatus } from '../types';

interface AggregatedReportCardProps {
  title: string;
  testerCount: number;
  items: TestItem[];
  onViewDetails: () => void;
}

const AggregatedReportCard: React.FC<AggregatedReportCardProps> = ({ title, testerCount, items, onViewDetails }) => {
    const summary = useMemo(() => {
        const total = items.length;
        if (total === 0) return { passed: 0, failed: 0, total: 0, passedPercent: 0, failedPercent: 0 };
        const passed = items.filter(item => item.status === TestStatus.PASSED).length;
        const failed = items.filter(item => item.status === TestStatus.FAILED).length;
        const passedPercent = (passed / total) * 100;
        const failedPercent = (failed / total) * 100;
        return { passed, failed, total, passedPercent, failedPercent };
    }, [items]);

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-blue-600/30 p-4 ring-2 ring-blue-600/20 shadow-lg transition-all duration-300 hover:shadow-blue-500/20 hover:border-blue-600/60 hover:-translate-y-1 flex flex-col justify-between">
            <div>
                <h3 className="font-semibold text-blue-400 truncate">{title}</h3>
                <p className="text-sm text-gray-400 mb-3">{testerCount} {testerCount > 1 ? 'Tester' : 'Tester'}</p>
                
                {/* Visual Status Bar */}
                <div className="w-full bg-gray-600 rounded-full h-2.5 my-3 flex overflow-hidden">
                    <div className="bg-green-500 h-2.5 transition-all duration-500 ease-in-out" style={{ width: `${summary.passedPercent}%` }} title={`Bestanden: ${summary.passed}`}></div>
                    <div className="bg-red-500 h-2.5 transition-all duration-500 ease-in-out" style={{ width: `${summary.failedPercent}%` }} title={`Fehlgeschlagen: ${summary.failed}`}></div>
                </div>

                {/* Text Stats */}
                <div className="flex justify-between text-sm mt-2">
                    <span className="text-green-400">Bestanden: {summary.passed}</span>
                    <span className="text-red-400">Fehlgeschlagen: {summary.failed}</span>
                    <span className="text-gray-300">Gesamt: {summary.total}</span>
                </div>
            </div>

            {/* Details Button */}
            <button onClick={onViewDetails} className="mt-4 w-full text-center px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 transition-colors">
                Details ansehen
            </button>
        </div>
    );
};

export default AggregatedReportCard;