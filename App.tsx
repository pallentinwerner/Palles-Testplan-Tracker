
import React, { useState, useMemo, useCallback } from 'react';
import { TEST_PATHS } from './constants';
import { TestStatus, TestPath, TestItem, isTestPath, isTestPathArray } from './types';
import Header from './components/Header';
import TestPathSelector from './components/TestPathSelector';
import SummaryView from './components/SummaryView';
import TestPlanView from './components/TestPlanView';
import CommentModal from './components/CommentModal';
import TesterNameModal from './components/TesterNameModal';
import AdminView from './components/AdminView';
import ComparisonView from './components/ComparisonView';
import AssignTesterNameModal from './components/AssignTesterNameModal';

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
            updatedItem.commentImage = undefined;
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

  const handleSaveComment = useCallback((itemId: number, comment: string, commentImage: string | null) => {
    setTestPaths(prevPaths => {
      const newPaths = [...prevPaths];
      const path_to_update = { ...newPaths[activePathIndex] };
      path_to_update.items = path_to_update.items.map(item =>
        item.id === itemId ? { ...item, comment, commentImage } : item
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
            
            const migratedData = Array.isArray(parsed) ? parsed.map(migrateReport) : migrateReport(parsed);
            // --- END: Data Migration Logic ---

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
  };

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
      return <ComparisonView reports={comparisonReports} onClose={handleCloseComparison} />;
    }
    return (
      <main className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto bg-slate-800 rounded-2xl shadow-2xl shadow-indigo-500/10 ring-1 ring-white/10">
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
                  <p className="text-slate-400 mt-2">Wechseln Sie in den Admin-Modus, um einen neuen Testplan zu erstellen.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className="min-h-screen font-sans text-slate-300">
      <Header 
        onToggleAdmin={handleToggleAdminMode} 
        isAdminMode={isAdminMode} 
        onImportForComparison={handleImportForComparison}
      />
      {renderContent()}
      <footer className="text-center p-4 text-slate-400 text-sm">
        <p>Testplan-Tracker &copy; 2024. Erstellt mit React & Tailwind CSS.</p>
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
