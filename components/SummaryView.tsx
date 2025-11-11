
import React, { useMemo } from 'react';
import { TestItem, TestStatus } from '../types';
import AnimatedNumber from './AnimatedNumber';

interface SummaryViewProps {
  items: TestItem[];
  onExport: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ items, onExport }) => {
  const summary = useMemo(() => {
    const total = items.length;
    if (total === 0) {
        return {
            total: 0, passed: 0, failed: 0, inProgress: 0, notStarted: 0, completion: 0,
            passedPercent: '0.0', failedPercent: '0.0', inProgressPercent: '0.0', notStartedPercent: '0.0'
        };
    }
    const passed = items.filter(item => item.status === TestStatus.PASSED).length;
    const failed = items.filter(item => item.status === TestStatus.FAILED).length;
    const inProgress = items.filter(item => item.status === TestStatus.IN_PROGRESS).length;
    const notStarted = items.filter(item => item.status === TestStatus.NOT_STARTED).length;
    const completion = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0;
    
    return { 
        total, passed, failed, inProgress, notStarted, completion,
        passedPercent: ((passed / total) * 100).toFixed(1),
        failedPercent: ((failed / total) * 100).toFixed(1),
        inProgressPercent: ((inProgress / total) * 100).toFixed(1),
        notStartedPercent: ((notStarted / total) * 100).toFixed(1),
    };
  }, [items]);

  return (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-white/10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
        <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-slate-200">Fortschritt</h3>
            <span className="font-bold text-white">{summary.completion}%</span>
        </div>
        <div className="flex items-center space-x-2">
            <button
              onClick={onExport}
              className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md shadow-sm hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Als JSON exportieren</span>
            </button>
        </div>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div 
          className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${summary.completion}%` }}
        ></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
        <div className="p-2 rounded-md" title={`${summary.passedPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-green-400"><AnimatedNumber value={summary.passed} /></div>
            <div className="text-sm text-slate-400">Bestanden</div>
        </div>
         <div className="p-2 rounded-md" title={`${summary.failedPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-red-400"><AnimatedNumber value={summary.failed} /></div>
            <div className="text-sm text-slate-400">Fehlgeschlagen</div>
        </div>
         <div className="p-2 rounded-md" title={`${summary.inProgressPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-blue-400"><AnimatedNumber value={summary.inProgress} /></div>
            <div className="text-sm text-slate-400">In Bearbeitung</div>
        </div>
         <div className="p-2 rounded-md" title={`${summary.notStartedPercent}% aller Testpunkte`}>
            <div className="text-2xl font-bold text-slate-400"><AnimatedNumber value={summary.notStarted} /></div>
            <div className="text-sm text-slate-400">Nicht begonnen</div>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;