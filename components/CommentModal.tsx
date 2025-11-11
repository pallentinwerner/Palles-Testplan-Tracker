
import React, { useState, useEffect, useRef } from 'react';
import { TestItem } from '../types';

interface CommentModalProps {
  item: TestItem;
  onClose: () => void;
  onSave: (itemId: number, comment: string, commentImage: string | null) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({ item, onClose, onSave }) => {
  const [comment, setComment] = useState(item.comment || '');
  const [image, setImage] = useState<string | null>(item.commentImage || null);
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSave = () => {
    onSave(item.id, comment, image);
  };
  
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
    }
  };

  const handleImageUploadClick = () => {
      fileInputRef.current?.click();
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
      event.target.value = '';
  }

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        aria-modal="true"
        role="dialog"
    >
      <div ref={modalRef} className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white">
            Kommentar hinzufügen/bearbeiten
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Für Testpunkt: <span className="font-medium text-slate-200">"{item.description}"</span>
          </p>
        </div>
        <div className="px-6 pb-6 space-y-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Geben Sie hier Ihre Kommentare ein..."
            className="w-full h-32 p-3 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-shadow text-slate-200 placeholder-slate-500"
            aria-label="Kommentar eingeben"
          />
          <div>
            <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
            />
            {image ? (
                <div className="relative group">
                    <img src={image} alt="Comment preview" className="max-h-48 w-auto rounded-lg border border-slate-600" />
                    <button 
                        onClick={() => setImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Bild entfernen"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            ) : (
                <button 
                    onClick={handleImageUploadClick}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md shadow-sm hover:bg-slate-600"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                   <span>Bild hochladen</span>
                </button>
            )}
          </div>
        </div>
        <div className="bg-slate-800/50 border-t border-slate-700 px-6 py-4 flex justify-end items-center space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-transparent border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
          >
            Kommentar speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
