import { useState, useMemo } from 'react';
import { 
  FolderSearch, LayoutDashboard, Copy, Settings, 
  Trash2, Search, Brain, Image as ImageIcon, FileText, CheckCircle 
} from 'lucide-react';
import MemoryGame from './components/MemoryGame';

function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [directory, setDirectory] = useState('C:\\Users\\swast\\Downloads');
  
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

  const handleSemanticScan = async () => {
    if (!directory) return;
    setIsSemanticScanning(true); // Triggers Memory Game Overlay
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
      setIsSemanticScanning(false); // Closes Memory Game Overlay
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

  // --------------------------------------------------------
  // REUSABLE COMPONENTS
  // --------------------------------------------------------
  const FileItem = ({ f }) => {
    const isImg = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(f.extension?.toLowerCase());
    return (
      <li className="file-item">
        <input 
          type="checkbox" 
          checked={selectedFiles.has(f.path)} 
          onChange={() => toggleSelection(f.path)}
          style={{width: '18px', height: '18px', cursor: 'pointer', margin: 0}}
        />
        {isImg && (
          <img 
            src={`http://127.0.0.1:5000/api/file?path=${encodeURIComponent(f.path)}`} 
            alt={f.filename} 
            style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', marginLeft: '1rem', cursor: 'pointer'}} 
            onClick={() => setPreviewFile(f)}
          />
        )}
        <div className="file-info" style={{marginLeft: '1rem', flex: 1}}>
          <span 
            className="filename" 
            style={{cursor: isImg ? 'pointer' : 'default', fontWeight: '500', color: isImg ? 'var(--text-color)' : '#ddd'}} 
            onClick={() => isImg ? setPreviewFile(f) : null}
          >
            {f.filename}
          </span>
          <br/>
          <span className="filepath" style={{opacity: 0.5, fontSize: '0.8rem'}}>{f.path}</span>
        </div>
        <span style={{fontSize: '0.85rem', color: '#888', marginRight: '1rem'}}>{(f.size / 1024).toFixed(1)} KB</span>
        {isImg && (
          <button className="btn btn-ghost" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}} onClick={() => setPreviewFile(f)}>
            View
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="app-layout fade-in">
      
      {/* Toast */}
      {toast && (
        <div style={{position: 'fixed', top: 20, right: 20, background: 'var(--success-color)', color: 'white', padding: '1rem 2rem', borderRadius: 8, zIndex: 1000}} className="fade-in">
          {toast}
        </div>
      )}

      {/* Memory Game Loading Overlay */}
      {isSemanticScanning && (
        <div className="game-overlay fade-in">
          <MemoryGame />
        </div>
      )}

      {/* Lightbox */}
      {previewFile && (
        <div className="game-overlay" onClick={() => setPreviewFile(null)}>
          <div className="fade-in" style={{position: 'relative', maxWidth: '90vw', maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
            <img 
              src={`http://127.0.0.1:5000/api/file?path=${encodeURIComponent(previewFile.path)}`} 
              alt={previewFile.filename}
              style={{maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'}}
            />
            <button 
              onClick={() => setPreviewFile(null)}
              style={{position: 'absolute', top: '-15px', right: '-15px', background: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Brain color="#a855f7" size={28} />
          <h1>Declutter.IQ</h1>
        </div>
        <div className="nav-links">
          <div className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveNav('dashboard')}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          <div className={`nav-item ${activeNav === 'review' ? 'active' : ''}`} onClick={() => setActiveNav('review')}>
            <Copy size={20} />
            <span>Review Duplicates</span>
            {scanResult && <div style={{marginLeft: 'auto', background: 'var(--accent-color)', color: 'white', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem'}}>
              {scanResult.analytics.duplicate_groups_count + scanResult.analytics.near_duplicate_groups_count + (semanticResult ? semanticResult.semantic_duplicates.length : 0)}
            </div>}
          </div>
          <div className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={() => setActiveNav('settings')}>
            <Settings size={20} />
            <span>Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="glass-panel" style={{marginBottom: '2rem'}}>
          <div className="scan-bar">
            <input 
              type="text" 
              placeholder="Enter directory (e.g. C:\Users\swast\Downloads)" 
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              className="dir-input"
            />
            <button className="btn btn-primary" onClick={handleScan} disabled={isScanning || isSemanticScanning}>
              <Search size={18} />
              {isScanning ? 'Scanning...' : 'Scan Now'}
            </button>
            <button className="btn btn-magic" onClick={handleSemanticScan} disabled={isScanning || isSemanticScanning || !scanResult}>
              <Brain size={18} />
              Deep AI Scan
            </button>
          </div>
          {error && <div style={{color: 'var(--danger-color)', marginTop: '1rem'}}>{error}</div>}
        </div>

        {/* Dashboard View */}
        {activeNav === 'dashboard' && scanResult && (
          <div className="fade-in">
            <h2 style={{fontWeight: 600, margin: '0 0 1.5rem 0'}}>Storage Overview</h2>
            <div className="stat-grid">
              <div className="stat-card">
                <h3>Total Files Scanned</h3>
                <p className="stat-value">{scanResult.analytics.total_files.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <h3>Max Reclaimable</h3>
                <p className="stat-value highlight">
                  {(scanResult.analytics.reclaimable_space_bytes / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="stat-card">
                <h3>Exact Duplicates</h3>
                <p className="stat-value">{scanResult.analytics.duplicate_groups_count}</p>
              </div>
              <div className="stat-card">
                <h3>Visual Matches</h3>
                <p className="stat-value">{scanResult.analytics.near_duplicate_groups_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* Review Duplicates View */}
        {activeNav === 'review' && scanResult && (
          <div className="fade-in">
            <h2 style={{fontWeight: 600, margin: '0 0 1.5rem 0'}}>Review & Clean</h2>
            
            {/* AI Semantic Matches */}
            {semanticResult && semanticResult.semantic_duplicates.length > 0 && (
              <div style={{marginBottom: '3rem'}}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ec4899'}}>
                  <Brain size={20} /> AI Conceptual Matches
                </h3>
                {semanticResult.semantic_duplicates.map((group, idx) => (
                  <div key={idx} className="duplicate-group" style={{borderLeft: '3px solid #ec4899'}}>
                    <div className="group-header">
                      <h4>{group.description}</h4>
                      <span className="badge" style={{background: 'rgba(236, 72, 153, 0.2)', color: '#fbcfe8'}}>
                        {(group.redundant_space / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <ul className="file-list">
                      {group.files.map((f, i) => <FileItem key={i} f={f} />)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Visual Matches */}
            {scanResult.near_duplicates.length > 0 && (
              <div style={{marginBottom: '3rem'}}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6'}}>
                  <ImageIcon size={20} /> Visually Similar Images
                </h3>
                {scanResult.near_duplicates.map((group, idx) => (
                  <div key={idx} className="duplicate-group" style={{borderLeft: '3px solid #8b5cf6'}}>
                    <div className="group-header">
                      <h4>Visual Group {idx + 1}</h4>
                      <span className="badge">{(group.redundant_space / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <ul className="file-list">
                      {group.files.map((f, i) => <FileItem key={i} f={f} />)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Exact Matches */}
            {scanResult.duplicates.length > 0 && (
              <div>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a1a1aa'}}>
                  <FileText size={20} /> Exact Duplicates
                </h3>
                {scanResult.duplicates.map((group, idx) => (
                  <div key={idx} className="duplicate-group">
                    <div className="group-header">
                      <h4 style={{color: '#a1a1aa'}}>Hash: {group.hash.substring(0, 8)}...</h4>
                      <span className="badge" style={{background: 'rgba(255,255,255,0.1)', color: '#d4d4d8'}}>
                        {(group.redundant_space / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <ul className="file-list">
                      {group.files.map((f, i) => <FileItem key={i} f={f} />)}
                    </ul>
                  </div>
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
      </main>

      {/* Floating Action Bar */}
      {selectedCount > 0 && (
        <div className="action-bar fade-in">
          <div style={{fontSize: '0.95rem'}}>
            Reclaim <span style={{color: '#fca5a5', fontWeight: 'bold'}}>{(selectedSize / (1024 * 1024)).toFixed(2)} MB</span> from {selectedCount} files
          </div>
          <button className="btn btn-primary" style={{backgroundColor: 'var(--danger-color)', padding: '0.6rem 1.2rem'}} onClick={() => setIsModalOpen(true)}>
            <Trash2 size={16} /> Delete Selected
          </button>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="game-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel fade-in" style={{maxWidth: '400px', background: 'var(--sidebar-bg)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: 'var(--danger-color)'}}>Confirm Deletion</h3>
            <p style={{color: '#a1a1aa', fontSize: '0.95rem', lineHeight: 1.5}}>
              You are about to move {selectedCount} files to the Windows Recycle Bin. Are you sure you want to proceed?
            </p>
            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end'}}>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={isDeleting}>Cancel</button>
              <button className="btn btn-primary" style={{backgroundColor: 'var(--danger-color)'}} onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Moving...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
