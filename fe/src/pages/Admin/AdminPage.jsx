import React, { useMemo, useState, useEffect } from 'react';
import './AdminPage.css';
import { orgData, findNameById } from '../../data/orgData';
import { makeKey, listTemplates, removeTemplate } from '../../services/formTemplates';
import { TemplatesAPI } from '../../services/api';

function AdminPage() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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

  const departments = useMemo(() => (branchId ? orgData.departments[branchId] || [] : []), [branchId]);
  const positions = useMemo(() => (departmentId ? orgData.positions[departmentId] || [] : []), [departmentId]);

  const canSave = !!file && branchId && departmentId && positionId;
  const canBulkAssign = !!file && selectedKeys.size > 0;

  const onFileChange = (f) => {
    setError('');
    setInfo('');
    setFile(f || null);
    setFileName(f ? f.name : '');
  };

  const refreshTemplates = async () => {
    try {
      const res = await TemplatesAPI.list();
      setTemplates(res.items || []);
    } catch {
      setTemplates(listTemplates());
    }
  };

  const handleSaveGroup = async () => {
    if (!canSave) return;
    setError('');
    setInfo('');
    try {
      await TemplatesAPI.importExcel({ file, branchId, departmentId, positionId });
      await refreshTemplates();
      setInfo('Đã import file, xử lý và lưu form vào backend thành công.');
      // Clear only file selection if bạn muốn
      // setFile(null); setFileName('');
    } catch (e) {
      setError(e.message || 'Import thất bại.');
    }
  };

  const handleBulkAssign = async () => {
    if (!canBulkAssign) return;
    setError('');
    setInfo('');
    try {
      const keys = Array.from(selectedKeys);
      await TemplatesAPI.importExcelBulk({ file, keys });
      await refreshTemplates();
      setInfo(`Đã import và gán form cho ${keys.length} nhóm.`);
    } catch (e) {
      setError(e.message || 'Bulk import thất bại.');
    }
  };

  const onRemove = async (key) => {
    try {
      await TemplatesAPI.remove(key);
      await refreshTemplates();
    } catch {
      // local fallback
      removeTemplate(key);
      setTemplates(listTemplates());
    }
  };

  const existingKeys = useMemo(() => new Set(templates.map(t => t.key)), [templates]);

  // Build all combinations
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
    if (allSelected) next.clear();
    else combos.forEach(c => next.add(c.key));
    setSelectedKeys(next);
  };
  const toggleOne = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedKeys(next);
  };
  const clearSelection = () => setSelectedKeys(new Set());

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h1>Admin: Import Excel & Gán nhóm</h1>
        <p className="muted">Upload file .xlsx/.xls. Backend sẽ xử lý file và lưu form.</p>

        <div className="upload">
          <label htmlFor="excel-input" className="btn btn-primary">Choose Excel</label>
          <input
            id="excel-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => onFileChange(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
          {fileName && <span className="file-name">{fileName}</span>}
        </div>

        {error && <div className="alert error">{error}</div>}
        {info && !error && <div className="alert note">{info}</div>}

        {/* Chọn nhóm đơn để lưu */}
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
          <button className="btn btn-primary" disabled={!canSave} onClick={handleSaveGroup}>Import & Lưu nhóm</button>
        </div>

        {/* Bulk select list */}
        <div className="combos">
          <div className="combos-header">
            <h2>Chọn nhóm dùng chung 1 file</h2>
            <div className="combo-actions">
              <button className="btn" onClick={toggleSelectAll}>{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button>
              <button className="btn" onClick={clearSelection}>Xóa lựa chọn</button>
              <button className="btn btn-primary" disabled={!canBulkAssign} onClick={handleBulkAssign}>Import & Gán cho nhóm đã chọn</button>
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

        {/* Danh sách nhóm đã lưu */}
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