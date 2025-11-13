
import React, { useRef } from 'react';
import { TestPath } from '../types';

interface HeaderProps {
    onToggleAdmin: () => void;
    isAdminMode: boolean;
    onImportForComparison: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onInitiateImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isImportDisabled: boolean;
    // --- New props for comparison mode ---
    isComparisonMode: boolean;
    onCloseComparison: () => void;
    isExporting: boolean;
    showExportDropdown: boolean;
    setShowExportDropdown: (show: boolean) => void;
    onExportPDF: () => void;
    onExportHTML: () => void;
    onExportXLSX: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onToggleAdmin, 
    isAdminMode, 
    onImportForComparison,
    onInitiateImport,
    isImportDisabled,
    isComparisonMode,
    onCloseComparison,
    isExporting,
    showExportDropdown,
    setShowExportDropdown,
    onExportPDF,
    onExportHTML,
    onExportXLSX
}) => {
  const comparisonImportRef = useRef<HTMLInputElement>(null);
  const mainImportRef = useRef<HTMLInputElement>(null);

  const handleComparisonClick = () => {
    comparisonImportRef.current?.click();
  };
  
  const handleMainImportClick = () => {
    mainImportRef.current?.click();
  };

  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700 shadow-lg sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h1 className="text-2xl font-bold text-white tracking-wider">
                    Testplan-Tracker
                </h1>
            </div>
            <div className="flex items-center space-x-2">
                 {isComparisonMode ? (
                    <>
                         <div className="relative">
                            <button 
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                disabled={isExporting}
                                className="inline-flex items-center justify-center w-36 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                                {isExporting ? 'Exportiere...' : 'Exportieren'}
                                <svg className={`w-4 h-4 ml-2 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {showExportDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20">
                                    <button onClick={onExportPDF} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Als PDF exportieren</button>
                                    <button onClick={onExportHTML} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Als HTML exportieren</button>
                                    <button onClick={onExportXLSX} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Nach Excel exportieren</button>
                                </div>
                            )}
                         </div>
                        <button onClick={onCloseComparison} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 transition-colors">
                            Schließen
                        </button>
                    </>
                 ) : (
                    <>
                        <input 
                            type="file" 
                            ref={mainImportRef}
                            onChange={onInitiateImport}
                            accept=".json,application/json"
                            className="hidden"
                        />
                         <button
                            onClick={handleMainImportClick}
                            disabled={isImportDisabled}
                            title="Testplan importieren"
                            className="p-2 rounded-full transition-colors duration-200 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </button>
                        <input 
                            type="file" 
                            ref={comparisonImportRef}
                            onChange={onImportForComparison}
                            multiple
                            accept=".json,application/json"
                            className="hidden"
                        />
                        <button
                            onClick={handleComparisonClick}
                            title="Berichte vergleichen"
                            className="p-2 rounded-full transition-colors duration-200 text-gray-400 hover:bg-gray-700 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </button>
                    </>
                 )}
                
                <button
                    onClick={onToggleAdmin}
                    title="Admin-Modus umschalten"
                    className={`p-2 rounded-full transition-colors duration-200 ${
                        isAdminMode 
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;