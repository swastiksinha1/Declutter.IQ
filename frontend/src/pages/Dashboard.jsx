import { useState, useMemo, useEffect } from 'react';
import { jsPDF } from "jspdf";
import { 
  LayoutDashboard, Copy, Settings, Trash2, Search, Brain, 
  ImageIcon, FileText, CheckCircle, FolderTree, Ghost, 
  Cloud, Sparkles, FolderMinus, Loader, AlertTriangle, ChevronDown, ChevronUp, Wand2, Lock, TrendingUp
} from 'lucide-react';
import MemoryGame from '../components/MemoryGame';
import TiltCard from '../components/TiltCard';
import ScanVisualizer from '../components/ScanVisualizer';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import AnimatedCounter from '../components/AnimatedCounter';
import RippleButton from '../components/RippleButton';
import CustomCursor from '../components/CustomCursor';
import SignatureVisual from '../components/SignatureVisual';
import SlotMachineIcon from '../components/SlotMachineIcon';
import DuplicatePreviewPopover from '../components/DuplicatePreviewPopover';

function useSessionState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(error);
    }
  }, [key, state]);

  return [state, setState];
}

const formatRelativeTime = (mtimeSecs) => {
  if (!mtimeSecs) return { text: 'Unknown', bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' };
  const now = Date.now();
  const fileTime = mtimeSecs * 1000;
  const diffDays = Math.floor((now - fileTime) / (1000 * 60 * 60 * 24));
  let text = '';
  if (diffDays === 0) text = 'Today';
  else if (diffDays === 1) text = 'Yesterday';
  else if (diffDays < 30) text = `${diffDays} days ago`;
  else if (diffDays < 365) text = `${Math.floor(diffDays / 30)} months ago`;
  else text = `${Math.floor(diffDays / 365)} years ago`;
  
  let color = 'rgba(255, 69, 58, 0.15)'; // Red for old files
  let textColor = '#ff453a';
  if (diffDays < 30) { color = 'rgba(50, 215, 75, 0.15)'; textColor = '#32d74b'; }
  else if (diffDays <= 90) { color = 'rgba(255, 214, 10, 0.15)'; textColor = '#ffd60a'; }
  return { text, bg: color, color: textColor };
};

const getFlagReason = (file) => {
  const ext = file.extension?.toLowerCase() || '';
  const now = Date.now();
  const fileTime = file.mtime ? file.mtime * 1000 : now;
  const diffDays = Math.floor((now - fileTime) / (1000 * 60 * 60 * 24));
  
  if (['.exe', '.dmg', '.pkg', '.msi'].includes(ext)) {
    return "Installer — likely unused";
  }
  if (['.mp4', '.mov', '.mkv', '.avi'].includes(ext)) {
    if (diffDays > 30) return "Large video, not opened recently";
    return "Large video file";
  }
  if (['.zip', '.rar', '.tar', '.gz', '.7z'].includes(ext)) {
    if (diffDays > 30) return "Old archive — consider extracting or deleting";
    return "Archive file";
  }
  if (['.iso', '.img'].includes(ext)) {
    return "Disk image — takes up significant space";
  }
  
  if (diffDays > 90) {
    return "Old file taking up significant space";
  }
  return "Taking up significant space";
};

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [directory, setDirectory] = useSessionState('declutter_dir', '');
  const [defaultDir, setDefaultDir] = useState('');
  
  useEffect(() => {
    const fetchDefaultDir = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/default-directory');
        const data = await response.json();
        if (data.status === 'success' && data.directory) {
          setDirectory(data.directory);
          setDefaultDir(data.directory);
        }
      } catch (err) {
        console.error("Failed to fetch default directory", err);
      }
    };
    fetchDefaultDir();
  }, []);
  
  // States
  const [isScanning, setIsScanning] = useState(false);
  const [isSemanticScanning, setIsSemanticScanning] = useState(false);
  const [scanResult, setScanResult] = useSessionState('declutter_scanResult', null);
  const [semanticResult, setSemanticResult] = useSessionState('declutter_semanticResult', null);
  const [scanHistory, setScanHistory] = useSessionState('scan_history', []);
  const [recentlyDeleted, setRecentlyDeleted] = useSessionState('recently_deleted', []);
  const [error, setError] = useState('');
  const [chartFilter, setChartFilter] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [reclaimHistory, setReclaimHistory] = useSessionState('declutter_reclaim_history', []);

  // Stats state
  const [sessionStats, setSessionStats] = useSessionState('declutter_sessionStats', {
    filesScanned: 0,
    duplicatesFound: 0,
    spaceReclaimedBytes: 0,
    lastScanDate: 'Never'
  });

  const historicalReclaimedData = useMemo(() => {
    if (reclaimHistory.length === 0) {
      return [{ date: 'Today', mbReclaimed: 0 }];
    }
    return reclaimHistory.map(entry => ({
      date: entry.date,
      mbReclaimed: Math.round(entry.mbReclaimed)
    }));
  }, [reclaimHistory]);

  const filteredFiles = useMemo(() => {
    if (!chartFilter || !scanResult?.analytics?.all_files) return [];
    
    if (chartFilter.type === 'composition') {
      return scanResult.analytics.all_files.filter(f => f.category === chartFilter.value);
    }
    if (chartFilter.type === 'space') {
      if (chartFilter.value === 'Wasted Space') {
        const redundant = new Set();
        if (scanResult.duplicates) scanResult.duplicates.forEach(g => g.files.slice(1).forEach(f => redundant.add(f.path)));
        if (scanResult.near_duplicates) scanResult.near_duplicates.forEach(g => g.files.slice(1).forEach(f => redundant.add(f.path)));
        return scanResult.analytics.all_files.filter(f => redundant.has(f.path));
      }
      if (chartFilter.value === 'Unique Files') {
        const redundant = new Set();
        if (scanResult.duplicates) scanResult.duplicates.forEach(g => g.files.slice(1).forEach(f => redundant.add(f.path)));
        if (scanResult.near_duplicates) scanResult.near_duplicates.forEach(g => g.files.slice(1).forEach(f => redundant.add(f.path)));
        return scanResult.analytics.all_files.filter(f => !redundant.has(f.path));
      }
    }
    return [];
  }, [chartFilter, scanResult]);
  
  
  // Custom cursor state
  const [isHoveringScan, setIsHoveringScan] = useState(false);

  // Background speed sync
  useEffect(() => {
    document.body.style.setProperty('--grid-speed', (isScanning || isSemanticScanning) ? '8s' : '20s');
  }, [isScanning, isSemanticScanning]);
  
  // UX State
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  
  // Feature States
  const [zombies, setZombies] = useState(null);
  const [categorizeResult, setCategorizeResult] = useState(null);
  const [categorizePlan, setCategorizePlan] = useState(null);
  const [prunePlan, setPrunePlan] = useState(null);
  
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [isZombieScanning, setIsZombieScanning] = useState(false);
  
  const [deletingFiles, setDeletingFiles] = useState(new Set());

  const handleNewScan = () => {
    setScanResult(null);
    setSemanticResult(null);
    setDirectory(defaultDir || '');
    setActiveNav('dashboard');
  };

  const handleScan = async () => {
    if (!directory) return;
    setIsScanning(true);
    setError('');
    setScanResult(null);
    setSemanticResult(null);
    setSelectedFiles(new Set());
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Scan failed');
      
      setScanResult(data);
      
      let dupsCount = 0;
      data.duplicates.forEach(g => dupsCount += (g.files.length - 1));
      data.near_duplicates.forEach(g => dupsCount += (g.files.length - 1));

      setSessionStats(prev => ({
        ...prev,
        filesScanned: data.analytics.total_files,
        duplicatesFound: dupsCount,
        lastScanDate: new Date().toLocaleDateString()
      }));
      
      const toSelect = new Set();
      data.duplicates.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
      data.near_duplicates.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
      setSelectedFiles(toSelect);
      
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        directory,
        scanResult: data,
        semanticResult: null
      };
      setScanHistory(prev => [newHistoryItem, ...prev].slice(0, 3));
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAutoSelect = () => {
    if (!scanResult) return;
    const toSelect = new Set();
    scanResult.duplicates?.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
    scanResult.near_duplicates?.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
    if (semanticResult && semanticResult.semantic_duplicates) {
      semanticResult.semantic_duplicates.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
    }
    setSelectedFiles(toSelect);
    showToast("✨ Magic Auto-Select applied! All redundant files marked for deletion.");
  };

  const handleSemanticScan = async () => {
    if (!directory) return;
    setIsSemanticScanning(true);
    setError('');
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/semantic-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Semantic scan failed');
      
      setSemanticResult(data);
      
      let semanticDupsCount = 0;
      data.semantic_duplicates.forEach(g => semanticDupsCount += (g.files.length - 1));

      setSessionStats(prev => ({
        ...prev,
        duplicatesFound: prev.duplicatesFound + semanticDupsCount,
        lastScanDate: new Date().toLocaleDateString()
      }));
      
      const toSelect = new Set(selectedFiles);
      data.semantic_duplicates.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
      setSelectedFiles(toSelect);
      
      setScanHistory(prev => {
        if (prev.length > 0 && prev[0].directory === directory) {
          const newHistory = [...prev];
          newHistory[0] = { ...newHistory[0], semanticResult: data };
          return newHistory;
        }
        return prev;
      });

      setActiveNav('review');
      
    } catch (err) {
      setError("AI Scan Error: " + err.message);
    } finally {
      setIsSemanticScanning(false);
    }
  };

  const toggleSelection = (filepath) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filepath)) newSelection.delete(filepath);
    else newSelection.add(filepath);
    setSelectedFiles(newSelection);
  };
  
  const { selectedSize, selectedCount } = useMemo(() => {
    let size = 0; let count = 0;
    
    if (scanResult?.analytics?.all_files) {
      scanResult.analytics.all_files.forEach(f => {
        if (selectedFiles.has(f.path)) {
          size += f.size; count += 1;
        }
      });
    } else {
      const uniqueFiles = new Map();
      const addGroup = (group) => {
        group.files.forEach(f => {
          if (selectedFiles.has(f.path) && !uniqueFiles.has(f.path)) {
            uniqueFiles.set(f.path, f.size);
            size += f.size; count += 1;
          }
        });
      };
      
      if (scanResult) {
        scanResult.duplicates.forEach(addGroup);
        scanResult.near_duplicates.forEach(addGroup);
      }
      if (semanticResult) semanticResult.semantic_duplicates.forEach(addGroup);
    }
    
    return { selectedSize: size, selectedCount: count };
  }, [selectedFiles, scanResult, semanticResult]);

  const stageForDeletion = (filesToStage) => {
    const now = Date.now();
    setRecentlyDeleted(prev => {
      const existingPaths = new Set(prev.map(f => f.path));
      const newFiles = filesToStage.filter(f => !existingPaths.has(f.path)).map(f => ({ ...f, deletedAt: now }));
      return [...newFiles, ...prev];
    });
    
    setScanResult(prev => {
       if (!prev) return prev;
       const filterGroup = g => ({ ...g, files: g.files.filter(f => !selectedFiles.has(f.path)) });
       const newAllFiles = prev.analytics?.all_files ? prev.analytics.all_files.filter(f => !selectedFiles.has(f.path)) : undefined;
       return {
         ...prev,
         analytics: prev.analytics ? { ...prev.analytics, all_files: newAllFiles } : prev.analytics,
         duplicates: prev.duplicates.map(filterGroup).filter(g => g.files.length > 1),
         near_duplicates: prev.near_duplicates.map(filterGroup).filter(g => g.files.length > 1)
       };
    });
    if (semanticResult) {
      setSemanticResult(prev => {
         const filterGroup = g => ({ ...g, files: g.files.filter(f => !selectedFiles.has(f.path)) });
         return {
           ...prev,
           semantic_duplicates: prev.semantic_duplicates.map(filterGroup).filter(g => g.files.length > 1)
         };
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeletingFiles(new Set(selectedFiles));
    
    // Artificial delay for checkmark and collapse animations
    await new Promise(r => setTimeout(r, 800));
    
    try {
      const filesToStage = [];
      if (scanResult?.analytics?.all_files) {
        scanResult.analytics.all_files.forEach(f => {
          if (selectedFiles.has(f.path)) {
            if (!filesToStage.find(staged => staged.path === f.path)) filesToStage.push(f);
          }
        });
      } else {
        const addGroup = (group) => {
          group.files.forEach(f => {
            if (selectedFiles.has(f.path)) {
              if (!filesToStage.find(staged => staged.path === f.path)) filesToStage.push(f);
            }
          });
        };
        if (scanResult) {
          scanResult.duplicates.forEach(addGroup);
          scanResult.near_duplicates.forEach(addGroup);
        }
        if (semanticResult) semanticResult.semantic_duplicates.forEach(addGroup);
      }

      stageForDeletion(filesToStage);
      
      setIsModalOpen(false);
      const reclaimedSpace = filesToStage.reduce((acc, f) => acc + f.size, 0);
      setToast(`Staged ${filesToStage.length} files in Recently Deleted! Reclaimed ${(reclaimedSpace / (1024*1024)).toFixed(2)} MB.`);
      setTimeout(() => setToast(''), 5000);
      
      setSessionStats(prev => ({
        ...prev,
        spaceReclaimedBytes: prev.spaceReclaimedBytes + reclaimedSpace
      }));
      
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setReclaimHistory(prev => {
        const newHistory = [...prev];
        const todayEntryIndex = newHistory.findIndex(entry => entry.date === today);
        const reclaimedMB = reclaimedSpace / (1024 * 1024);
        if (todayEntryIndex >= 0) {
          newHistory[todayEntryIndex] = {
            ...newHistory[todayEntryIndex],
            mbReclaimed: newHistory[todayEntryIndex].mbReclaimed + reclaimedMB
          };
        } else {
          newHistory.push({ date: today, mbReclaimed: reclaimedMB });
        }
        return newHistory;
      });
      
      setSelectedFiles(new Set());
      setDeletingFiles(new Set());
    } catch (err) {
      alert("Delete error: " + err.message);
    } finally {
      setIsDeleting(false);
      setDeletingFiles(new Set());
    }
  };

  const handleExportCSV = () => {
    if (!scanResult) return;
    const { analytics } = scanResult;
    let csv = "Declutter.IQ - Scan Report\n\n";
    csv += `Total Files Scanned,${analytics.total_files}\n`;
    csv += `Reclaimable Space (MB),${(analytics.reclaimable_space_bytes / (1024*1024)).toFixed(2)}\n`;
    csv += `Duplicate Groups,${analytics.duplicate_groups_count}\n`;
    csv += `Near Duplicate Groups,${analytics.near_duplicate_groups_count}\n\n`;
    
    csv += "Top Storage Hogs\n";
    csv += "Filename,Path,Size (MB)\n";
    if (analytics.top_large_files) {
      analytics.top_large_files.forEach(f => {
        csv += `"${f.filename}","${f.path}",${(f.size / (1024*1024)).toFixed(2)}\n`;
      });
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Declutter_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!scanResult) return;
    const doc = new jsPDF();
    const { analytics } = scanResult;
    
    doc.setFontSize(18);
    doc.text("Declutter.IQ - Scan Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
    
    doc.text("Summary:", 20, 45);
    doc.setFontSize(10);
    doc.text(`Total Files Scanned: ${analytics.total_files}`, 25, 55);
    doc.text(`Reclaimable Space: ${(analytics.reclaimable_space_bytes / (1024*1024)).toFixed(2)} MB`, 25, 62);
    doc.text(`Duplicate Groups: ${analytics.duplicate_groups_count}`, 25, 69);
    doc.text(`Near Duplicate Groups: ${analytics.near_duplicate_groups_count}`, 25, 76);
    
    doc.setFontSize(12);
    doc.text("Top Storage Hogs:", 20, 95);
    doc.setFontSize(9);
    
    let y = 105;
    if (analytics.top_large_files) {
      analytics.top_large_files.forEach((f, i) => {
        doc.text(`${i+1}. ${f.filename} (${(f.size / (1024*1024)).toFixed(2)} MB)`, 25, y);
        doc.setTextColor(100);
        doc.text(f.path, 25, y + 5);
        doc.setTextColor(0);
        y += 15;
      });
    }
    
    doc.save(`Declutter_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };
  
  const handleCategorizePreview = async () => {
    if (!directory) return;
    setIsCategorizing(true);
    setCategorizeResult(null);
    setCategorizePlan(null);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/categorize/preview', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({directory})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.plan.length === 0) {
        showToast("No loose files found to categorize!");
      } else {
        setCategorizePlan(data.plan);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setIsCategorizing(false); }
  };

  const handleCategorizeExecute = async () => {
    setIsCategorizing(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/categorize/execute', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({plan: categorizePlan})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategorizePlan(null);
      setCategorizeResult(data);
      showToast(`Success! Organized ${data.moved_count} loose files.`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setIsCategorizing(false); }
  };

  const handlePrunePreview = async () => {
    if (!directory) return;
    setIsPruning(true);
    setPrunePlan(null);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/prune/preview', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({directory})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.plan.length === 0) {
        showToast("No empty folders found!");
      } else {
        setPrunePlan(data.plan);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setIsPruning(false); }
  };

  const handlePruneExecute = async () => {
    setIsPruning(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/prune/execute', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({plan: prunePlan})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrunePlan(null);
      showToast(`Cleaned up ${data.pruned_count} completely empty folders.`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setIsPruning(false); }
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget || !newName) return;
    setIsRenaming(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/rename', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ path: renameTarget.path, new_name: newName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast(`Successfully renamed to ${newName}`);
      setRenameTarget(null);
      setNewName('');
      handleScan();
    } catch (err) {
      alert("Rename Error: " + err.message);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleZombies = async () => {
    if (!directory) return;
    setIsZombieScanning(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/zombies', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({directory})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setZombies(data.zombies);
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setIsZombieScanning(false); }
  };

  const DuplicateGroup = ({ group, title, colorClass, borderColor, initialDelay }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: initialDelay * 0.05 }}
        className="duplicate-group" style={{ borderLeft: `4px solid ${borderColor}`, cursor: 'pointer', overflow: 'hidden', padding: '1.2rem', marginBottom: '1rem', background: 'rgba(20,20,20,0.4)', borderRadius: '12px' }}
      >
        <DuplicatePreviewPopover group={group}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setIsOpen(!isOpen)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
               <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>{title}</h4>
               <span className="badge" style={{ ...colorClass, padding: '0.3rem 0.8rem' }}>
                 <AnimatedCounter value={group.redundant_space / (1024 * 1024)} decimals={2} suffix=" MB" />
               </span>
               <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                 {group.files.length - 1} redundant files
               </span>
            </div>
            <div style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: '0.5rem', display: 'flex' }}>
              {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </DuplicatePreviewPopover>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ul className="file-list" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <AnimatePresence>
                  {group.files.map((f, i) => <FileItem key={f.path} f={f} />)}
                </AnimatePresence>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const FileItem = ({ f }) => {
    const isImg = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(f.extension?.toLowerCase());
    const isDeletingThis = deletingFiles.has(f.path);
    
    return (
      <motion.li 
        className="file-item"
        initial={{ opacity: 1, height: 'auto', scale: 1 }}
        animate={isDeletingThis ? { opacity: 0, height: 0, scale: 0.8, margin: 0, padding: 0 } : { opacity: 1, height: 'auto', scale: 1 }}
        transition={isDeletingThis ? { delay: 0.4, duration: 0.4 } : { duration: 0.2 }}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {isDeletingThis && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(50, 215, 75, 0.15)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="40" height="40" viewBox="0 0 50 50">
              <motion.path
                d="M 14 27 l 7 7 l 16 -16"
                fill="transparent"
                strokeWidth="4"
                stroke="#32d74b"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
              />
            </svg>
          </motion.div>
        )}
        <input 
          type="checkbox" 
          checked={selectedFiles.has(f.path)} 
          onChange={() => toggleSelection(f.path)}
          style={{width: '18px', height: '18px', cursor: 'pointer', margin: 0, accentColor: 'var(--brand-primary)'}}
        />
        {isImg && (
          <img 
            src={`http://127.0.0.1:5000/api/file?path=${encodeURIComponent(f.path)}`} 
            alt={f.filename} 
            style={{width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', marginLeft: '1rem', cursor: 'pointer', border: '1px solid var(--border-light)'}} 
            onClick={() => setPreviewFile(f)}
          />
        )}
        <div className="file-info" style={{marginLeft: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem', justifyContent: 'center'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span 
              className="filename" 
              style={{cursor: isImg ? 'pointer' : 'default', fontWeight: '500', color: isImg ? 'var(--text-main)' : 'var(--text-muted)'}} 
              onClick={() => isImg ? setPreviewFile(f) : null}
            >
              {f.filename}
            </span>
            {(() => {
              const timeTag = formatRelativeTime(f.mtime);
              return <span style={{ background: timeTag.bg, color: timeTag.color, padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{timeTag.text}</span>;
            })()}
          </div>
          <span className="filepath" style={{opacity: 0.5, fontSize: '0.8rem', color: 'var(--text-muted)'}}>{f.path}</span>
        </div>
        <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '1rem'}}><AnimatedCounter value={f.size / 1024} decimals={1} suffix=" KB" /></span>
        <button className="btn btn-ghost" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}} onClick={() => { setRenameTarget(f); setNewName(f.filename); }}>
          <Sparkles size={14} style={{color: '#9d4edd'}} /> Rename
        </button>
      </motion.li>
    );
  };

  return (
    <>
      <div className="app-layout fade-in">
      
      {toast && (
        <div style={{position: 'fixed', top: 20, right: 20, background: 'var(--brand-primary)', color: 'white', padding: '1rem 2rem', borderRadius: 12, zIndex: 1000, boxShadow: '0 10px 30px rgba(94, 106, 210, 0.4)'}} className="fade-in">
          {toast}
        </div>
      )}

      {isSemanticScanning && (
        <div className="game-overlay fade-in">
          <MemoryGame />
        </div>
      )}

      {previewFile && (
        <div className="game-overlay" onClick={() => setPreviewFile(null)}>
          <div className="fade-in" style={{position: 'relative', maxWidth: '90vw', maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
            <img 
              src={`http://127.0.0.1:5000/api/file?path=${encodeURIComponent(previewFile.path)}`} 
              alt={previewFile.filename}
              style={{maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)'}}
            />
            <button 
              onClick={() => setPreviewFile(null)}
              style={{position: 'absolute', top: '-15px', right: '-15px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-header">
          <Sparkles color="#9d4edd" size={28} />
          <h1>Declutter.IQ</h1>
        </div>
        
        <div className="nav-section">Main</div>
        <div className="nav-links">
          <div className="nav-item" onClick={handleNewScan} style={{color: 'var(--brand-primary)'}}>
            <Sparkles size={18} /> <span>New Scan</span>
          </div>
          <div className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveNav('dashboard')}>
            <LayoutDashboard size={18} /> <span>Dashboard</span>
          </div>
          <div className={`nav-item ${activeNav === 'history' ? 'active' : ''}`} onClick={() => setActiveNav('history')}>
            <FileText size={18} /> <span>Scan History</span>
            <div style={{marginLeft: 'auto', background: 'rgba(100,116,139,0.2)', color: '#e2e8f0', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600}}>
              {scanHistory.length}
            </div>
          </div>
          <div className={`nav-item ${activeNav === 'review' ? 'active' : ''}`} onClick={() => setActiveNav('review')} style={{position: 'relative'}}>
            <Copy size={18} /> <span>Review Duplicates</span>
            <div style={{marginLeft: 'auto', background: 'rgba(100,116,139,0.2)', color: '#e2e8f0', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600}}>
              {scanResult ? (scanResult.analytics.duplicate_groups_count + scanResult.analytics.near_duplicate_groups_count + (semanticResult ? semanticResult.semantic_duplicates.length : 0)) : '0'}
            </div>
            {scanResult && activeNav !== 'review' && (
              <div style={{position: 'absolute', left: '10px', top: '12px', width: '6px', height: '6px', background: '#8B5CF6', borderRadius: '50%', boxShadow: '0 0 8px #8B5CF6'}} />
            )}
          </div>
        </div>

        <div className="nav-section" style={{marginTop: '2rem'}}>Tools</div>
        <div className="nav-links">
          <div className={`nav-item ${activeNav === 'trash' ? 'active' : ''}`} onClick={() => setActiveNav('trash')}>
            <Trash2 size={18} /> <span>Recently Deleted</span>
            {recentlyDeleted.length > 0 && (
              <div style={{marginLeft: 'auto', background: 'rgba(255, 69, 58, 0.2)', color: '#ff453a', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600}}>
                {recentlyDeleted.length}
              </div>
            )}
          </div>
          <div className={`nav-item ${activeNav === 'categorize' ? 'active' : ''}`} onClick={() => setActiveNav('categorize')}>
            <FolderTree size={18} /> <span>Auto-Categorize</span>
          </div>
          <div className={`nav-item ${activeNav === 'zombies' ? 'active' : ''}`} onClick={() => setActiveNav('zombies')}>
            <Ghost size={18} /> <span>Zombie Files</span>
            <div style={{marginLeft: 'auto', background: 'rgba(100,116,139,0.2)', color: '#e2e8f0', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600}}>
              {zombies ? zombies.length : '0'}
            </div>
          </div>
          <div className={`nav-item ${activeNav === 'prune' ? 'active' : ''}`} onClick={() => setActiveNav('prune')}>
            <FolderMinus size={18} /> <span>Prune Empty Folders</span>
          </div>
          <div className={`nav-item ${activeNav === 'cloud' ? 'active' : ''}`} onClick={() => setActiveNav('cloud')}>
            <Cloud size={18} /> <span>Cloud Drive</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <CustomCursor isVisible={isHoveringScan} />
        
        <div className="glass-panel" style={{
          marginBottom: (!scanResult && !isScanning && !isSemanticScanning) ? '1.5rem' : '3rem', 
          transition: 'margin 0.4s ease',
          position: 'sticky',
          top: '2rem',
          zIndex: 50,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div 
            className="scan-bar" 
            style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isHoveringScan ? 'none' : 'default', minWidth: '300px' }}
            onMouseEnter={() => setIsHoveringScan(true)}
            onMouseLeave={() => setIsHoveringScan(false)}
          >
            {isScanning && (
              <motion.div
                initial={{ left: '-100%' }}
                animate={{ left: '200%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '50%',
                  background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.2), transparent)',
                  pointerEvents: 'none',
                  zIndex: 0
                }}
              />
            )}
            <input 
              type="text" 
              placeholder="Enter directory (e.g. C:\\Users\\Username\\Downloads)" 
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              className="dir-input"
              style={{ cursor: isHoveringScan ? 'none' : 'text', zIndex: 1, position: 'relative' }}
            />
            <RippleButton className="btn btn-primary" onClick={handleScan} disabled={isScanning || isSemanticScanning} style={{ zIndex: 1, cursor: isHoveringScan ? 'none' : 'pointer' }}>
              <SlotMachineIcon isScanning={isScanning} isSemantic={false} />
              <span style={{ marginLeft: '0.5rem' }}>{isScanning ? 'Analyzing Files...' : 'Scan Path'}</span>
            </RippleButton>
            <RippleButton 
              className="btn" 
              onClick={handleSemanticScan} 
              disabled={isScanning || isSemanticScanning || !scanResult}
              style={{
                zIndex: 1, cursor: isHoveringScan ? 'none' : (scanResult ? 'pointer' : 'default'),
                ...(!scanResult ? {
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.03))',
                  color: '#8B5CF6',
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  transition: 'all 0.5s ease'
                } : {
                  background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                  boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)',
                  border: '1px solid transparent',
                  color: 'white',
                  transition: 'all 0.5s ease'
                })
              }}
            >
              {isSemanticScanning ? (
                <SlotMachineIcon isScanning={true} isSemantic={true} />
              ) : !scanResult ? (
                <Lock size={18} opacity={0.6} />
              ) : (
                <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}>
                  <Brain size={18} />
                </motion.div>
              )}
              <span style={{ marginLeft: '0.5rem' }}>{isSemanticScanning ? 'Deep Scanning...' : 'Deep AI Scan'}</span>
            </RippleButton>
          </div>
          {directory && defaultDir && directory === defaultDir && (
            <div style={{fontSize: '0.85rem', color: 'var(--text)', opacity: 0.7, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%'}}>
              <Sparkles size={14} style={{color: 'var(--primary)'}} /> 
              <span>Auto-detected your system's default Downloads folder as the most common source of clutter.</span>
            </div>
          )}
          {error && <div style={{color: 'var(--danger)', marginTop: '1rem', fontWeight: 500, width: '100%'}}>{error}</div>}

          {scanResult && !isScanning && !isSemanticScanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-ghost" onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} /> Export Report <ChevronDown size={14} />
                </button>
                {isExportMenuOpen && (
                  <div className="glass-panel fade-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 100, minWidth: '150px' }}>
                    <button className="btn btn-ghost" style={{ textAlign: 'left', padding: '0.5rem 1rem' }} onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }}>Download CSV</button>
                    <button className="btn btn-ghost" style={{ textAlign: 'left', padding: '0.5rem 1rem' }} onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }}>Download PDF</button>
                  </div>
                )}
              </div>
              {scanResult.analytics.reclaimable_space_bytes > 0 && (
                 <div className="badge" style={{background: 'rgba(255, 69, 58, 0.15)', color: 'var(--danger)', padding: '0.5rem 1rem', fontSize: '0.85rem'}}>
                    Clutter Detected
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Dashboard View */}
        {activeNav === 'dashboard' && (isScanning || isSemanticScanning) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
             <ScanVisualizer isSemantic={isSemanticScanning} />
          </motion.div>
        )}

        {/* Welcome Screen (No scan running, no results) */}
        {activeNav === 'dashboard' && !scanResult && !isScanning && !isSemanticScanning && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '2rem' }}
          >
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <h2 style={{ fontSize: '3.2rem', marginBottom: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #a0a0a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Intelligent System Declutter
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                First, select a directory and run a <strong>Scan Path</strong> to analyze your storage. Then, unlock the <strong>Deep AI Scan</strong> to find visually identical images using machine learning—with zero risk of losing your original files.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <TiltCard className="stat-card" style={{ height: '100%', flexDirection: 'column', alignItems: 'flex-start', padding: '2rem', borderTop: '2px solid #8B5CF6', background: 'radial-gradient(circle at 10% 10%, rgba(139,92,246,0.08), transparent 60%), rgba(20,20,20,0.6)' }}>
                  <motion.div whileHover={{ scale: 1.1, rotate: -5 }} style={{background: 'rgba(139,92,246, 0.1)', color: '#8B5CF6', marginBottom: '1.5rem', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139,92,246,0.2)'}}>
                    <Brain size={24} />
                  </motion.div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>Semantic AI Matching</div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Uses local AI embeddings to find visually identical images and duplicate files even if they have completely different resolutions, formats, or filenames.</div>
                </TiltCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <TiltCard className="stat-card" style={{ height: '100%', flexDirection: 'column', alignItems: 'flex-start', padding: '2rem', borderTop: '2px solid #8B5CF6', background: 'radial-gradient(circle at 10% 10%, rgba(139,92,246,0.08), transparent 60%), rgba(20,20,20,0.6)' }}>
                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }} style={{background: 'rgba(139,92,246, 0.1)', color: '#8B5CF6', marginBottom: '1.5rem', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139,92,246,0.2)'}}>
                    <Wand2 size={24} />
                  </motion.div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>Smart Auto-Select</div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Our 1-click cleanup algorithm intelligently preserves your highest quality originals while automatically marking thousands of redundancies for safe deletion.</div>
                </TiltCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <TiltCard className="stat-card" style={{ height: '100%', flexDirection: 'column', alignItems: 'flex-start', padding: '2rem', borderTop: '2px solid #64748B', background: 'radial-gradient(circle at 10% 10%, rgba(100,116,139,0.08), transparent 60%), rgba(20,20,20,0.6)' }}>
                  <motion.div whileHover={{ scale: 1.1, rotate: -5 }} style={{background: 'rgba(100,116,139, 0.1)', color: '#64748B', marginBottom: '1.5rem', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(100,116,139,0.2)'}}>
                    <Ghost size={24} />
                  </motion.div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>Zombie File Pruning</div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Automatically roots out corrupted data, 0-byte ghost files, and empty folder trees that silently clutter your hard drive over time.</div>
                </TiltCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <TiltCard className="stat-card" style={{ height: '100%', flexDirection: 'column', alignItems: 'flex-start', padding: '2rem', borderTop: '2px solid #64748B', background: 'radial-gradient(circle at 10% 10%, rgba(100,116,139,0.08), transparent 60%), rgba(20,20,20,0.6)' }}>
                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }} style={{background: 'rgba(100,116,139, 0.1)', color: '#64748B', marginBottom: '1.5rem', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(100,116,139,0.2)'}}>
                    <CheckCircle size={24} />
                  </motion.div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>100% Secure Reclaim</div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Safely preview every single file in high-resolution before it is moved to the Trash. You maintain complete control over what gets deleted.</div>
                </TiltCard>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div style={{ marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recent Activity</h3>
                <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files Scanned</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700 }}><AnimatedCounter value={sessionStats.filesScanned} /></span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duplicates Found</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700 }}><AnimatedCounter value={sessionStats.duplicatesFound} /></span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Space Reclaimed</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}><AnimatedCounter value={parseFloat((sessionStats.spaceReclaimedBytes / (1024 * 1024)).toFixed(1))} suffix=" MB" /></span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Scan Date</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{sessionStats.lastScanDate}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Signature 3D Visual placed below the stats strip */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <SignatureVisual isScanning={isScanning || isSemanticScanning} isCleaning={isDeleting} />
            </motion.div>
          </motion.div>
        )}

        {activeNav === 'dashboard' && scanResult && !isScanning && !isSemanticScanning && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Storage Overview</h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
              
              {/* Left Section: Charts & Filtered Results */}
              <div style={{ flex: '1 1 700px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
              
              {/* Chart 1: Space Analysis */}
              <TiltCard className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PieChart size={18} color="#8B5CF6"/> Space Analysis
                </h3>
                <div style={{ height: '260px', flexGrow: 1, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Wasted Space', value: scanResult.analytics.reclaimable_space_bytes },
                          { name: 'Unique Files', value: Math.max(0, (scanResult.analytics.total_files * 1024 * 1024) - scanResult.analytics.reclaimable_space_bytes) }
                        ]}
                        cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none"
                        onClick={(data) => setChartFilter({ type: 'space', value: data.name })}
                        style={{ cursor: 'pointer' }}
                      >
                        <Cell fill="url(#colorWasted)" />
                        <Cell fill="url(#colorUnique)" />
                      </Pie>
                      <defs>
                        <linearGradient id="colorWasted" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="5%" stopColor="#ff453a" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#ff453a" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="colorUnique" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="5%" stopColor="#5e6ad2" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#5e6ad2" stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <Tooltip formatter={(value) => `${(value / (1024 * 1024)).toFixed(2)} MB`} contentStyle={{ backgroundColor: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', color: 'white' }} itemStyle={{ color: 'white' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.9rem', color: 'var(--text-muted)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </TiltCard>

              {/* Chart 2: File Composition */}
              <TiltCard className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FolderTree size={18} color="#32d74b"/> File Composition
                </h3>
                <div style={{ height: '260px', flexGrow: 1, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scanResult.analytics.file_type_breakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/(1024*1024)).toFixed(0)}M`} />
                      <Tooltip formatter={(value) => `${(value / (1024 * 1024)).toFixed(2)} MB`} cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', color: 'white' }} />
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#32d74b" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#32d74b" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <Bar dataKey="value" fill="url(#colorBar)" radius={[4, 4, 0, 0]} barSize={32} onClick={(data) => setChartFilter({ type: 'composition', value: data.name })} style={{ cursor: 'pointer' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TiltCard>

              {/* Chart 3: Storage Hogs */}
              <TiltCard className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="#ffd60a"/> Storage Hogs
                </h3>
                <div className="custom-scrollbar" style={{ height: '260px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {(scanResult.analytics.top_large_files || []).map((file, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: idx * 0.1 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 214, 10, 0.15)', color: '#ffd60a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {idx + 1}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</span>
                            {(() => {
                              const timeTag = formatRelativeTime(file.mtime);
                              return <span style={{ background: timeTag.bg, color: timeTag.color, padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{timeTag.text}</span>;
                            })()}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
                          <span style={{ display: 'inline-block', marginTop: '0.2rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(157, 78, 221, 0.15)', color: '#d8b4fe', fontSize: '0.65rem', fontWeight: 500, width: 'fit-content' }}>
                            {getFlagReason(file)}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffd60a', marginLeft: '1rem', whiteSpace: 'nowrap' }}>
                        <AnimatedCounter value={file.size / (1024 * 1024)} decimals={1} suffix=" MB" />
                      </span>
                    </motion.div>
                  ))}
                  {(!scanResult.analytics.top_large_files || scanResult.analytics.top_large_files.length === 0) && (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No large files found.</div>
                  )}
                </div>
              </TiltCard>

              {/* Chart 4: Space Reclaimed Over Time */}
              <TiltCard className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} color="#32d74b"/> Space Reclaimed Over Time
                </h3>
                <div style={{ height: '260px', flexGrow: 1, position: 'relative' }}>
                  {historicalReclaimedData.length < 3 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                      <div style={{ textAlign: 'center', maxWidth: '80%' }}>Run a few more scans to see your progress over time</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalReclaimedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}M`} />
                        <Tooltip formatter={(value) => `${value} MB`} cursor={{stroke: 'rgba(255,255,255,0.1)'}} contentStyle={{ backgroundColor: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', color: 'white' }} />
                        <defs>
                          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#32d74b" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#32d74b" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="mbReclaimed" stroke="#32d74b" strokeWidth={3} fillOpacity={1} fill="url(#colorArea)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </TiltCard>
                </div>

                {chartFilter && (
                  <div className="fade-in glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Filtered Results: <span style={{ color: 'var(--brand-primary)' }}>{chartFilter.value}</span>
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => {
                      const newSelection = new Set(selectedFiles);
                      filteredFiles.forEach(f => newSelection.add(f.path));
                      setSelectedFiles(newSelection);
                    }}>
                      Select All
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(255, 69, 58, 0.15)', color: '#ff453a' }} onClick={() => setChartFilter(null)}>
                      Clear filter ✕
                    </button>
                  </div>
                </div>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <ul className="file-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {filteredFiles.slice(0, 100).map((f, i) => <FileItem key={i} f={f} />)}
                  </ul>
                  {filteredFiles.length > 100 && <div style={{textAlign:'center', padding:'1rem', color:'var(--text-muted)'}}>Showing first 100 of {filteredFiles.length} files...</div>}
                  {filteredFiles.length === 0 && <div style={{textAlign:'center', padding:'1rem', color:'var(--text-muted)'}}>No files found for this category.</div>}
                </div>
                  </div>
                )}
              </div>

              {/* Right Section: Vertical Stats Column */}
              <div style={{ flex: '1 1 250px', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <TiltCard className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem', background: 'rgba(20,20,20,0.4)', border: '1px solid rgba(255, 69, 58, 0.3)' }}>
                <h3 style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem'}}>Reclaimable Wasted</h3>
                <p className="stat-value highlight" style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #ff453a, #ff9f0a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  <AnimatedCounter value={scanResult.analytics.reclaimable_space_bytes / (1024 * 1024)} decimals={1} suffix={<span style={{fontSize: '1rem', marginLeft: '4px'}}>MB</span>} />
                </p>
              </TiltCard>
              <TiltCard className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem', background: 'rgba(20,20,20,0.4)' }}>
                <h3 style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem'}}>Total Scanned Files</h3>
                <p className="stat-value" style={{ fontSize: '2.2rem', margin: 0 }}><AnimatedCounter value={scanResult.analytics.total_files} /></p>
              </TiltCard>
              <TiltCard className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem', background: 'rgba(20,20,20,0.4)' }}>
                <h3 style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem'}}>Exact Duplicates</h3>
                <p className="stat-value" style={{ fontSize: '2.2rem', margin: 0 }}><AnimatedCounter value={scanResult.analytics.duplicate_groups_count} /></p>
              </TiltCard>
              <TiltCard className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem', background: 'rgba(20,20,20,0.4)' }}>
                <h3 style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem'}}>Visual Duplicates</h3>
                <p className="stat-value" style={{ fontSize: '2.2rem', margin: 0 }}><AnimatedCounter value={scanResult.analytics.near_duplicate_groups_count} /></p>
              </TiltCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* History View */}
        {activeNav === 'history' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '2rem' }}>Recent Scans</h2>
            {scanHistory.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No scan history available yet. Run a scan to save it here!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {scanHistory.map((historyItem, idx) => (
                  <TiltCard key={historyItem.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{historyItem.date}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '0.25rem' }}>{historyItem.directory}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Found {historyItem.scanResult?.analytics?.duplicate_groups_count || 0} exact duplicate groups
                        {historyItem.semanticResult ? ' • Deep AI Scan included' : ''}
                      </div>
                    </div>
                    <button 
                      className="btn btn-magic"
                      onClick={() => {
                        setDirectory(historyItem.directory);
                        setScanResult(historyItem.scanResult);
                        setSemanticResult(historyItem.semanticResult);
                        setActiveNav('dashboard');
                        showToast(`Restored scan results for ${historyItem.directory}`);
                      }}
                    >
                      Restore Scan
                    </button>
                  </TiltCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review Duplicates View */}
        {activeNav === 'review' && scanResult && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Review & Clean</h2>
              <button className="btn btn-magic" onClick={handleAutoSelect}>
                <Wand2 size={16} /> Magic Auto-Select All
              </button>
            </div>
            
            {semanticResult && semanticResult.semantic_duplicates.length > 0 && (
              <div style={{marginBottom: '3rem'}}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9d4edd', marginBottom: '1.5rem'}}>
                  <Brain size={20} /> AI Conceptual Matches
                </h3>
                {semanticResult.semantic_duplicates.map((group, idx) => (
                  <DuplicateGroup key={idx} group={group} title={group.description} colorClass={{background: 'rgba(157, 78, 221, 0.2)', color: '#d8b4fe'}} borderColor="#9d4edd" initialDelay={idx} />
                ))}
              </div>
            )}

            {scanResult.near_duplicates.length > 0 && (
              <div style={{marginBottom: '3rem'}}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5e6ad2', marginBottom: '1.5rem'}}>
                  <ImageIcon size={20} /> Visually Similar Images
                </h3>
                {scanResult.near_duplicates.map((group, idx) => (
                  <DuplicateGroup key={idx} group={group} title={`Visual Group ${idx + 1}`} colorClass={{background: 'rgba(94, 106, 210, 0.2)', color: '#a5b4fc'}} borderColor="#5e6ad2" initialDelay={idx} />
                ))}
              </div>
            )}

            {scanResult.duplicates.length > 0 && (
              <div>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                  <FileText size={20} /> Exact Duplicates
                </h3>
                {scanResult.duplicates.map((group, idx) => (
                  <DuplicateGroup key={idx} group={group} title={`Hash: ${group.hash.substring(0, 8)}...`} colorClass={{}} borderColor="var(--border-light)" initialDelay={idx} />
                ))}
              </div>
            )}
            
            {scanResult.duplicates.length === 0 && scanResult.near_duplicates.length === 0 && (!semanticResult || semanticResult.semantic_duplicates.length === 0) && (
              <div style={{textAlign: 'center', padding: '4rem', opacity: 0.5}}>
                <CheckCircle size={48} style={{marginBottom: '1rem'}} />
                <p>No duplicates found! Your storage is clean.</p>
              </div>
            )}
          </div>
        )}

        {/* Feature Stubs */}
        {activeNav === 'trash' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2>Recently Deleted</h2>
              {recentlyDeleted.length > 0 && (
                <button 
                  className="btn btn-danger" 
                  onClick={async () => {
                    if (!window.confirm("Are you sure you want to permanently delete all these files?")) return;
                    try {
                      setIsDeleting(true);
                      const response = await fetch('http://127.0.0.1:5000/api/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ files: recentlyDeleted.map(f => f.path) }),
                      });
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || 'Delete failed');
                      setRecentlyDeleted([]);
                      showToast(`Permanently deleted ${data.deleted_count} files!`);
                    } catch (err) {
                      alert("Delete error: " + err.message);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete Now'}
                </button>
              )}
            </div>
            
            {recentlyDeleted.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No files staged for deletion.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentlyDeleted.map((file, idx) => {
                  const daysLeft = Math.max(0, 7 - Math.floor((Date.now() - file.deletedAt) / (1000 * 60 * 60 * 24)));
                  return (
                    <TiltCard key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--danger)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</span>
                          <span style={{ background: 'rgba(255, 69, 58, 0.15)', color: '#ff453a', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            Permanently deletes in {daysLeft} days
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{file.path}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button 
                        className="btn btn-ghost"
                        onClick={() => {
                          setRecentlyDeleted(prev => prev.filter(f => f.path !== file.path));
                          showToast("File restored. Rescan directory to see it in duplicates.");
                        }}
                      >
                        Restore
                      </button>
                    </TiltCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeNav === 'categorize' && (
          <div className="fade-in glass-panel" style={{textAlign: 'center', padding: '4rem 2rem'}}>
            <FolderTree size={48} color="var(--brand-primary)" style={{marginBottom: '1rem'}} />
            <h2>Smart Auto-Categorization</h2>
            <p style={{color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2rem auto'}}>
              Automatically sort loose files into organized directories based on extensions.
            </p>
            <button className="btn btn-primary" style={{margin: '0 auto'}} onClick={handleCategorizePreview} disabled={isCategorizing}>
              {isCategorizing ? 'Scanning...' : 'Preview Categorization'}
            </button>
            
            {categorizeResult && categorizeResult.moved_count > 0 && (
              <div className="fade-in" style={{textAlign: 'left', marginTop: '3rem', background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px'}}>
                <h3 style={{marginTop: 0}}>Categorization Results</h3>
                <p style={{color: 'var(--success)'}}>Successfully moved {categorizeResult.moved_count} files.</p>
                {Object.entries(categorizeResult.details).map(([folder, files]) => (
                  <div key={folder} style={{marginTop: '1.5rem'}}>
                    <h4 style={{color: 'var(--brand-primary)', marginBottom: '0.5rem'}}>📁 {folder} ({files.length} files)</h4>
                    <ul style={{color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '1.5rem', margin: 0, maxHeight: '200px', overflowY: 'auto'}}>
                      {files.map((f, i) => <li key={i} style={{marginBottom: '0.25rem'}}>{f}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            
            {categorizeResult && categorizeResult.moved_count === 0 && (
              <p className="fade-in" style={{marginTop: '2rem', color: 'var(--text-muted)'}}>No loose files found to categorize in this directory.</p>
            )}
          </div>
        )}
        
        {activeNav === 'zombies' && (
          <div className="fade-in glass-panel" style={{textAlign: 'center', padding: '4rem 2rem'}}>
            <Ghost size={48} color="var(--danger)" style={{marginBottom: '1rem'}} />
            <h2>Zombie File Detection</h2>
            <p style={{color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2rem auto'}}>
              Identify massive files (&gt;100MB) that haven't been opened in over a year.
            </p>
            {!zombies ? (
              <button className="btn btn-danger" style={{margin: '0 auto'}} onClick={handleZombies} disabled={isZombieScanning}>
                {isZombieScanning ? 'Scanning...' : 'Scan for Zombies'}
              </button>
            ) : (
              <div style={{textAlign: 'left', marginTop: '2rem'}}>
                <h3>Found {zombies.length} Zombie Files</h3>
                <ul className="file-list">
                  {zombies.map((f, i) => <FileItem key={i} f={f} />)}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeNav === 'prune' && (
          <div className="fade-in glass-panel" style={{textAlign: 'center', padding: '4rem 2rem'}}>
            <FolderMinus size={48} color="var(--text-muted)" style={{marginBottom: '1rem'}} />
            <h2>Prune Empty Folders</h2>
            <p style={{color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2rem auto'}}>
              Recursively scan and safely delete empty folders to clean up system debris.
            </p>
            <button className="btn btn-ghost" style={{margin: '0 auto'}} onClick={handlePrunePreview} disabled={isPruning}>
               {isPruning ? 'Scanning...' : 'Preview Prune'}
            </button>
          </div>
        )}

        {activeNav === 'cloud' && (
          <div className="fade-in glass-panel" style={{textAlign: 'center', padding: '4rem 2rem'}}>
            <Cloud size={48} color="#0ea5e9" style={{marginBottom: '1rem'}} />
            <h2>Connect Google Drive</h2>
            <p style={{color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2rem auto'}}>
              Run the exact same AI deduplication directly on your Cloud Storage.
            </p>
            <button className="btn btn-ghost" onClick={() => alert('Setup required: Place Google OAuth client_secret.json in the project root to authenticate.')}>
              Connect Account
            </button>
          </div>
        )}

      </main>

      {/* Floating Action Bar */}
      {selectedCount > 0 && (
        <div className="action-bar fade-in">
          <div style={{fontSize: '0.95rem', fontWeight: 500}}>
            Reclaim <span style={{color: 'var(--danger)', fontWeight: 'bold'}}><AnimatedCounter value={selectedSize / (1024 * 1024)} decimals={2} suffix=" MB" /></span>
          </div>
          <button className="btn btn-danger" onClick={() => setIsModalOpen(true)}>
            <Trash2 size={16} /> Delete Selected
          </button>
        </div>
      )}
      
      {/* Confirmation Modal for Deletion */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="game-overlay" onClick={() => setIsModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-panel" style={{maxWidth: '420px'}} onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255, 69, 58, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                  <AlertTriangle size={28} color="var(--danger)" />
                </div>
                <div>
                  <h3 style={{margin: 0, fontSize: '1.2rem', color: 'var(--text-main)'}}>Delete Selected Files?</h3>
                  <div style={{color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.2rem'}}>
                    Saving <AnimatedCounter value={selectedSize / (1024 * 1024)} decimals={2} suffix=" MB" /> of space
                  </div>
                </div>
              </div>
              <p style={{color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem 0'}}>
                You are about to move <strong>{selectedCount}</strong> files to the Recycle Bin. This action will permanently free up space on your drive. Do you wish to continue?
              </p>
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={isDeleting}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting} style={{minWidth: '130px'}}>
                  {isDeleting ? <><Loader size={16} className="spin-slow" style={{animationDuration: '1s'}}/> Deleting...</> : 'Yes, Clean Up'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categorization Preview Modal */}
      {categorizePlan && (
        <div className="game-overlay" onClick={() => setCategorizePlan(null)}>
          <div className="glass-panel fade-in" style={{maxWidth: '600px', width: '90%'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: 'var(--brand-primary)'}}>Preview File Moves</h3>
            <p style={{color: 'var(--text-muted)', fontSize: '0.95rem'}}>
              The following {categorizePlan.length} files will be organized into folders. Please approve this change.
            </p>
            <div style={{maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', margin: '1rem 0'}}>
              {categorizePlan.map((item, idx) => (
                <div key={idx} style={{marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                  <span style={{color: 'var(--text-muted)'}}>{item.file}</span>
                  <span style={{color: 'var(--text-main)', margin: '0 0.5rem'}}>→</span>
                  <span style={{color: 'var(--success)'}}>{item.category}</span>
                </div>
              ))}
            </div>
            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end'}}>
              <button className="btn btn-ghost" onClick={() => setCategorizePlan(null)} disabled={isCategorizing}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCategorizeExecute} disabled={isCategorizing}>
                {isCategorizing ? 'Executing...' : 'Approve & Move'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prune Preview Modal */}
      {prunePlan && (
        <div className="game-overlay" onClick={() => setPrunePlan(null)}>
          <div className="glass-panel fade-in" style={{maxWidth: '600px', width: '90%'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: 'var(--danger)'}}>Preview Folder Pruning</h3>
            <p style={{color: 'var(--text-muted)', fontSize: '0.95rem'}}>
              The following {prunePlan.length} empty folders will be permanently deleted. Please approve this change.
            </p>
            <div style={{maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', margin: '1rem 0'}}>
              {prunePlan.map((path, idx) => (
                <div key={idx} style={{marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                  🗑️ {path}
                </div>
              ))}
            </div>
            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end'}}>
              <button className="btn btn-ghost" onClick={() => setPrunePlan(null)} disabled={isPruning}>Cancel</button>
              <button className="btn btn-danger" onClick={handlePruneExecute} disabled={isPruning}>
                {isPruning ? 'Executing...' : 'Approve & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      <AnimatePresence>
        {renameTarget && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="game-overlay" onClick={() => setRenameTarget(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-panel" style={{maxWidth: '420px', width: '90%'}} onClick={e => e.stopPropagation()}
            >
              <h3 style={{marginTop: 0, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Sparkles size={20} /> Rename File
              </h3>
              <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', wordBreak: 'break-all'}}>
                {renameTarget.path}
              </p>
              
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="dir-input"
                style={{ width: '100%', marginBottom: '2rem' }}
                autoFocus
              />
              
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button className="btn btn-ghost" onClick={() => setRenameTarget(null)} disabled={isRenaming}>Cancel</button>
                <button className="btn btn-primary" onClick={handleRenameSubmit} disabled={isRenaming || !newName || newName === renameTarget.filename}>
                  {isRenaming ? <Loader size={16} className="spin-slow" /> : 'Rename File'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </>
  );
}


