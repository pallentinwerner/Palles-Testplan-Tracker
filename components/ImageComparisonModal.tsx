import React from 'react';
import { TestPath } from '../types';

interface ImageComparisonModalProps {
    itemDescription: string;
    reports: TestPath[];
    itemIndex: number;
    onClose: () => void;
    onViewImage: (src: string) => void;
}

const ImageComparisonModal: React.FC<ImageComparisonModalProps> = ({ itemDescription, reports, itemIndex, onClose, onViewImage }) => {
    // Filter to only get reports that have images for the specific item
    const reportsWithImages = reports.filter(report => 
        report.items[itemIndex]?.commentImages && report.items[itemIndex].commentImages!.length > 0
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Bildvergleich für Testpunkt</h2>
                    <p className="text-sm text-gray-400 truncate">"{itemDescription}"</p>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {reportsWithImages.map((report, index) => (
                            <div key={index} className="flex flex-col gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                <h3 className="text-base font-semibold text-blue-400 border-b border-gray-600 pb-2 truncate" title={report.testerName || ''}>
                                    {report.testerName || `Bericht ${index + 1}`}
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {report.items[itemIndex].commentImages?.map((imgSrc, imgIndex) => (
                                        <img
                                            key={imgIndex}
                                            src={imgSrc}
                                            alt={`Anhang von ${report.testerName}`}
                                            className="w-full h-auto object-contain rounded-md border border-gray-600 cursor-pointer hover:border-blue-500 hover:scale-105 transition-all"
                                            onClick={() => onViewImage(imgSrc)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4 flex justify-end items-center flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-500"
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageComparisonModal;
