const XLSX = require('xlsx');

// Chuẩn hóa: đánh dấu isInput dựa trên ô có tô nền (fill color)
// Logic hoàn toàn mới - chỉ dùng fill color để quyết định isInput

function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  }

function isCellFilled(style) {
  if (!style) return false;
  
  // Check multiple style properties that indicate filled cells
  
  // 1. Check fill property
  if (style.fill) {
    const fill = style.fill;
    const pattern = fill.patternType || fill.pattern;
    
    // If pattern is explicitly "none", no fill
    if (pattern && pattern.toLowerCase?.() === 'none') {
  return false;
}

    // Check for foreground color
    const hasFg = !!(fill.fgColor && (
      fill.fgColor.rgb || 
      fill.fgColor.theme !== undefined || 
      fill.fgColor.indexed !== undefined
    ));
    
    // Check for background color
    const hasBg = !!(fill.bgColor && (
      fill.bgColor.rgb || 
      fill.bgColor.theme !== undefined || 
      fill.bgColor.indexed !== undefined
    ));
    
    // Check if pattern type indicates a fill (solid, etc.)
    const hasPattern = pattern && pattern.toLowerCase() !== 'none';
    
    if (hasFg || hasBg || hasPattern) return true;
  }
  
  // 2. Check patternType directly on style
  if (style.patternType && style.patternType.toLowerCase() !== 'none') {
    return true;
  }
  
  // 3. Check for any background-related properties
  if (style.bgColor || style.fgColor) {
    return true;
  }
  
  // 4. XLSX sometimes stores fill info differently
  // Check for common fill indicators
  const fillIndicators = [
    'fillType', 'backgroundColor', 'foregroundColor', 
    'interior', 'shading', 'highlight'
  ];
  
  for (const indicator of fillIndicators) {
    if (style[indicator]) {
      return true;
    }
  }
  
  return false;
}

function parseWorkbookToJSON(workbook) {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  console.log(worksheet);

  if (!worksheet) return { headers: [], rows: [], meta: { mode: 'error', message: 'Sheet không tồn tại', inputMode: 'fill-only' } };

  const usedRef = worksheet['!ref'];
  const usedRange = usedRef ? XLSX.utils.decode_range(usedRef) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const rowCount = usedRange.e.r - usedRange.s.r + 1;
  const colCount = usedRange.e.c - usedRange.s.c + 1;

  const grid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ''));
  const styleGrid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => null));

  for (let R = usedRange.s.r; R <= usedRange.e.r; R++) {
    for (let C = usedRange.s.c; C <= usedRange.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[addr];
      const r = R - usedRange.s.r;
      const c = C - usedRange.s.c;
      grid[r][c] = cell ? cell.v : '';
      if (cell && cell.s) styleGrid[r][c] = cell.s;
    }
  }

  const merges = worksheet['!merges'] || [];
  for (const m of merges) {
    const topLeft = worksheet[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })];
    const val = topLeft ? topLeft.v : '';
    const style = topLeft ? topLeft.s : null;
    for (let R = m.s.r; R <= m.e.r; R++) {
      for (let C = m.s.c; C <= m.e.c; C++) {
        const r = R - usedRange.s.r;
        const c = C - usedRange.s.c;
        grid[r][c] = val;
        styleGrid[r][c] = style;
      }
    }
  }

  // RULE 1: header row khi cột 0 == 'STT' và cột 1 chứa 'Chỉ tiêu'
  for (let r = 0; r < rowCount; r++) {
    const c0 = normalize(grid[r][0]);
    const c1 = normalize(grid[r][1]);
    if (c0 === 'stt' && (c1 === 'chi tieu' || c1.includes('chi tieu'))) {
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

      // Tìm cột cuối
      let cEnd = 0;
      for (let rr = effHeaderRel; rr < rowCount; rr++) {
        for (let cc = colCount - 1; cc >= 0; cc--) {
          if (String(grid[rr][cc] ?? '').toString().trim() !== '') { cEnd = Math.max(cEnd, cc); break; }
        }
      }
      const headersOut = grid[effHeaderRel].slice(0, cEnd + 1);

      const rowsOut = [];
      for (let rowIdx = effHeaderRel + 1; rowIdx < grid.length; rowIdx++) {
        const row = grid[rowIdx].slice(0, cEnd + 1);
        const sttVal = String(row[0] ?? '').trim().toUpperCase();

        if (row.some(v => String(v).trim() !== '')) {
          const objectRow = row.map((cell, cIdx) => {
            const st = styleGrid[rowIdx]?.[cIdx];
            const filled = isCellFilled(st);
            return { value: cell, isInput: filled };
          });
          rowsOut.push(objectRow);
  }
        if (sttVal === 'D') break;
      }
      return { headers: headersOut, rows: rowsOut, meta: { mode: 'header-01', inputMode: 'fill-only' } };
    }
  }

  // RULE 2: dò header linh hoạt
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
      if (foundOnRow.stt === -1 && targets.stt.some(t => n.includes(t))) foundOnRow.stt = c;
      if (foundOnRow.chiTieu === -1 && targets.chiTieu.some(t => n.includes(t))) foundOnRow.chiTieu = c;
      if (foundOnRow.diemChuan === -1 && targets.diemChuan.some(t => n.includes(t))) foundOnRow.diemChuan = c;
    }
    if (foundOnRow.stt !== -1 && foundOnRow.chiTieu !== -1 && foundOnRow.diemChuan !== -1) {
      headerColumns = foundOnRow;
      const findMergeBottomRow = (absR, absC) => {
        for (const m of merges) {
          if (absR >= m.s.r && absR <= m.e.r && absC >= m.s.c && absC <= m.e.c) return m.e.r;
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

  if (effectiveHeaderRow !== -1) {
    const allColumnsIndices = Object.keys(grid[effectiveHeaderRow]).map(Number);
    const headersOut = allColumnsIndices.map(c => String(grid[effectiveHeaderRow][c] ?? ''));
    const rowsOut = [];
    for (let r = effectiveHeaderRow + 1; r < rowCount; r++) {
      const sttVal = String(grid[r][headerColumns.stt] ?? '').trim().toUpperCase();
      if (sttVal === '') continue;

      const rowData = allColumnsIndices.map((cIdx) => {
        const value = grid[r][cIdx] ?? '';
        const st = styleGrid[r]?.[cIdx];
        const filled = isCellFilled(st);
        return { value, isInput: filled };
      });
      rowsOut.push(rowData);
      if (sttVal === 'D') break;
    }
    return { headers: headersOut, rows: rowsOut, meta: { mode: 'column-mapping', inputMode: 'fill-only' } };
  }

  // Fallback: full sheet with style detection
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const [headers = [], ...rows] = data;
  const trimmed = rows.filter(r => r.some(cell => String(cell).trim() !== ''));
  
  // Build style grid for fallback
  const fallbackStyleGrid = [];
  const fallbackRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  for (let r = 0; r < trimmed.length + 1; r++) { // +1 for headers
    fallbackStyleGrid[r] = [];
    for (let c = 0; c < Math.max(headers.length, ...trimmed.map(row => row.length)); c++) {
      const cellRef = XLSX.utils.encode_cell({ r: fallbackRange.s.r + r, c: fallbackRange.s.c + c });
      const cellObj = worksheet[cellRef];
      fallbackStyleGrid[r][c] = cellObj?.s;
    }
  }
  
  const objectRows = trimmed.map((row, rowIdx) => 
    row.map((cell, colIdx) => {
      const st = fallbackStyleGrid[rowIdx + 1]?.[colIdx]; // +1 to skip header row
      const filled = isCellFilled(st);
      return { value: cell, isInput: filled };
    })
  );
  return { headers, rows: objectRows, meta: { mode: 'full-sheet', inputMode: 'fill-only' } };
}

function parseExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellStyles: true });
  return parseWorkbookToJSON(wb);
}

module.exports = { parseExcelBuffer };