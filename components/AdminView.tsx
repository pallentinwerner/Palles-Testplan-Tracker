
import React, { useState, useRef } from 'react';
import { TestPath, TestItem, isTestPathArray, TestStatus } from '../types';
import AdminItemsModal from './AdminItemsModal';

interface AdminViewProps {
    testPaths: TestPath[];
    onAddPath: (title: string) => void;
    onUpdatePath: (path: TestPath) => void;
    onDeletePath: (pathId: number) => void;
    onClose: () => void;
    onExportAll: () => void;
    onImportAndReplace: (paths: TestPath[]) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ testPaths, onAddPath, onUpdatePath, onDeletePath, onClose, onExportAll, onImportAndReplace }) => {
    const [newPathTitle, setNewPathTitle] = useState('');
    const [editingPath, setEditingPath] = useState<TestPath | null>(null);
    const [editingPathTitle, setEditingPathTitle] = useState<{ [key: number]: string }>({});
    const importFileRef = useRef<HTMLInputElement>(null);

    const handleAddPathSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPathTitle.trim()) {
            onAddPath(newPathTitle.trim());
            setNewPathTitle('');
        }
    };

    const handleTitleChange = (pathId: number, title: string) => {
        setEditingPathTitle(prev => ({ ...prev, [pathId]: title }));
    };

    const handleTitleBlur = (path: TestPath) => {
        const newTitle = editingPathTitle[path.id];
        if (newTitle !== undefined && newTitle.trim() && newTitle.trim() !== path.title) {
            onUpdatePath({ ...path, title: newTitle.trim() });
        }
        setEditingPathTitle(prev => {
            const newState = { ...prev };
            delete newState[path.id];
            return newState;
        });
    };

    const handleItemUpdate = (updatedItems: TestItem[]) => {
        if (editingPath) {
            onUpdatePath({ ...editingPath, items: updatedItems });
        }
    };
    
    const handleImportClick = () => {
        importFileRef.current?.click();
    };
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const parsed = JSON.parse(result);

                // --- START: Data Migration Logic ---
                const statusMap: { [key: string]: TestStatus } = {
                  'Not Started': TestStatus.NOT_STARTED,
                  'In Progress': TestStatus.IN_PROGRESS,
                  'Passed': TestStatus.PASSED,
                  'Failed': TestStatus.FAILED,
                };
    
                const migrateReport = (report: any): any => {
                  if (!report || !Array.isArray(report.items)) return report;
                  const migratedItems = report.items.map((item: any) => {
                    if (item && typeof item.status === 'string' && statusMap[item.status]) {
                      return { ...item, status: statusMap[item.status] };
                    }
                    return item;
                  });
                  return { ...report, items: migratedItems };
                };
    
                const migratedData = Array.isArray(parsed) ? parsed.map(migrateReport) : parsed;
                // --- END: Data Migration Logic ---

                if (isTestPathArray(migratedData)) {
                    if (window.confirm('Sind Sie sicher, dass Sie alle aktuellen Testpläne ersetzen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                        onImportAndReplace(migratedData);
                    }
                } else {
                    alert('Ungültiges Dateiformat. Bitte importieren Sie eine gültige JSON-Datei mit einem Testplan-Array.');
                }
            } catch (error) {
                alert(`Fehler beim Parsen der Datei: ${error}`);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };


    return (
        <main className="p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Administration</h2>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors">
                        Admin schließen
                    </button>
                </div>

                <div className="bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-white/10 p-6 md:p-8 space-y-8">
                    
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Datenverwaltung</h3>
                        <div className="flex items-center space-x-2">
                             <input 
                                type="file" 
                                ref={importFileRef}
                                onChange={handleFileImport}
                                accept=".json,application/json"
                                className="hidden"
                            />
                            <button onClick={handleImportClick} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors">
                                Importieren & Ersetzen
                            </button>
                            <button onClick={onExportAll} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition-colors">
                                Alle exportieren
                            </button>
                        </div>
                    </div>
                    
                    <hr className="border-slate-700" />

                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Neuen Testpfad hinzufügen</h3>
                        <form onSubmit={handleAddPathSubmit} className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={newPathTitle}
                                onChange={(e) => setNewPathTitle(e.target.value)}
                                placeholder="Titel für neuen Pfad eingeben..."
                                className="flex-grow p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-400 text-slate-200"
                            />
                            <button type="submit" className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50" disabled={!newPathTitle.trim()}>
                                Pfad hinzufügen
                            </button>
                        </form>
                    </div>

                    <hr className="my-8 border-slate-700" />

                    <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Bestehende Pfade verwalten</h3>
                        <div className="space-y-3">
                            {testPaths.map(path => (
                                <div key={path.id} className="bg-slate-900/50 p-4 rounded-lg flex items-center justify-between">
                                    <input
                                        type="text"
                                        value={editingPathTitle[path.id] ?? path.title}
                                        onChange={(e) => handleTitleChange(path.id, e.target.value)}
                                        onBlur={() => handleTitleBlur(path)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                        className="bg-transparent font-medium text-slate-200 focus:outline-none focus:bg-slate-700 rounded p-1 -m-1"
                                    />
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => setEditingPath(path)} className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-700 rounded-md hover:bg-slate-600">
                                            Punkte bearbeiten ({path.items.length})
                                        </button>
                                        <button onClick={() => onDeletePath(path.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h--3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                             {testPaths.length === 0 && <p className="text-slate-400 text-center py-4">Es wurden noch keine Testpfade erstellt.</p>}
                        </div>
                    </div>
                </div>
            </div>
            {editingPath && (
                <AdminItemsModal
                    path={editingPath}
                    onClose={() => setEditingPath(null)}
                    onSave={handleItemUpdate}
                />
            )}
        </main>
    );
};

export default AdminView;
