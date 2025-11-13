

import React, { useState } from 'react';
import { TestPath, TestItem } from '../types';
import AdminItemsModal from './AdminItemsModal';

interface AdminViewProps {
    testPaths: TestPath[];
    onAddPath: (title: string) => void;
    onUpdatePath: (path: TestPath) => void;
    onDeletePath: (pathId: number) => void;
    onExportAll: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ testPaths, onAddPath, onUpdatePath, onDeletePath, onExportAll }) => {
    const [newPathTitle, setNewPathTitle] = useState('');
    const [editingPath, setEditingPath] = useState<TestPath | null>(null);
    const [editingPathTitle, setEditingPathTitle] = useState<{ [key: number]: string }>({});

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
    

    return (
        <main className="p-4 sm:p-6 md:p-8">
            <div className="bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-gray-800 p-6 md:p-8 space-y-8">
                
                <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Neuen Testpfad hinzufügen</h3>
                    <form onSubmit={handleAddPathSubmit} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={newPathTitle}
                            onChange={(e) => setNewPathTitle(e.target.value)}
                            placeholder="Titel für neuen Pfad eingeben..."
                            className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-200"
                        />
                        <button type="submit" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!newPathTitle.trim()}>
                            Pfad hinzufügen
                        </button>
                    </form>
                </div>

                <hr className="my-8 border-gray-700" />

                <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Bestehende Pfade verwalten</h3>
                    <div className="space-y-3">
                        {testPaths.map(path => (
                            <div key={path.id} className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between">
                                <input
                                    type="text"
                                    value={editingPathTitle[path.id] ?? path.title}
                                    onChange={(e) => handleTitleChange(path.id, e.target.value)}
                                    onBlur={() => handleTitleBlur(path)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                    className="bg-transparent font-medium text-gray-200 focus:outline-none focus:bg-gray-700 rounded p-1 -m-1"
                                />
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setEditingPath(path)} className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600">
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
                         {testPaths.length === 0 && <p className="text-gray-400 text-center py-4">Es wurden noch keine Testpfade erstellt.</p>}
                    </div>
                     <div className="mt-8 flex justify-end">
                        <button
                            onClick={onExportAll}
                            title="Alle Testpläne als einzelne JSON-Datei sichern"
                            className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                            <span>Gesamten Testplan exportieren</span>
                        </button>
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