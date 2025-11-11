
import React, { useState, useEffect, useRef } from 'react';
import { TestPath, TestItem, TestStatus } from '../types';

interface AdminItemsModalProps {
  path: TestPath;
  onClose: () => void;
  onSave: (items: TestItem[]) => void;
}

const AdminItemsModal: React.FC<AdminItemsModalProps> = ({ path, onClose, onSave }) => {
  const [items, setItems] = useState<TestItem[]>(path.items);
  const [newItemDesc, setNewItemDesc] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // State for drag and drop
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
    }
  };

  const handleUpdateItemDesc = (itemId: number, description: string) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, description } : item));
  };

  const handleAddItem = () => {
    if (newItemDesc.trim()) {
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 0;
        const newItem: TestItem = {
            id: newId,
            description: newItemDesc.trim(),
            status: TestStatus.NOT_STARTED,
        };
        setItems(prev => [...prev, newItem]);
        setNewItemDesc('');
    }
  };

  const handleDeleteItem = (itemId: number) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  const handleSave = () => {
    onSave(items);
    onClose();
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: number) => {
    e.preventDefault();
    if (draggedItemId !== null && id !== dragOverItemId) {
      setDragOverItemId(id);
    }
  };
  
  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropId: number) => {
    e.preventDefault();
    if (draggedItemId === null || draggedItemId === dropId) {
        setDraggedItemId(null);
        setDragOverItemId(null);
        return;
    }

    const draggedItemIndex = items.findIndex(item => item.id === draggedItemId);
    const dropTargetIndex = items.findIndex(item => item.id === dropId);
    
    if (draggedItemIndex === -1 || dropTargetIndex === -1) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(dropTargetIndex, 0, draggedItem);
    
    setItems(newItems);
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Punkte für "{path.title}" bearbeiten</h2>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-1" onDragLeave={handleDragLeave}>
            {items.map(item => {
                const isDragging = draggedItemId === item.id;
                const isDragOver = dragOverItemId === item.id;
                
                return (
                    <div 
                        key={item.id} 
                        className={`
                            p-1 flex items-center space-x-2 rounded-lg transition-all duration-200 relative
                            ${isDragging ? 'opacity-30 bg-slate-700' : 'bg-transparent'}
                        `}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd}
                    >
                        {isDragOver && <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-full" />}
                        <div className="p-2 cursor-move text-slate-500 hover:text-slate-200" title="Ziehen zum Neuanordnen">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItemDesc(item.id, e.target.value)}
                            className="flex-grow p-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-400 text-slate-200"
                        />
                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )
            })}
            {items.length === 0 && <p className="text-slate-400 text-center py-4">Dieser Testpfad hat keine Punkte.</p>}
             <div className="flex items-center space-x-2 pt-4">
                <input
                    type="text"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="Beschreibung für neuen Punkt..."
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                    className="flex-grow p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-400 text-slate-200"
                />
                <button onClick={handleAddItem} className="px-4 py-2 font-medium text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-500" disabled={!newItemDesc.trim()}>
                    Punkt hinzufügen
                </button>
            </div>
        </div>

        <div className="bg-slate-800/50 border-t border-slate-700 px-6 py-4 flex justify-end items-center space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-transparent border border-slate-600 rounded-md hover:bg-slate-700"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-500"
          >
            Änderungen speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminItemsModal;
