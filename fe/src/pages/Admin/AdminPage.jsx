import React, { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './AdminPage.css';
import { orgData, findNameById } from '../../data/orgData';
import { makeKey, upsertTemplate, listTemplates, removeTemplate } from '../../services/formTemplates';
import { TemplatesAPI } from '../../services/api';

// Thay thế hàm parseWorkbookToJSON cũ trong file AdminPage.js của bạn bằng hàm này
function parseWorkbookToJSON(workbook) {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) return { headers: [], rows: [], meta: { mode: 'error', message: 'Sheet không tồn tại' } };

    // --- BƯỚC 1: CHUẨN BỊ DỮ LIỆU GRID VÀ MERGED CELLS (Giữ nguyên logic gốc của bạn) ---
    const normalize = (s) => String(s ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    const usedRef = worksheet['!ref'];
    const usedRange = usedRef ? XLSX.utils.decode_range(usedRef) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    const rowCount = usedRange.e.r - usedRange.s.r + 1;
    const colCount = usedRange.e.c - usedRange.s.c + 1;
    const grid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ''));
    
    // NEW: Store cell formatting information
    const styleGrid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => null));

    for (let R = usedRange.s.r; R <= usedRange.e.r; R++) {
        for (let C = usedRange.s.c; C <= usedRange.e.c; C++) {
            const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellAddr];
            const gridR = R - usedRange.s.r;
            const gridC = C - usedRange.s.c;
            
            grid[gridR][gridC] = cell ? cell.v : '';
            
            // NEW: Store cell style information
            if (cell && cell.s) {
                styleGrid[gridR][gridC] = cell.s;
            }
        }
    }

    const merges = worksheet['!merges'] || [];
    for (const m of merges) {
        const topLeft = worksheet[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })];
        const val = topLeft ? topLeft.v : '';
        const style = topLeft ? topLeft.s : null;
        
        for (let R = m.s.r; R <= m.e.r; R++) {
            for (let C = m.s.c; C <= m.e.c; C++) {
                const gridR = R - usedRange.s.r;
                const gridC = C - usedRange.s.c;
                grid[gridR][gridC] = val;
                styleGrid[gridR][gridC] = style;
            }
        }
    }

    // --- RULE: A header row is where column 0 == 'STT' and column 1 contains 'Chỉ tiêu' ---
    for (let r = 0; r < rowCount; r++) {
        const c0 = normalize(grid[r][0]);
        const c1 = normalize(grid[r][1]);
        if (c0 === 'stt' && (c1 === 'chi tieu' || c1.includes('chi tieu'))) {
            // Use bottom row of merged header block (to avoid duplicating header on the next row)
            const findMergeBottomRow = (absR, absC) => {
                for (const m of merges) {
                    if (absR >= m.s.r && absR <= m.e.r && absC >= m.s.c && absC <= m.e.c) return m.e.r;
                }
                return absR;
            };
            const absR = usedRange.s.r + r;
            const bottomR0 = findMergeBottomRow(absR, usedRange.s.c + 0);
            const bottomR1 = findMergeBottomRow(absR, usedRange.s.c + 1);
            const effHeaderRel = Math.max(bottomR0, bottomR1) - usedRange.s.r;

            // find right-most used column scanning from the effective header row downward
            let cEnd = 0;
            for (let rr = effHeaderRel; rr < rowCount; rr++) {
                for (let cc = colCount - 1; cc >= 0; cc--) {
                    if (String(grid[rr][cc] ?? '').toString().trim() !== '') { cEnd = Math.max(cEnd, cc); break; }
                }
            }
            const headers = grid[effHeaderRel].slice(0, cEnd + 1);
            const rows = [];
            
            // Include row with "D" then stop
            for (let rowIdx = effHeaderRel + 1; rowIdx < grid.length; rowIdx++) {
                const row = grid[rowIdx].slice(0, cEnd + 1);
                const sttVal = String(row[0] ?? '').trim().toUpperCase();
                if (row.some(v => String(v).trim() !== '')) {
                    // Convert to object format for consistency
                    const objectRow = row.map(cell => ({ value: cell, isInput: false }));
                    rows.push(objectRow);
                }
                if (sttVal === 'D') break;
            }
            
            return { headers, rows, meta: { mode: 'header-01', headerRow: effHeaderRel + usedRange.s.r + 1, colStart: 1, colEnd: cEnd + 1 } };
        }
    }

    // --- BƯỚC 2: LOGIC DÒ TÌM HEADER ĐÃ ĐƯỢC SỬA LỖI ---
    const targets = {
        stt: ['stt'],
        chiTieu: ['chi tieu', 'chỉ tiêu'],
        diemChuan: ['diem chuan', 'điểm chuẩn']
    };
    
    let headerColumns = { stt: -1, chiTieu: -1, diemChuan: -1 };
    let effectiveHeaderRow = -1; 

    for (let r = 0; r < rowCount; r++) {
        const foundOnRow = { stt: -1, chiTieu: -1, diemChuan: -1 };
        
        for (let c = 0; c < colCount; c++) {
            const n = normalize(grid[r][c]);
            if (n === '') continue;

            // *** ĐÂY LÀ THAY ĐỔI QUAN TRỌNG: DÙNG 3 LỆNH IF RIÊNG BIỆT ***
            // Thay đổi này cho phép tìm tất cả các tiêu đề ngay cả khi chúng nằm trong cùng một ô (thường gặp ở file CSV)
            if (foundOnRow.stt === -1 && targets.stt.some(t => n.includes(t))) {
                foundOnRow.stt = c;
            }
            if (foundOnRow.chiTieu === -1 && targets.chiTieu.some(t => n.includes(t))) {
                foundOnRow.chiTieu = c;
            }
            if (foundOnRow.diemChuan === -1 && targets.diemChuan.some(t => n.includes(t))) {
                foundOnRow.diemChuan = c;
            }
        }
        
        // Kiểm tra xem đã tìm thấy đủ 3 header trên dòng này chưa
        if (foundOnRow.stt !== -1 && foundOnRow.chiTieu !== -1 && foundOnRow.diemChuan !== -1) {
            headerColumns = foundOnRow;
            const findMergeBottomRow = (absR, absC) => {
                for (const m of merges) {
                    if (absR >= m.s.r && absR <= m.e.r && absC >= m.s.c && absC <= m.e.c) {
                        return m.e.r;
                    }
                }
                return absR;
            };
            
            const absR = usedRange.s.r + r;
            const bottomR1 = findMergeBottomRow(absR, headerColumns.stt);
            const bottomR2 = findMergeBottomRow(absR, headerColumns.chiTieu);
            const bottomR3 = findMergeBottomRow(absR, headerColumns.diemChuan);
            
            effectiveHeaderRow = Math.max(bottomR1, bottomR2, bottomR3) - usedRange.s.r;
            break;
        }
    }

    // --- BƯỚC 3: ĐỌC DỮ LIỆU DỰA TRÊN HEADER VỚI FORMATTING ---
    if (effectiveHeaderRow !== -1) {
        // Helper function to check if a cell is italic
        const isCellItalic = (style) => {
            if (!style) return false;
            if (style.font && style.font.italic === true) return true;
            return false;
        };

        // Find column indices for 'Kế hoạch' and 'Thực hiện'
        const findColumnIndex = (headers, searchTerms) => {
            return headers.findIndex(h => {
                const normalized = normalize(String(h));
                return searchTerms.some(term => normalized.includes(term));
            });
        };

        const allColumnsIndices = Object.keys(grid[effectiveHeaderRow]).map(Number);
        const headersOut = allColumnsIndices.map(c => String(grid[effectiveHeaderRow][c] ?? ''));
        
        // Find specific columns
        const keHoachIndex = findColumnIndex(headersOut, ['ke hoach', 'kế hoạch']);
        const thucHienIndex = findColumnIndex(headersOut, ['thuc hien', 'thực hiện']);
        
        const rowsOut = [];
        
        for (let r = effectiveHeaderRow + 1; r < rowCount; r++) {
            const sttVal = String(grid[r][headerColumns.stt] ?? '').trim().toUpperCase();
            
            // Bỏ qua các dòng có STT trống
            if (sttVal === '') continue;
            
            // Check if the 'Chỉ tiêu' cell in this row is italic
            const chiTieuStyle = styleGrid[r] && styleGrid[r][headerColumns.chiTieu];
            const isChiTieuItalic = isCellItalic(chiTieuStyle);
            
            // Create row data with formatting information
            const rowData = allColumnsIndices.map((c, index) => {
                const value = grid[r][c] ?? '';
                let isInput = false;
                
                // If 'Chỉ tiêu' is italic, mark 'Kế hoạch' and 'Thực hiện' columns as inputs
                if (isChiTieuItalic && (c === keHoachIndex || c === thucHienIndex)) {
                    isInput = true;
                }
                
                return { value, isInput };
            });
            
            rowsOut.push(rowData);
            
            // Dừng lại SAU KHI đã thêm dòng chứa "D"
            if (sttVal === 'D') {
                break;
            }
        }

        return {
            headers: headersOut,
            rows: rowsOut,
            meta: {
                mode: 'column-mapping',
                headerRow: effectiveHeaderRow + usedRange.s.r + 1,
                columns: { stt: headerColumns.stt + 1, chiTieu: headerColumns.chiTieu + 1, diemChuan: headerColumns.diemChuan + 1 },
            }
        };
    }
    
    // --- CÁC BƯỚC FALLBACK (Dự phòng - Giữ nguyên logic gốc của bạn) ---
    // Fallback 1: named range 'FORM'
    try {
        const names = workbook.Workbook?.Names || [];
        for (const n of names) {
            const ref = n.Ref || n.ref;
            if (!ref) continue;
            const [sheetLabel, rangeA1] = ref.split('!');
            const sheetStripped = (sheetLabel || '').replace(/^'/, '').replace(/'$/, '');
            if ((n.Name || n.name)?.toString().toUpperCase() === 'FORM' && sheetStripped === firstSheetName) {
                const rng = XLSX.utils.decode_range(rangeA1);
                const cropped = [];
                for (let R = rng.s.r; R <= rng.e.r; R++) {
                    const row = [];
                    for (let C = rng.s.c; C <= rng.e.c; C++) {
                        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
                        row.push(cell ? cell.v : '');
                    }
                    cropped.push(row);
                }
                const [headers = [], ...rows] = cropped;
                const trimmedRows = rows.filter(r => r.some(cell => String(cell).trim() !== ''));
                // Convert to object format for consistency
                const objectRows = trimmedRows.map(row => 
                    row.map(cell => ({ value: cell, isInput: false }))
                );
                return { headers, rows: objectRows, meta: { mode: 'named-range', range: rangeA1 } };
            }
        }
    } catch {}

    // Fallback 2: full sheet
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const [headers = [], ...rows] = data;
    const trimmedRows = rows.filter(r => r.some(cell => String(cell).trim() !== ''));
    // Convert to object format for consistency
    const objectRows = trimmedRows.map(row => 
        row.map(cell => ({ value: cell, isInput: false }))
    );
    return { headers, rows: objectRows, meta: { mode: 'full-sheet' } };
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
