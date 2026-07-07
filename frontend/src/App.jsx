import { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Copy, Settings, Trash2, Search, Brain, 
  ImageIcon, FileText, CheckCircle, FolderTree, Ghost, 
  Cloud, Sparkles, FolderMinus, Loader, AlertTriangle, ChevronDown, ChevronUp, Wand2
} from 'lucide-react';
import MemoryGame from './components/MemoryGame';
import FluidBackground from './components/FluidBackground';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [directory, setDirectory] = useState('');
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
  const [scanResult, setScanResult] = useState(null);
  const [semanticResult, setSemanticResult] = useState(null);
  const [error, setError] = useState('');
  
  // UX State
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  
  // Feature States
  const [zombies, setZombies] = useState(null);
  const [categorizeResult, setCategorizeResult] = useState(null);
  const [categorizePlan, setCategorizePlan] = useState(null);
  const [prunePlan, setPrunePlan] = useState(null);
  
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [isZombieScanning, setIsZombieScanning] = useState(false);

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
      
      const toSelect = new Set();
      data.duplicates.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
      data.near_duplicates.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
      setSelectedFiles(toSelect);
      
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
      
      const toSelect = new Set(selectedFiles);
      data.semantic_duplicates.forEach(group => group.files.slice(1).forEach(f => toSelect.add(f.path)));
      setSelectedFiles(toSelect);
      
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
    
    return { selectedSize: size, selectedCount: count };
  }, [selectedFiles, scanResult, semanticResult]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: Array.from(selectedFiles) }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed');
      
      setIsModalOpen(false);
      setToast(`Safely moved ${data.deleted_count} files to Recycle Bin! Reclaimed ${(data.reclaimed_space_bytes / (1024*1024)).toFixed(2)} MB.`);
      setTimeout(() => setToast(''), 5000);
      
      setSelectedFiles(new Set());
      handleScan();
    } catch (err) {
      alert("Delete error: " + err.message);
    } finally {
      setIsDeleting(false);
    }
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
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
             <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>{title}</h4>
             <span className="badge" style={{ ...colorClass, padding: '0.3rem 0.8rem' }}>
               {(group.redundant_space / (1024 * 1024)).toFixed(2)} MB
             </span>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
               {group.files.length - 1} redundant files
             </span>
          </div>
          <div style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: '0.5rem', display: 'flex' }}>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ul className="file-list" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {group.files.map((f, i) => <FileItem key={i} f={f} />)}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const FileItem = ({ f }) => {
    const isImg = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(f.extension?.toLowerCase());
    return (
      <li className="file-item">
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
        <div className="file-info" style={{marginLeft: '1rem', flex: 1}}>
          <span 
            className="filename" 
            style={{cursor: isImg ? 'pointer' : 'default', fontWeight: '500', color: isImg ? 'var(--text-main)' : 'var(--text-muted)'}} 
            onClick={() => isImg ? setPreviewFile(f) : null}
          >
            {f.filename}
          </span>
          <br/>
          <span className="filepath" style={{opacity: 0.5, fontSize: '0.8rem', color: 'var(--text-muted)'}}>{f.path}</span>
        </div>
        <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '1rem'}}>{(f.size / 1024).toFixed(1)} KB</span>
        <button className="btn btn-ghost" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}} onClick={() => showToast("AI Renaming coming soon!")}>
          <Sparkles size={14} style={{color: '#9d4edd'}} /> Rename
        </button>
      </li>
    );
  };

  return (
    <>
      <FluidBackground isActive={true} />
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
          <div className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveNav('dashboard')}>
            <LayoutDashboard size={18} /> <span>Dashboard</span>
          </div>
          <div className={`nav-item ${activeNav === 'review' ? 'active' : ''}`} onClick={() => setActiveNav('review')}>
            <Copy size={18} /> <span>Review Duplicates</span>
            {scanResult && <div style={{marginLeft: 'auto', background: 'var(--border-light)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem'}}>
              {scanResult.analytics.duplicate_groups_count + scanResult.analytics.near_duplicate_groups_count + (semanticResult ? semanticResult.semantic_duplicates.length : 0)}
            </div>}
          </div>
        </div>

        <div className="nav-section" style={{marginTop: '2rem'}}>Tools</div>
        <div className="nav-links">
          <div className={`nav-item ${activeNav === 'categorize' ? 'active' : ''}`} onClick={() => setActiveNav('categorize')}>
            <FolderTree size={18} /> <span>Auto-Categorize</span>
          </div>
          <div className={`nav-item ${activeNav === 'zombies' ? 'active' : ''}`} onClick={() => setActiveNav('zombies')}>
            <Ghost size={18} /> <span>Zombie Files</span>
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
        <div className="glass-panel" style={{marginBottom: '3rem'}}>
          <div className="scan-bar">
            <input 
              type="text" 
              placeholder="Enter directory (e.g. C:\\Users\\Username\\Downloads)" 
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              className="dir-input"
            />
            <button className="btn btn-primary" onClick={handleScan} disabled={isScanning || isSemanticScanning}>
              {isScanning ? <Loader size={18} className="spin-slow" style={{animationDuration: '1s'}} /> : <Search size={18} />}
              {isScanning ? 'Analyzing Files...' : 'Scan Path'}
            </button>
            <button className="btn btn-magic" onClick={handleSemanticScan} disabled={isScanning || isSemanticScanning || !scanResult}>
              {isSemanticScanning ? <Loader size={18} className="spin-slow" style={{animationDuration: '1s'}} /> : <Brain size={18} />}
              {isSemanticScanning ? 'Deep Scanning...' : 'Deep AI Scan'}
            </button>
          </div>
          {directory && defaultDir && directory === defaultDir && (
            <div style={{fontSize: '0.85rem', color: 'var(--text)', opacity: 0.7, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
              <Sparkles size={14} style={{color: 'var(--primary)'}} /> 
              <span>Auto-detected your system's default Downloads folder as the most common source of clutter.</span>
            </div>
          )}
          {error && <div style={{color: 'var(--danger)', marginTop: '1rem', fontWeight: 500}}>{error}</div>}
        </div>

        {/* Dashboard View */}
        {activeNav === 'dashboard' && scanResult && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Storage Overview</h2>
              {scanResult.analytics.reclaimable_space_bytes > 0 && (
                 <div className="badge" style={{background: 'rgba(255, 69, 58, 0.15)', color: 'var(--danger)', padding: '0.5rem 1rem', fontSize: '0.85rem'}}>
                    Clutter Detected
                 </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Left Column: Chart */}
              <div className="glass-panel" style={{ flex: '2', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 500 }}>Space Analysis</h3>
                <div style={{ height: '320px', flexGrow: 1, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Wasted Space', value: scanResult.analytics.reclaimable_space_bytes },
                          { name: 'Unique Files', value: Math.max(0, (scanResult.analytics.total_files * 1024 * 1024) - scanResult.analytics.reclaimable_space_bytes) }
                        ]}
                        cx="50%" cy="50%" innerRadius={90} outerRadius={125} paddingAngle={4} dataKey="value" stroke="none"
                      >
                        <Cell fill="var(--danger)" />
                        <Cell fill="var(--brand-primary)" />
                      </Pie>
                      <Tooltip formatter={(value) => `${(value / (1024 * 1024)).toFixed(2)} MB`} contentStyle={{ backgroundColor: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', color: 'white' }} itemStyle={{ color: 'white' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.9rem', color: 'var(--text-muted)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Stats Grid */}
              <div style={{ flex: '1', minWidth: '300px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem', alignContent: 'start' }}>
                <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(20,20,20,0.4)' }}>
                  <h3 style={{fontSize: '0.8rem'}}>Reclaimable</h3>
                  <p className="stat-value highlight" style={{ fontSize: '1.8rem' }}>
                    {(scanResult.analytics.reclaimable_space_bytes / (1024 * 1024)).toFixed(1)}<span style={{fontSize: '0.9rem', marginLeft: '4px'}}>MB</span>
                  </p>
                </div>
                <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(20,20,20,0.4)' }}>
                  <h3 style={{fontSize: '0.8rem'}}>Total Files</h3>
                  <p className="stat-value" style={{ fontSize: '1.8rem' }}>{scanResult.analytics.total_files.toLocaleString()}</p>
                </div>
                <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(20,20,20,0.4)' }}>
                  <h3 style={{fontSize: '0.8rem'}}>Exact Dupes</h3>
                  <p className="stat-value" style={{ fontSize: '1.8rem' }}>{scanResult.analytics.duplicate_groups_count}</p>
                </div>
                <div className="stat-card" style={{ padding: '1.5rem', background: 'rgba(20,20,20,0.4)' }}>
                  <h3 style={{fontSize: '0.8rem'}}>Visual Dupes</h3>
                  <p className="stat-value" style={{ fontSize: '1.8rem' }}>{scanResult.analytics.near_duplicate_groups_count}</p>
                </div>
              </div>
            </div>
          </motion.div>
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
            Reclaim <span style={{color: 'var(--danger)', fontWeight: 'bold'}}>{(selectedSize / (1024 * 1024)).toFixed(2)} MB</span>
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
                    Saving {(selectedSize / (1024 * 1024)).toFixed(2)} MB of space
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

    </div>
    </>
  );
}

export default App;
