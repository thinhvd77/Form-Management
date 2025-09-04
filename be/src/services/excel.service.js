const XLSX = require('xlsx');

/**
 * Parse Excel workbook and return headers/rows with style-aware input detection
 * This is the backend version of the parseWorkbookToJSON function from AdminPage.jsx
 */
function parseWorkbookToJSON(workbook) {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) return { headers: [], rows: [], meta: {} };

    const normalize = (s) => String(s ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    // --- STEP 1: Build Grid with full cell information (value and style) ---
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

    // --- STEP 2: Find header row and important columns ---
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

    // --- STEP 3: Read data and apply italic logic ---
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

/**
 * Parse Excel file buffer and return parsed data
 * @param {Buffer} fileBuffer - The Excel file buffer
 * @returns {Object} - Parsed data with headers, rows, and meta
 */
async function parseExcelFile(fileBuffer) {
    try {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellStyles: true });
        return parseWorkbookToJSON(workbook);
    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
}

module.exports = {
    parseExcelFile,
    parseWorkbookToJSON
};