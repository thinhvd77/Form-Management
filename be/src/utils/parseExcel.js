const XLSX = require('xlsx');

// Đổi sang logic: đánh dấu isInput dựa trên ô có tô nền (fill).
// Có thể giới hạn chỉ 2 cột "Kế hoạch"/"Thực hiện" bằng biến cấu hình.
const INPUT_ONLY_PLANNED_AND_ACTUAL = true;

function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function isCellFilled(style) {
  if (!style || !style.fill) return false;
  const fill = style.fill;
  const hasFg = !!(fill.fgColor && (fill.fgColor.rgb || fill.fgColor.theme !== undefined || fill.fgColor.indexed !== undefined));
  const hasBg = !!(fill.bgColor && (fill.bgColor.rgb || fill.bgColor.theme !== undefined || fill.bgColor.indexed !== undefined));
  const pattern = fill.patternType || fill.pattern;
  if (pattern && pattern.toLowerCase?.() === 'none') return false;
  return hasFg || hasBg;
}

function findColumnIndex(headers, searchTerms) {
  return headers.findIndex(h => {
    const n = normalize(String(h));
    return searchTerms.some(term => n.includes(term));
  });
}

function parseWorkbookToJSON(workbook) {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return { headers: [], rows: [], meta: { mode: 'error', message: 'Sheet không tồn tại' } };

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

      const keHoachIndex = INPUT_ONLY_PLANNED_AND_ACTUAL ? findColumnIndex(headersOut, ['ke hoach', 'kế hoạch']) : -1;
      const thucHienIndex = INPUT_ONLY_PLANNED_AND_ACTUAL ? findColumnIndex(headersOut, ['thuc hien', 'thực hiện']) : -1;

      const rowsOut = [];
      for (let rowIdx = effHeaderRel + 1; rowIdx < grid.length; rowIdx++) {
        const row = grid[rowIdx].slice(0, cEnd + 1);
        const sttVal = String(row[0] ?? '').trim().toUpperCase();

        if (row.some(v => String(v).trim() !== '')) {
          const objectRow = row.map((cell, cIdx) => {
            const st = styleGrid[rowIdx]?.[cIdx];
            const filled = isCellFilled(st);
            const allowedCol = !INPUT_ONLY_PLANNED_AND_ACTUAL || cIdx === keHoachIndex || cIdx === thucHienIndex;
            return { value: cell, isInput: filled && allowedCol };
          });
          rowsOut.push(objectRow);
        }
        if (sttVal === 'D') break;
      }
      return { headers: headersOut, rows: rowsOut, meta: { mode: 'header-01' } };
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
    const keHoachIndex = INPUT_ONLY_PLANNED_AND_ACTUAL ? findColumnIndex(headersOut, ['ke hoach', 'kế hoạch']) : -1;
    const thucHienIndex = INPUT_ONLY_PLANNED_AND_ACTUAL ? findColumnIndex(headersOut, ['thuc hien', 'thực hiện']) : -1;

    const rowsOut = [];
    for (let r = effectiveHeaderRow + 1; r < rowCount; r++) {
      const sttVal = String(grid[r][headerColumns.stt] ?? '').trim().toUpperCase();
      if (sttVal === '') continue;

      const rowData = allColumnsIndices.map((cIdx) => {
        const value = grid[r][cIdx] ?? '';
        const st = styleGrid[r]?.[cIdx];
        const filled = isCellFilled(st);
        const allowedCol = !INPUT_ONLY_PLANNED_AND_ACTUAL || cIdx === keHoachIndex || cIdx === thucHienIndex;
        return { value, isInput: filled && allowedCol };
      });
      rowsOut.push(rowData);
      if (sttVal === 'D') break;
    }
    return { headers: headersOut, rows: rowsOut, meta: { mode: 'column-mapping' } };
  }

  // Fallback: full sheet
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const [headers = [], ...rows] = data;
  const trimmed = rows.filter(r => r.some(cell => String(cell).trim() !== ''));
  const objectRows = trimmed.map(row => row.map(cell => ({ value: cell, isInput: false })));
  return { headers, rows: objectRows, meta: { mode: 'full-sheet' } };
}

function parseExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellStyles: true });
  return parseWorkbookToJSON(wb);
}

module.exports = { parseExcelBuffer };