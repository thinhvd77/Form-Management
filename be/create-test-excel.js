const XLSX = require('xlsx');

// Create a simple test Excel file
const testData = [
  ['STT', 'Chỉ tiêu', 'Kế hoạch', 'Thực hiện', 'Ghi chú'],
  ['1', 'Mục tiêu số 1', '100', '95', 'Test note 1'],
  ['2', 'Mục tiêu số 2', '200', '180', 'Test note 2'],
  ['3', 'Mục tiêu số 3', '150', '160', 'Test note 3']
];

const ws = XLSX.utils.aoa_to_sheet(testData);

// Set the "Chỉ tiêu" column cells (column B, rows 2-4) to italic
// In XLSX.js, cells are referenced like B2, B3, B4
ws['B2'].s = { font: { italic: true } };
ws['B3'].s = { font: { italic: true } };
ws['B4'].s = { font: { italic: true } };

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

// Write to file
XLSX.writeFile(wb, '/tmp/test-excel.xlsx');
console.log('Test Excel file created at /tmp/test-excel.xlsx');