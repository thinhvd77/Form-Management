import React, { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './AdminPage.css';
import { orgData, findNameById } from '../../data/orgData';
import { makeKey, upsertTemplate, listTemplates, removeTemplate } from '../../services/formTemplates';
import { TemplatesAPI } from '../../services/api';

// Thay thế hàm parseWorkbookToJSON cũ trong file AdminPage.js của bạn bằng hàm này
// Thay thế toàn bộ hàm parseWorkbookToJSON cũ bằng phiên bản hoàn chỉnh này
function parseWorkbookToJSON(workbook) {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) return { headers: [], rows: [], meta: {} };

    const normalize = (s) => String(s ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    // --- BƯỚC 1: Xây dựng Grid chứa đầy đủ thông tin ô (value và style) ---
    const usedRef = worksheet['!ref'];
    const usedRange = usedRef ? XLSX.utils.decode_range(usedRef) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    const grid = Array.from({ length: usedRange.e.r + 1 }, () => []);

    for (let R = usedRange.s.r; R <= usedRange.e.r; R++) {
        for (let C = usedRange.s.c; C <= usedRange.e.c; C++) {
            grid[R][C] = worksheet[XLSX.utils.encode_cell({ r: R, c: C })] || null;
        }
    }

    const merges = worksheet['!merges'] || [];
    for (const m of merges) {
        const topLeftCell = grid[m.s.r][m.s.c];
        for (let R = m.s.r; R <= m.e.r; R++) {
            for (let C = m.s.c; C <= m.e.c; C++) {
                grid[R][C] = topLeftCell;
            }
        }
    }

    // --- BƯỚC 2: Dò tìm dòng và các cột tiêu đề quan trọng ---
    const targets = {
        stt: ['stt'],
        chiTieu: ['chi tieu', 'chỉ tiêu'],
        keHoach: ['ke hoach', 'kế hoạch'],
        thucHien: ['thuc hien', 'thực hiện'],
    };
    
    let headerColumns = { stt: -1, chiTieu: -1, keHoach: -1, thucHien: -1 };
    let effectiveHeaderRow = -1;

    for (let r = usedRange.s.r; r <= usedRange.e.r; r++) {
        const foundOnRow = { stt: -1, chiTieu: -1, keHoach: -1, thucHien: -1 };
        for (let c = usedRange.s.c; c <= usedRange.e.c; c++) {
            const cell = grid[r][c];
            const n = normalize(cell?.v);
            if (!n) continue;

            if (foundOnRow.stt === -1 && targets.stt.some(t => n.includes(t))) foundOnRow.stt = c;
            if (foundOnRow.chiTieu === -1 && targets.chiTieu.some(t => n.includes(t))) foundOnRow.chiTieu = c;
            if (foundOnRow.keHoach === -1 && targets.keHoach.some(t => n.includes(t))) foundOnRow.keHoach = c;
            if (foundOnRow.thucHien === -1 && targets.thucHien.some(t => n.includes(t))) foundOnRow.thucHien = c;
        }

        if (foundOnRow.stt !== -1 && foundOnRow.chiTieu !== -1) {
            headerColumns = foundOnRow;
            effectiveHeaderRow = r;
            break;
        }
    }

    // --- BƯỚC 3: Đọc dữ liệu và áp dụng logic in nghiêng ---
    if (effectiveHeaderRow !== -1) {
        const allColumnsIndices = Object.keys(grid[effectiveHeaderRow]).map(Number).filter(c => c >= usedRange.s.c && c <= usedRange.e.c);
        const headersOut = allColumnsIndices.map(c => String(grid[effectiveHeaderRow][c]?.v ?? ''));
        const rowsOut = [];

        for (let r = effectiveHeaderRow + 1; r <= usedRange.e.r; r++) {
            const sttCell = grid[r][headerColumns.stt];
            const sttVal = String(sttCell?.v ?? '').trim();
            if (sttVal === '') continue;

            const chiTieuCell = grid[r][headerColumns.chiTieu];
            const isChiTieuItalic = chiTieuCell?.s?.font?.italic === true;

            const rowData = allColumnsIndices.map(c => {
                const currentCell = grid[r][c];
                const value = currentCell?.v ?? '';
                const isInputCell = isChiTieuItalic && (c === headerColumns.keHoach || c === headerColumns.thucHien);
                
                return { value, isInput: isInputCell };
            });
            rowsOut.push(rowData);
        }

        return {
            headers: headersOut,
            rows: rowsOut,
            meta: { mode: 'column-mapping', headerRow: effectiveHeaderRow + 1, columns: headerColumns }
        };
    }
    
    // Fallback
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const [headers = [], ...rows] = data;
    const trimmedRows = rows.filter(r => r.some(cell => String(cell).trim() !== ''));
    return { headers, rows: trimmedRows.map(row => row.map(cell => ({ value: cell, isInput: false }))), meta: { mode: 'full-sheet' } };
}

function AdminPage() {
  const [fileName, setFileName] = useState('');
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
    if (!file) return;
    try {
      setFileName(file.name);
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array', cellStyles: true });
      const { headers, rows, meta } = parseWorkbookToJSON(wb);
      if (!headers.length) {
        setError('No headers found in the first row.');
      }
      setHeaders(headers);
      setRows(rows);
      if (meta?.mode === 'header-01') {
        setInfo(`Tiêu đề xác định theo quy tắc (cột 1='STT', cột 2 chứa 'Chỉ tiêu') tại hàng r=${meta.headerRow}, c=1..${meta.colEnd}.`);
      } else if (meta?.mode === 'column-mapping') {
        const skipNote = meta?.skippedTop ? ` (đã bỏ qua ${meta.skippedTop} hàng đầu)` : '';
        setInfo(`Đã dò và ánh xạ cột (STT c=${meta.columns?.stt}, Chỉ tiêu c=${meta.columns?.chiTieu}, Điểm chuẩn c=${meta.columns?.diemChuan}), tiêu đề tại hàng r=${meta.headerRow}${skipNote}.`);
      } else if (meta?.mode === 'header-detected') {
        const skipNote = meta?.skippedTop ? ` (đã bỏ qua ${meta.skippedTop} hàng đầu)` : '';
        setInfo(`Hiển thị từ hàng tiêu đề (r=${meta.headerRow}, c=${meta.colStart}..${meta.colEnd})${skipNote}.`);
      } else if (meta?.mode === 'named-range') {
        setInfo(`Đang hiển thị vùng đặt tên FORM: ${meta.range}`);
      } else {
        setInfo('Không tìm thấy tiêu đề hoặc vùng FORM. Hiển thị toàn bộ sheet.');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to parse the Excel file. Please check the format.');
    }
  };

  const previewRows = useMemo(() => rows.slice(0, 20), [rows]);

  const departments = useMemo(() => (branchId ? orgData.departments[branchId] || [] : []), [branchId]);
  const positions = useMemo(() => (departmentId ? orgData.positions[departmentId] || [] : []), [departmentId]);

  const canSave = branchId && departmentId && positionId && rows.length > 0;

  const handleSaveGroup = async () => {
    if (!canSave) return;
    const key = makeKey(branchId, departmentId, positionId);
    const payload = { branchId, departmentId, positionId, headers, rows, sourceFile: fileName, key };
    try {
      await TemplatesAPI.upsert(payload);
      const res = await TemplatesAPI.list();
      setTemplates(res.items || []);
    } catch {
      upsertTemplate(key, payload);
      setTemplates(listTemplates());
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

  const canBulkAssign = rows.length > 0 && selectedKeys.size > 0;

  const handleBulkAssign = async () => {
    if (!canBulkAssign) return;
    const keys = Array.from(selectedKeys);
    try {
      await TemplatesAPI.bulk({ keys, headers, rows, sourceFile: fileName });
      const res = await TemplatesAPI.list();
      setTemplates(res.items || []);
    } catch {
      keys.forEach(key => {
        const [bId, dId, pId] = key.split('|');
        upsertTemplate(key, { branchId: bId, departmentId: dId, positionId: pId, headers, rows, sourceFile: fileName });
      });
      setTemplates(listTemplates());
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h1>Admin: Import Excel & Preview</h1>
        <p className="muted">Upload an .xlsx or .xls file. First row should be column headers.</p>

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
          <button className="btn btn-primary" disabled={!canSave} onClick={handleSaveGroup}>Lưu nhóm form</button>
        </div>

        {/* Bulk select list of all combinations */}
        <div className="combos">
          <div className="combos-header">
            <h2>Chọn nhóm dùng chung 1 form</h2>
            <div className="combo-actions">
              <button className="btn" onClick={toggleSelectAll}>{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button>
              <button className="btn" onClick={clearSelection}>Xóa lựa chọn</button>
              <button className="btn btn-primary" disabled={!canBulkAssign} onClick={handleBulkAssign}>Gán form cho nhóm đã chọn</button>
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
                      if (cellData && typeof cellData === 'object' && Object.prototype.hasOwnProperty.call(cellData, 'value')) {
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
