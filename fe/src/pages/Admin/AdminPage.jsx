import React, { useMemo, useState, useEffect } from 'react';
import './AdminPage.css';
import { orgData, findNameById } from '../../data/orgData';
import { makeKey, upsertTemplate, listTemplates, removeTemplate } from '../../services/formTemplates';
import { TemplatesAPI } from '../../services/api';

function AdminPage() {
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await TemplatesAPI.list();
        setTemplates(res.items || []);
      } catch {
        setTemplates(listTemplates());
      }
    })();
  }, []);

  const hasData = headers.length > 0 && rows.length > 0;

  const handleFile = async (file) => {
    setError('');
    setInfo('');
    setHeaders([]);
    setRows([]);
    setSelectedFile(null);
    if (!file) return;
    
    setFileName(file.name);
    setSelectedFile(file);
    setInfo('File selected. Choose a group and click "Import & Save" to upload and parse on server.');
  };

  const previewRows = useMemo(() => rows.slice(0, 20), [rows]);

  const departments = useMemo(() => (branchId ? orgData.departments[branchId] || [] : []), [branchId]);
  const positions = useMemo(() => (departmentId ? orgData.positions[departmentId] || [] : []), [departmentId]);

  const canSave = branchId && departmentId && positionId && selectedFile;

  const handleSaveGroup = async () => {
    if (!canSave) return;
    setError('');
    setInfo('Uploading and parsing Excel file...');
    
    try {
      const result = await TemplatesAPI.importExcel(selectedFile, branchId, departmentId, positionId);
      setHeaders(result.headers || []);
      setRows(result.rows || []);
      setInfo(`Successfully imported Excel file! Parsed ${result.rows?.length || 0} rows.`);
      
      // Refresh templates list
      const res = await TemplatesAPI.list();
      setTemplates(res.items || []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to import Excel file');
      setInfo('');
    }
  };

  const onRemove = async (key) => {
    try {
      await TemplatesAPI.remove(key);
      const res = await TemplatesAPI.list();
      setTemplates(res.items || []);
    } catch {
      removeTemplate(key);
      setTemplates(listTemplates());
    }
  };

  const existingKeys = useMemo(() => new Set(templates.map(t => t.key)), [templates]);

  // Build all combinations of branch -> department -> position
  const combos = useMemo(() => {
    const items = [];
    for (const b of orgData.branches) {
      const deps = orgData.departments[b.id] || [];
      for (const d of deps) {
        const poss = orgData.positions[d.id] || [];
        for (const p of poss) {
          const key = makeKey(b.id, d.id, p.id);
          items.push({
            key,
            branchId: b.id,
            departmentId: d.id,
            positionId: p.id,
            label: `${b.name} / ${d.name} / ${p.name}`,
          });
        }
      }
    }
    return items;
  }, []);

  const allSelected = selectedKeys.size > 0 && selectedKeys.size === combos.length;
  const toggleSelectAll = () => {
    const next = new Set(selectedKeys);
    if (allSelected) {
      next.clear();
    } else {
      combos.forEach(c => next.add(c.key));
    }
    setSelectedKeys(next);
  };

  const toggleOne = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedKeys(next);
  };

  const clearSelection = () => setSelectedKeys(new Set());

  const canBulkAssign = selectedFile && selectedKeys.size > 0;

  const handleBulkAssign = async () => {
    if (!canBulkAssign) return;
    setError('');
    setInfo('Uploading and parsing Excel file for bulk assignment...');
    
    const keys = Array.from(selectedKeys);
    try {
      const result = await TemplatesAPI.importExcelBulk(selectedFile, keys);
      setHeaders(result.items?.[0]?.headers || []);
      setRows(result.items?.[0]?.rows || []);
      setInfo(`Successfully imported Excel file to ${result.items?.length || 0} groups! Parsed ${result.items?.[0]?.rows?.length || 0} rows.`);
      
      // Refresh templates list
      const res = await TemplatesAPI.list();
      setTemplates(res.items || []);
      
      // Clear selection after successful bulk assign
      setSelectedKeys(new Set());
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to bulk import Excel file');
      setInfo('');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h1>Admin: Import Excel & Preview</h1>
        <p className="muted">Upload an .xlsx or .xls file. The backend will parse it with style-aware detection and save to database.</p>

        <div className="upload">
          <label htmlFor="excel-input" className="btn btn-primary">Choose Excel</label>
          <input
            id="excel-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
          {fileName && <span className="file-name">{fileName}</span>}
        </div>

  {error && <div className="alert error">{error}</div>}
  {info && !error && <div className="alert note">{info}</div>}

  {/* Selectors to bind this Excel to a single org group (optional) */}
        <div className="selectors">
          <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setDepartmentId(''); setPositionId(''); }} className="picker">
            <option value="">-- Chọn Chi nhánh --</option>
            {orgData.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPositionId(''); }} className="picker" disabled={!branchId}>
            <option value="">-- Chọn Phòng ban --</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={positionId} onChange={(e) => setPositionId(e.target.value)} className="picker" disabled={!departmentId}>
            <option value="">-- Chọn Chức vụ --</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!canSave} onClick={handleSaveGroup}>Import & Save</button>
        </div>

        {/* Bulk select list of all combinations */}
        <div className="combos">
          <div className="combos-header">
            <h2>Chọn nhóm dùng chung 1 form</h2>
            <div className="combo-actions">
              <button className="btn" onClick={toggleSelectAll}>{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button>
              <button className="btn" onClick={clearSelection}>Xóa lựa chọn</button>
              <button className="btn btn-primary" disabled={!canBulkAssign} onClick={handleBulkAssign}>Import & Assign to Selected Groups</button>
            </div>
          </div>
          <div className="combo-list">
            {combos.map(c => (
              <label key={c.key} className={`combo-item ${existingKeys.has(c.key) ? 'assigned' : ''}`}>
                <input type="checkbox" checked={selectedKeys.has(c.key)} onChange={() => toggleOne(c.key)} />
                <span className="combo-label">{c.label}</span>
                {existingKeys.has(c.key) && <span className="badge">Đã gán</span>}
              </label>
            ))}
          </div>
        </div>

        {hasData ? (
          <div className="table-wrap">
            <div className="table-meta">
              <span>{rows.length.toLocaleString()} rows</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i}>{String(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, ridx) => (
                  <tr key={ridx}>
                    {headers.map((_, cidx) => {
                      const cellData = r[cidx];
                      
                      // Handle new object structure
                      if (cellData && typeof cellData === 'object' && cellData.hasOwnProperty('value')) {
                        return (
                          <td key={cidx} className={cellData.isInput ? 'input-cell' : ''}>
                            {cellData.isInput ? (
                              <input 
                                type="text" 
                                className="cell-input" 
                                defaultValue={cellData.value || ''} 
                                placeholder="Nhập giá trị..."
                              />
                            ) : (
                              cellData.value ?? ''
                            )}
                          </td>
                        );
                      }
                      
                      // Fallback for old format - ensure we don't render objects
                      const displayValue = typeof cellData === 'object' && cellData !== null 
                        ? (cellData.value ?? '') 
                        : (cellData ?? '');
                      return <td key={cidx}>{displayValue}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > previewRows.length && (
              <div className="muted more-note">
                Showing first {previewRows.length} rows. Total {rows.length} rows loaded.
              </div>
            )}
          </div>
        ) : (
          <div className="empty">
            <p>No data yet. Upload an Excel file to preview.</p>
          </div>
        )}

        {/* Existing groups */}
        <div className="groups">
          <h2>Nhóm form đã tạo</h2>
          {templates.length === 0 ? (
            <p className="muted">Chưa có nhóm form nào.</p>
          ) : (
            <div className="group-list">
              {templates.map(t => (
                <div className="group-item" key={t.key}>
                  <div className="group-info">
                    <div className="group-title">
                      {findNameById(orgData.branches, t.branchId)} / {findNameById(orgData.departments[t.branchId] || [], t.departmentId)} / {findNameById(orgData.positions[t.departmentId] || [], t.positionId)}
                    </div>
                    <div className="group-sub">{t.rows?.length || 0} dòng • {t.sourceFile || 'N/A'}</div>
                  </div>
                  <div className="group-actions">
                    <button className="btn" onClick={() => onRemove(t.key)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
