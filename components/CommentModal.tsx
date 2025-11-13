

import React, { useState, useEffect, useRef } from 'react';
import { TestItem } from '../types';

interface CommentModalProps {
  item: TestItem;
  onClose: () => void;
  onSave: (itemId: number, comment: string, commentImages: string[]) => void;
  isFailureCommentRequired?: boolean;
}

const EditorToolbar: React.FC<{ onFormat: (cmd: string, val?: string) => void }> = ({ onFormat }) => {
    const buttons = [
        { cmd: 'bold', icon: 'B', title: 'Fett' },
        { cmd: 'italic', icon: 'I', title: 'Kursiv' },
        { cmd: 'underline', icon: 'U', title: 'Unterstrichen' },
        { cmd: 'strikeThrough', icon: 'S', title: 'Durchgestrichen' },
        { cmd: 'insertUnorderedList', icon: 'UL', title: 'Ungeordnete Liste' },
        { cmd: 'insertOrderedList', icon: 'OL', title: 'Geordnete Liste' },
    ];

    return (
        <div className="flex items-center space-x-1 bg-gray-900 border border-gray-600 rounded-t-md p-2">
            {buttons.map(({ cmd, icon, title }) => (
                <button
                    key={cmd}
                    onClick={() => onFormat(cmd)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent editor from losing focus
                    title={title}
                    className="w-8 h-8 flex items-center justify-center rounded text-gray-300 hover:bg-gray-700 transition-colors"
                >
                    <span className={`font-serif ${cmd === 'bold' ? 'font-bold' : ''} ${cmd === 'italic' ? 'italic' : ''} ${cmd === 'underline' ? 'underline' : ''} ${cmd === 'strikeThrough' ? 'line-through' : ''}`}>{icon}</span>
                </button>
            ))}
        </div>
    );
};


const CommentModal: React.FC<CommentModalProps> = ({ item, onClose, onSave, isFailureCommentRequired = false }) => {
  const [comment, setComment] = useState(item.comment || '');
  const [images, setImages] = useState<string[]>(item.commentImages || []);
  const modalRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
        // Set the content
        editor.innerHTML = item.comment || '';
        
        // Focus the editor
        editor.focus();

        // Move cursor to the end of the content
        if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false); // Collapse range to the end
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isFailureCommentRequired) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isFailureCommentRequired, item.comment]);

  const hasTextContent = (htmlString: string) => {
    if (!htmlString) return false;
    const tempEl = document.createElement('div');
    tempEl.innerHTML = htmlString;
    return tempEl.textContent?.trim() !== '';
  };
  
  const handleSave = () => {
    if (isFailureCommentRequired && !hasTextContent(comment)) return;
    onSave(item.id, comment, images);
  };
  
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node) && !isFailureCommentRequired) {
        onClose();
    }
  };

  const handleImageUploadClick = () => {
      fileInputRef.current?.click();
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
        const filePromises = Array.from(files).map((file: File) => {
            return new Promise<string>((resolve, reject) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error("File is not an image."));
                }
            });
        });

        Promise.all(filePromises)
            .then(newImages => {
                setImages(prevImages => [...prevImages, ...newImages]);
            })
            .catch(error => console.error("Error reading files:", error));
    }
    event.target.value = '';
  }
  
  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  }
  
  const handleFormat = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
        setComment(editorRef.current.innerHTML);
    }
  };
  
  const isSaveDisabled = isFailureCommentRequired && !hasTextContent(comment);


  return (
    <div 
        className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        aria-modal="true"
        role="dialog"
    >
      <div ref={modalRef} className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white">
            {isFailureCommentRequired ? 'Kommentar für fehlgeschlagenen Test erforderlich' : 'Kommentar hinzufügen/bearbeiten'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Für Testpunkt: <span className="font-medium text-gray-200">"{item.description}"</span>
          </p>
        </div>
        <div className="px-6 pb-6 space-y-4">
            <div>
                <EditorToolbar onFormat={handleFormat} />
                {/* FIX: Replaced invalid 'placeholder' attribute with a CSS-based placeholder for contentEditable div. */}
                <div
                    ref={editorRef}
                    onInput={(e) => setComment(e.currentTarget.innerHTML)}
                    data-placeholder={isFailureCommentRequired ? "Bitte beschreiben Sie den Grund für den Fehlschlag..." : "Geben Sie hier Ihre Kommentare ein..."}
                    className="w-full min-h-[200px] p-3 bg-gray-900 border border-t-0 border-gray-600 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-gray-200 relative empty:before:content-[attr(data-placeholder)] empty:before:absolute empty:before:left-3 empty:before:top-3 empty:before:text-gray-500 empty:before:pointer-events-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    aria-label="Kommentar eingeben"
                />
            </div>
          <div>
            <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
                multiple
            />
            {images.length > 0 && (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {images.map((imageSrc, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={imageSrc} alt={`Vorschau ${index + 1}`} className="w-full h-full object-cover rounded-lg border border-gray-600" />
                            <button 
                                onClick={() => handleRemoveImage(index)}
                                className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Bild entfernen"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <button 
                onClick={handleImageUploadClick}
                className="mt-4 inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md shadow-sm hover:bg-gray-600"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               <span>{images.length > 0 ? 'Weitere Bilder' : 'Bilder'} hochladen</span>
            </button>
          </div>
        </div>
        <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4 flex justify-end items-center space-x-3">
          <button
            onClick={onClose}
            disabled={isFailureCommentRequired}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-transparent rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kommentar speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;