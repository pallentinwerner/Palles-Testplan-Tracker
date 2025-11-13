

import React, { useMemo } from 'react';
import { TestItem, TestStatus } from '../types';
import AnimatedNumber from './AnimatedNumber';

interface SummaryViewProps {
  items: TestItem[];
  onExport: () => void;
  pathTitle: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ items, onExport, pathTitle }) => {
  const summary = useMemo(() => {
    const total = items.length;
    if (total === 0) {
        return {
            total: 0, passed: 0, failed: 0, inProgress: 0, notStarted: 0, completion: 0,
            passedPercent: '0.0', failedPercent: '0.0', inProgressPercent: '0.0', notStartedPercent: '0.0',
            passedWidthPercent: 0, failedWidthPercent: 0,
            isComplete: false, openTests: 0,
        };
    }
    const passed = items.filter(item => item.status === TestStatus.PASSED).length;
    const failed = items.filter(item => item.status === TestStatus.FAILED).length;
    const inProgress = items.filter(item => item.status === TestStatus.IN_PROGRESS).length;
    const notStarted = items.filter(item => item.status === TestStatus.NOT_STARTED).length;
    const completion = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0;
    const openTests = inProgress + notStarted;
    const isComplete = openTests === 0 && total > 0;
    
    return { 
        total, passed, failed, inProgress, notStarted, completion,
        passedPercent: ((passed / total) * 100).toFixed(1),
        failedPercent: ((failed / total) * 100).toFixed(1),
        inProgressPercent: ((inProgress / total) * 100).toFixed(1),
        notStartedPercent: ((notStarted / total) * 100).toFixed(1),
        passedWidthPercent: (passed / total) * 100,
        failedWidthPercent: (failed / total) * 100,
        isComplete,
        openTests
    };
  }, [items]);

  const handleExportClick = () => {
    if (summary.isComplete) {
      onExport();
    } else {
      const message = summary.total === 0
        ? 'Es gibt keine Testpunkte zum Exportieren.'
        : `${summary.openTests} Testpunkt(e) sind noch offen. Bitte schließen Sie alle Tests ab, bevor Sie exportieren.`;
      alert(message);
    }
  };
  

  return (
    <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
        <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-200">Fortschritt</h3>
            <span className="font-bold text-white">{summary.completion}%</span>
        </div>
        <div className="flex items-center space-x-2">
            <button
              onClick={handleExportClick}
              disabled={!summary.isComplete}
              title={!summary.isComplete ? `${summary.openTests} Test(s) noch offen` : `Testergebnis zu ${pathTitle} exportieren`}
              className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 a-3 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{`Testergebnis zu ${pathTitle} exportieren`}</span>
            </button>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 flex overflow-hidden" title={`Gesamtfortschritt: ${summary.completion}%`}>
        <div
          className="bg-green-400 h-full transition-all duration-500"
          style={{ width: `${summary.passedWidthPercent}%` }}
          title={`Bestanden: ${summary.passedPercent}%`}
        ></div>
        <div
          className="bg-red-400 h-full transition-all duration-500"
          style={{ width: `${summary.failedWidthPercent}%` }}
          title={`Fehlgeschlagen: ${summary.failedPercent}%`}
        ></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
        <div className="p-2 rounded-md" title={`${summary.passedPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-green-400"><AnimatedNumber value={summary.passed} /></div>
            <div className="text-sm text-gray-400">Bestanden</div>
        </div>
         <div className="p-2 rounded-md" title={`${summary.failedPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-red-400"><AnimatedNumber value={summary.failed} /></div>
            <div className="text-sm text-gray-400">Fehlgeschlagen</div>
        </div>
         <div className="p-2 rounded-md" title={`${summary.inProgressPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-blue-400"><AnimatedNumber value={summary.inProgress} /></div>
            <div className="text-sm text-gray-400">In Bearbeitung</div>
        </div>
         <div className="p-2 rounded-md" title={`${summary.notStartedPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-gray-400"><AnimatedNumber value={summary.notStarted} /></div>
            <div className="text-sm text-gray-400">Nicht begonnen</div>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;