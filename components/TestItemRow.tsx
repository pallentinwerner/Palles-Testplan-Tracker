
import React from 'react';
import { TestItem, TestStatus } from '../types';
import StatusBadge from './StatusBadge';

interface TestItemRowProps {
  item: TestItem;
  itemNumber: number;
  onStatusChange: (itemId: number, newStatus: TestStatus) => void;
  onOpenCommentModal: (itemId: number) => void;
}

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode, className: string, title: string }> = ({ onClick, children, className, title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${className}`}
    >
        {children}
    </button>
);


const TestItemRow: React.FC<TestItemRowProps> = ({ item, itemNumber, onStatusChange, onOpenCommentModal }) => {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-gray-800 transition-colors">
        <div className="flex items-start mb-4 sm:mb-0">
            <div className="flex-shrink-0 w-8 text-sm font-medium text-gray-400 text-right mr-4">{itemNumber}.</div>
            <p className="flex-1 text-gray-200">{item.description}</p>
        </div>
        <div className="flex items-center justify-end sm:justify-start space-x-2 pl-12 sm:pl-4">
            <StatusBadge status={item.status} />
            <div className="flex items-center space-x-1.5">
                <ActionButton
                    onClick={() => onOpenCommentModal(item.id)}
                    title="Kommentar"
                    className="text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 relative"
                >
                    {item.comment ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    )}
                    {item.commentImages && item.commentImages.length > 0 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 absolute -top-1 -right-1 text-white bg-blue-600 rounded-full p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                    )}
                </ActionButton>
                <ActionButton 
                    onClick={() => onStatusChange(item.id, TestStatus.PASSED)}
                    title="Bestanden"
                    className="text-green-400 bg-green-500/10 hover:bg-green-500/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </ActionButton>
                <ActionButton 
                    onClick={() => onStatusChange(item.id, TestStatus.FAILED)}
                    title="Fehlgeschlagen"
                    className="text-red-400 bg-red-500/10 hover:bg-red-500/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </ActionButton>
                <ActionButton 
                    onClick={() => onStatusChange(item.id, TestStatus.IN_PROGRESS)}
                    title="In Bearbeitung"
                    className="text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                </ActionButton>
                 <ActionButton 
                    onClick={() => onStatusChange(item.id, TestStatus.NOT_STARTED)}
                    title="Zurücksetzen"
                    className="text-gray-400 bg-gray-500/10 hover:bg-gray-500/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                </ActionButton>
            </div>
        </div>
    </div>
  );
};

export default TestItemRow;