
import React, { useState, useMemo, useCallback } from 'react';
import { TEST_PATHS } from './constants';
import { TestStatus, TestPath, TestItem, isTestPath, isTestPathArray, migrateImportedData } from './types';
import Header from './components/Header';
import TestPathSelector from './components/TestPathSelector';
import SummaryView from './components/SummaryView';
import TestPlanView from './components/TestPlanView';
import CommentModal from './components/CommentModal';
import TesterNameModal from './components/TesterNameModal';
import AdminView from './components/AdminView';
import ComparisonView from './components/ComparisonView';
import AssignTesterNameModal from './components/AssignTesterNameModal';

// Make TypeScript aware of the globals from CDNs
declare var Chart: any;
declare var XLSX: any;

// Fix: Correctly type the jsPDF library attached to the window object.
declare global {
    interface Window {
        jspdf: any;
    }
}


interface PendingAssignment {
  report: TestPath;
  filename: string;
  context: 'main' | 'comparison';
}

const App: React.FC = () => {
  const [testPaths, setTestPaths] = useState<TestPath[]>(TEST_PATHS);
  const [activePathIndex, setActivePathIndex] = useState<number>(0);
  const [editingCommentItem, setEditingCommentItem] = useState<TestItem | null>(null);
  const [testerName, setTesterName] = useState<string>('');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [comparisonReports, setComparisonReports] = useState<TestPath[]>([]);
  const [pendingNameAssignment, setPendingNameAssignment] = useState<PendingAssignment[]>([]);
  
  // --- State lifted from ComparisonView ---
  const [selectedForDiff, setSelectedForDiff] = useState<TestPath[]>([]);
  const [isDiffing, setIsDiffing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);


  const activePath = useMemo(() => testPaths[activePathIndex], [testPaths, activePathIndex]);

  const handleStatusChange = useCallback((itemId: number, newStatus: TestStatus) => {
    setTestPaths(prevPaths => {
      const newPaths = [...prevPaths];
      const path_to_update = { ...newPaths[activePathIndex] };
      path_to_update.items = path_to_update.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, status: newStatus };
          // If the status is reset to 'Not Started', also clear the comment and image.
          if (newStatus === TestStatus.NOT_STARTED) {
            updatedItem.comment = undefined;
            updatedItem.commentImages = undefined;
          }
          return updatedItem;
        }
        return item;
      });
      newPaths[activePathIndex] = path_to_update;
      return newPaths;
    });
  }, [activePathIndex]);

  const handleOpenCommentModal = useCallback((itemId: number) => {
    const item = activePath.items.find(i => i.id === itemId);
    if (item) {
      setEditingCommentItem(item);
    }
  }, [activePath]);

  const handleCloseCommentModal = useCallback(() => {
    setEditingCommentItem(null);
  }, []);

  const handleSaveComment = useCallback((itemId: number, comment: string, commentImages: string[]) => {
    setTestPaths(prevPaths => {
      const newPaths = [...prevPaths];
      const path_to_update = { ...newPaths[activePathIndex] };
      path_to_update.items = path_to_update.items.map(item =>
        item.id === itemId ? { ...item, comment, commentImages } : item
      );
      newPaths[activePathIndex] = path_to_update;
      return newPaths;
    });
    setEditingCommentItem(null);
  }, [activePathIndex]);
  
  const handleExportToJSON = useCallback(() => {
    if (!activePath || !testerName) return;

    const exportData: TestPath = {
        ...activePath,
        testerName: testerName,
        exportTimestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const safeTitle = activePath.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const safeTesterName = testerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `test-plan-${safeTitle}-tester-${safeTesterName}.json`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [activePath, testerName]);

  const processImportedFiles = useCallback((files: FileList, context: 'main' | 'comparison') => {
    if (!files || files.length === 0) return;

    const promises = Array.from(files).map(file => {
      return new Promise<{ reports: TestPath[], file: File }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = e.target?.result as string;
            const parsed = JSON.parse(result);
            
            // Use centralized migration logic
            const migratedData = migrateImportedData(parsed);

            const extractTesterName = (filename: string): string | undefined => {
                const match = filename.match(/-tester-(.*?)(?:\.json|$)/i);
                if (match && match[1]) {
                    const name = match[1].replace(/-/g, ' ');
                    return name.charAt(0).toUpperCase() + name.slice(1);
                }
                return undefined;
            };

            const testerNameFromFile = extractTesterName(file.name);

            const enrichReport = (report: TestPath): TestPath => {
                if (!report.testerName && testerNameFromFile) {
                    return { ...report, testerName: testerNameFromFile };
                }
                return report;
            };

            if (isTestPath(migratedData)) {
              resolve({ reports: [enrichReport(migratedData)], file });
            } else if (isTestPathArray(migratedData)) {
              resolve({ reports: migratedData.map(enrichReport), file });
            } else {
              reject(new Error(`Datei ${file.name} ist kein gültiger Testplan.`));
            }
          } catch (error) {
            reject(new Error(`Fehler beim Parsen von ${file.name}: ${error}`));
          }
        };
        reader.onerror = () => reject(new Error(`Konnte Datei ${file.name} nicht lesen`));
        reader.readAsText(file);
      });
    });

    Promise.all(promises)
      .then(results => {
        const completeReports: TestPath[] = [];
        const reportsNeedingName: PendingAssignment[] = [];

        results.forEach(({ reports, file }) => {
            reports.forEach(report => {
                if(report.testerName) {
                    completeReports.push(report);
                } else {
                    reportsNeedingName.push({ report, filename: file.name, context });
                }
            });
        });
        
        // Process reports that already have a name
        if (completeReports.length > 0) {
            if (context === 'main') {
                addReportsToMainView(completeReports);
            } else {
                addReportsToComparisonView(completeReports);
            }
        }
        
        // If some reports need names, trigger the modal
        if (reportsNeedingName.length > 0) {
            setPendingNameAssignment(prev => [...prev, ...reportsNeedingName]);
        }
      })
      .catch(error => {
        console.error("Import fehlgeschlagen:", error);
        alert(`Import von Dateien fehlgeschlagen: ${error.message}`);
      });
  }, []);

  const addReportsToMainView = (reports: TestPath[]) => {
    setTestPaths(currentPaths => {
        let nextId = Math.max(0, ...currentPaths.map(p => p.id)) + 1;
        const existingTitles = new Set(currentPaths.map(p => p.title));

        const newUniquePaths = reports.map(importedPath => {
            let newTitle = importedPath.title;
            let counter = 1;
            while (existingTitles.has(newTitle)) {
                newTitle = `${importedPath.title} (${counter})`;
                counter++;
            }
            existingTitles.add(newTitle);

            return {
                ...importedPath,
                id: nextId++,
                title: newTitle,
            };
        });

        return [...currentPaths, ...newUniquePaths];
    });
  };
  
  const addReportsToComparisonView = (reports: TestPath[]) => {
    setComparisonReports(prev => [...prev, ...reports]);
    if (!isComparisonMode) {
      setIsComparisonMode(true);
    }
  };

  const handleImportForComparison = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        setComparisonReports([]); // Start fresh for each comparison import
        processImportedFiles(event.target.files, 'comparison');
    }
    event.target.value = '';
  }, [processImportedFiles]);

  const handleConfirmTesterNames = (assignments: { [filename: string]: string }) => {
    const reportsToProcess = [...pendingNameAssignment];
    setPendingNameAssignment([]);

    const mainReports: TestPath[] = [];
    const comparisonReports: TestPath[] = [];
    
    reportsToProcess.forEach(item => {
        const assignedName = assignments[item.filename];
        if (assignedName) {
            const updatedReport = { ...item.report, testerName: assignedName };
            if (item.context === 'main') {
                mainReports.push(updatedReport);
            } else {
                comparisonReports.push(updatedReport);
            }
        }
    });

    if (mainReports.length > 0) {
        addReportsToMainView(mainReports);
    }
    if (comparisonReports.length > 0) {
        addReportsToComparisonView(comparisonReports);
    }
  };


  const handleCloseComparison = () => {
    setIsComparisonMode(false);
    setComparisonReports([]);
    setSelectedForDiff([]);
    setIsDiffing(false);
  };

  // --- Comparison handlers ---
  const handleSelectForDiff = useCallback((reportToToggle: TestPath) => {
    setSelectedForDiff(prev => 
        prev.some(r => r === reportToToggle)
            ? prev.filter(r => r !== reportToToggle) 
            : [...prev, reportToToggle]
    );
  }, []);

  // --- Memos lifted from ComparisonView ---
  const aggregatedReports = useMemo(() => {
    const reportGroups: { [title: string]: { items: TestItem[], testers: Set<string> } } = {};
    comparisonReports.forEach(report => {
        if (!reportGroups[report.title]) {
            reportGroups[report.title] = { items: [], testers: new Set() };
        }
        reportGroups[report.title].items.push(...report.items);
        if (report.testerName) {
            reportGroups[report.title].testers.add(report.testerName);
        }
    });
    return Object.entries(reportGroups).map(([title, data]) => ({
        title,
        testerCount: data.testers.size,
        items: data.items,
    })).sort((a,b) => a.title.localeCompare(b.title));
  }, [comparisonReports]);

  const overallSummary = useMemo(() => {
    const allItems = comparisonReports.flatMap(r => r.items);
    if (allItems.length === 0) return { passed: 0, failed: 0, inProgress: 0, notStarted: 0, total: 0 };
    const passed = allItems.filter(item => item.status === TestStatus.PASSED).length;
    const failed = allItems.filter(item => item.status === TestStatus.FAILED).length;
    const inProgress = allItems.filter(item => item.status === TestStatus.IN_PROGRESS).length;
    const notStarted = allItems.filter(item => item.status === TestStatus.NOT_STARTED).length;
    return { passed, failed, inProgress, notStarted, total: allItems.length };
  }, [comparisonReports]);

  const performanceChartData = useMemo(() => {
    const labels = comparisonReports.map(r => `${r.title} (${r.testerName || 'N/A'})`);
    const passedData = comparisonReports.map(r => r.items.filter(i => i.status === TestStatus.PASSED).length);
    const failedData = comparisonReports.map(r => r.items.filter(i => i.status === TestStatus.FAILED).length);
    return { labels, passedData, failedData };
  }, [comparisonReports]);

  const topFailuresData = useMemo(() => {
      const failureCounts: { [key: string]: number } = {};
      comparisonReports.flatMap(r => r.items)
          .filter(item => item.status === TestStatus.FAILED)
          .forEach(item => {
              failureCounts[item.description] = (failureCounts[item.description] || 0) + 1;
          });
      const sortedFailures = Object.entries(failureCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
      return {
          labels: sortedFailures.map(([desc]) => desc),
          counts: sortedFailures.map(([, count]) => count),
      };
  }, [comparisonReports]);
  
  // --- Export handlers lifted from ComparisonView ---
  const handleExportPDF = useCallback(async () => {
        if (isExporting) return;
        setIsExporting(true);
        setShowExportDropdown(false);
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    
            const MARGIN = 40;
            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
            const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
            let y = MARGIN;
            let pageCount = 1;
    
            const sanitizeForPdf = (text: string | null | undefined): string => {
                if (!text) return '';
                const replacements: { [key: string]: string } = { '…': '...', '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '•': '*', '\u00A0': ' ' };
                let sanitized = text.replace(/[…‘’“”––•\u00A0]/g, char => replacements[char] || char);
                return sanitized.replace(/[^ -~äöüÄÖÜß\n\r]/g, '');
            };
    
            const addPage = () => {
                doc.addPage();
                pageCount++;
                y = MARGIN;
            };
    
            const checkPageBreak = (heightNeeded: number) => {
                if (y + heightNeeded > PAGE_HEIGHT - MARGIN) {
                    addPage();
                }
            };
    
            const renderChartToImage = async (chartConfig: any, width: number, height: number): Promise<string> => {
                const offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = width;
                offscreenCanvas.height = height;
                const chart = new Chart(offscreenCanvas, { ...chartConfig, options: { ...chartConfig.options, animation: false, responsive: false, devicePixelRatio: 2 } });
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for render
                const dataUrl = offscreenCanvas.toDataURL('image/png', 1.0);
                chart.destroy();
                return dataUrl;
            };
    
            const lightThemeColors = { text: '#333333', heading: '#000000', subHeading: '#555555', green: '#28a745', red: '#dc3545', blue: '#007bff', gray: '#6c757d' };
    
            doc.setFontSize(24).setTextColor(lightThemeColors.heading).setFont('helvetica', 'bold');
            doc.text('Test-Vergleichsbericht', PAGE_WIDTH / 2, y, { align: 'center' });
            y += 40;
    
            const lightChartOptions = (textColor: string, gridColor: string) => ({
                plugins: { legend: { labels: { color: textColor, boxWidth: 10, padding: 10 }, position: 'right' } },
                scales: { x: { ticks: { color: textColor }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } }
            });
    
            const overallChartImg = await renderChartToImage({
                type: 'doughnut',
                data: { labels: ['Bestanden', 'Fehlgeschlagen', 'In Bearbeitung', 'Nicht begonnen'], datasets: [{ data: [overallSummary.passed, overallSummary.failed, overallSummary.inProgress, overallSummary.notStarted], backgroundColor: [lightThemeColors.green, lightThemeColors.red, lightThemeColors.blue, lightThemeColors.gray], borderColor: '#fff', borderWidth: 2 }] },
                options: { ...lightChartOptions(lightThemeColors.text, '#e9ecef'), cutout: '70%' }
            }, 600, 300);
            
            doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
            doc.text('Visuelle Analyse', MARGIN, y);
            y += 20;
            doc.addImage(overallChartImg, 'PNG', MARGIN, y, CONTENT_WIDTH, CONTENT_WIDTH / 2);
            y += (CONTENT_WIDTH / 2) + 20;
    
            addPage();
            doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
            doc.text('Detaillierte Testberichte', MARGIN, y);
            y += 25;
    
            for (const report of comparisonReports) {
                const reportHeader = `${report.title} (Tester: ${report.testerName || 'N/A'})`;
                checkPageBreak(40);
                doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(lightThemeColors.heading);
                doc.text(sanitizeForPdf(reportHeader), MARGIN, y);
                y += 20;
    
                for (const item of report.items) {
                    checkPageBreak(15);
                    const statusColors: { [key: string]: string } = { [TestStatus.PASSED]: lightThemeColors.green, [TestStatus.FAILED]: lightThemeColors.red, [TestStatus.IN_PROGRESS]: lightThemeColors.blue, [TestStatus.NOT_STARTED]: lightThemeColors.gray };
                    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(statusColors[item.status] || lightThemeColors.text);
                    doc.text(`[${item.status}]`, MARGIN, y, { charSpace: 0.5 });
                    
                    doc.setFont('helvetica', 'normal').setTextColor(lightThemeColors.text);
                    const descLines = doc.splitTextToSize(sanitizeForPdf(item.description), CONTENT_WIDTH - 80);
                    doc.text(descLines, MARGIN + 80, y);
                    y += descLines.length * 12;

                    if (item.comment) {
                        checkPageBreak(12);
                        doc.setFont('helvetica', 'italic').setTextColor(lightThemeColors.subHeading);
                        const commentLines = doc.splitTextToSize(sanitizeForPdf(`Kommentar: ${item.comment}`), CONTENT_WIDTH - 90);
                        doc.text(commentLines, MARGIN + 90, y);
                        y += commentLines.length * 12;
                    }
                    y += 5;
                }
                y += 15;
            }
    
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8).setTextColor(150);
                doc.text(`Seite ${i} von ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 20, { align: 'right' });
                doc.text('Test-Vergleichsbericht', MARGIN, PAGE_HEIGHT - 20);
            }
    
            doc.save('test-vergleichsbericht.pdf');
        } catch (error) {
            console.error("PDF-Export fehlgeschlagen:", error);
            alert("PDF-Export fehlgeschlagen. Details in der Konsole.");
        } finally {
            setIsExporting(false);
        }
    }, [comparisonReports, overallSummary, isExporting]);

  const handleExportHTML = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
        const renderChartToImage = async (chartConfig: any, width: number, height: number): Promise<string> => {
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = width;
            offscreenCanvas.height = height;
            const chart = new Chart(offscreenCanvas, { ...chartConfig, options: {...chartConfig.options, animation: false, responsive: false, devicePixelRatio: 2} });
            await new Promise(resolve => setTimeout(resolve, 500));
            const dataUrl = offscreenCanvas.toDataURL('image/png', 1.0);
            chart.destroy();
            return dataUrl;
        };
        
        const overallChartLabelsWithCount = [`${TestStatus.PASSED} (${overallSummary.passed})`, `${TestStatus.FAILED} (${overallSummary.failed})`, `${TestStatus.IN_PROGRESS} (${overallSummary.inProgress})`, `${TestStatus.NOT_STARTED} (${overallSummary.notStarted})`];
        const overallChartConfig = { type: 'doughnut', data: { labels: overallChartLabelsWithCount, datasets: [{ data: [overallSummary.passed, overallSummary.failed, overallSummary.inProgress, overallSummary.notStarted], backgroundColor: ['#22c55e', '#ef4444', '#3b82f6', '#6b7280'], borderColor: '#111827', borderWidth: 4 }] }, options: { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#d1d5db', padding: 20, boxWidth: 12 } } } } };
        const overallChartImg = await renderChartToImage(overallChartConfig, 350, 350);

        const getStatusBadgeHtml = (status: TestStatus) => {
            let styles = '';
            switch (status) {
                case TestStatus.PASSED: styles = 'background-color: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);'; break;
                case TestStatus.FAILED: styles = 'background-color: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);'; break;
                case TestStatus.IN_PROGRESS: styles = 'background-color: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);'; break;
                default: styles = 'background-color: rgba(107, 114, 128, 0.1); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3);'; break;
            }
            return `<span style="display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; white-space: nowrap; ${styles}">${status}</span>`;
        };

        const htmlContent = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Test-Vergleichsbericht</title><style>body{background-color:#111827;color:#d1d5db;font-family:sans-serif;} main{padding:2rem; max-width:1280px; margin:auto;} h1{font-size:1.875rem;font-weight:700;color:white;margin-bottom:1.5rem;text-align:center;} h3{font-size:1.25rem;font-weight:600;color:white;margin-bottom:1rem;border-bottom:1px solid #374151;padding-bottom:0.75rem;} .report-card{background-color:#1f2937;border-radius:0.5rem;border:1px solid #374151;padding:1rem;margin-top:1rem;} .report-card h4{font-weight:600;color:#f9fafb;} .report-card p{font-size:0.875rem;color:#9ca3af;} .item-row{padding:0.5rem 0;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;} .item-desc{color:#e5e7eb;} .item-comment{font-size:0.875rem;color:#2dd4bf;font-style:italic;margin-top:0.25rem;} .item-image-container{display:flex;gap:0.5rem;margin-top:0.5rem;} .item-image{max-width:200px;max-height:100px;border-radius:0.25rem;border:1px solid #4b5563;}</style></head><body><main><h1>Test-Vergleichsbericht</h1><div><h3>Detaillierte Testberichte</h3><div style="margin-top:1rem; display:grid; gap:1.5rem;">${comparisonReports.map(report => `<div class="report-card"><h4>${report.title}</h4><p>Von: ${report.testerName||'N/A'}</p><div style="margin-top:1rem; border-top: 1px solid #374151;">${report.items.map((item,index) => `<div class="item-row" style="border-bottom: 1px solid #374151;"><div style="flex-grow:1;"><p class="item-desc"><span style="color:#6b7280;margin-right:0.5rem;">${index+1}.</span>${item.description}</p>${item.comment?`<p class="item-comment">"${item.comment}"</p>`:''}${item.commentImages && item.commentImages.length > 0 ? `<div class="item-image-container">${item.commentImages.map(img => `<img src="${img}" alt="Anhang" class="item-image"/>`).join('')}</div>` : ''}</div>${getStatusBadgeHtml(item.status)}</div>`).join('')}</div></div>`).join('')}</div></div></main></body></html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'test-vergleichsbericht.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("HTML-Export fehlgeschlagen:", error);
    } finally {
        setIsExporting(false);
    }
  }, [comparisonReports, overallSummary, performanceChartData, topFailuresData, aggregatedReports, isExporting]);
  
  const handleExportXLSX = useCallback(() => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
        const wb = XLSX.utils.book_new();
        const rawData = comparisonReports.flatMap(r => r.items.map(item => ({"Berichtstitel": r.title, "Tester": r.testerName || 'N/A', "Testpunkt-Beschreibung": item.description, "Status": item.status, "Kommentar": item.comment || ''})));
        const wsRaw = XLSX.utils.json_to_sheet(rawData);
        wsRaw['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 60 }, { wch: 15 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, wsRaw, "Rohdaten");
        XLSX.writeFile(wb, "test-vergleichsbericht.xlsx");
    } catch (error) {
        console.error("XLSX-Export fehlgeschlagen:", error);
    } finally {
        setIsExporting(false);
    }
  }, [comparisonReports, aggregatedReports, isExporting, overallSummary]);


  // Admin handlers
  const handleToggleAdminMode = () => setIsAdminMode(prev => !prev);

  const handleAddTestPath = (title: string) => {
    setTestPaths(prev => {
      const newId = Math.max(0, ...prev.map(p => p.id)) + 1;
      const newPath: TestPath = {
        id: newId,
        title,
        items: []
      };
      return [...prev, newPath];
    });
  };

  const handleUpdateTestPath = (updatedPath: TestPath) => {
    setTestPaths(prev => prev.map(p => p.id === updatedPath.id ? updatedPath : p));
  };
  
  const handleDeleteTestPath = (pathId: number) => {
    setTestPaths(prev => {
      const newPaths = prev.filter(p => p.id !== pathId);
      if(activePathIndex >= newPaths.length) {
        setActivePathIndex(Math.max(0, newPaths.length - 1));
      }
      return newPaths;
    });
  };
  
  const handleExportAllTestPaths = useCallback(() => {
    const dataStr = JSON.stringify(testPaths, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `test-plans-backup.json`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [testPaths]);

  const handleImportAndReplaceTestPaths = useCallback((newPaths: TestPath[]) => {
    setTestPaths(newPaths);
    setActivePathIndex(0);
  }, []);

  const renderContent = () => {
    if (isAdminMode) {
      return (
        <AdminView 
          testPaths={testPaths}
          onAddPath={handleAddTestPath}
          onUpdatePath={handleUpdateTestPath}
          onDeletePath={handleDeleteTestPath}
          onClose={handleToggleAdminMode}
          onExportAll={handleExportAllTestPaths}
          onImportAndReplace={handleImportAndReplaceTestPaths}
        />
      );
    }
    if (isComparisonMode) {
      return <ComparisonView 
                reports={comparisonReports} 
                selectedForDiff={selectedForDiff}
                onSelectForDiff={handleSelectForDiff}
                isDiffing={isDiffing}
                setIsDiffing={setIsDiffing}
                aggregatedReports={aggregatedReports}
                overallSummary={overallSummary}
                performanceChartData={performanceChartData}
                topFailuresData={topFailuresData}
             />;
    }
    return (
      <main className="p-4 sm:p-6 md:p-8">
        <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-blue-600/10 ring-1 ring-gray-800">
          <div className="p-6 md:p-8">
            <TestPathSelector
              paths={testPaths.map(p => p.title)}
              activeIndex={activePathIndex}
              onSelect={setActivePathIndex}
            />
            
            <div className="mt-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">{activePath?.title || 'Kein Testplan ausgewählt'}</h2>
              {activePath && (
                <>
                  <SummaryView items={activePath.items} onExport={handleExportToJSON} />
                  <div className="mt-8">
                    <TestPlanView
                      // FIX: Corrected typo from active-Path.items to activePath.items
                      items={activePath.items}
                      onStatusChange={handleStatusChange}
                      onOpenCommentModal={handleOpenCommentModal}
                    />
                  </div>
                </>
              )}
              {!activePath && testPaths.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium text-white">Keine Testpläne verfügbar</h3>
                  <p className="text-gray-400 mt-2">Wechseln Sie in den Admin-Modus, um einen neuen Testplan zu erstellen.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className="min-h-screen font-sans text-gray-300">
      <Header 
        onToggleAdmin={handleToggleAdminMode} 
        isAdminMode={isAdminMode} 
        onImportForComparison={handleImportForComparison}
        // --- Props for comparison mode actions ---
        isComparisonMode={isComparisonMode}
        onCloseComparison={handleCloseComparison}
        isExporting={isExporting}
        showExportDropdown={showExportDropdown}
        setShowExportDropdown={setShowExportDropdown}
        onExportPDF={handleExportPDF}
        onExportHTML={handleExportHTML}
        onExportXLSX={handleExportXLSX}
      />
      {renderContent()}
      <footer className="text-center p-4 text-gray-400 text-sm">
        <p>Testplan-Tracker &copy; 2025 Werner Pallentin</p>
      </footer>

      {editingCommentItem && (
        <CommentModal 
          item={editingCommentItem}
          onClose={handleCloseCommentModal}
          onSave={handleSaveComment}
        />
      )}
      {!testerName && (
        <TesterNameModal onNameSubmit={setTesterName} />
      )}
      {pendingNameAssignment.length > 0 && (
          <AssignTesterNameModal
            pendingItems={pendingNameAssignment}
            onConfirm={handleConfirmTesterNames}
            onCancel={() => setPendingNameAssignment([])}
          />
      )}
    </div>
  );
};

export default App;
