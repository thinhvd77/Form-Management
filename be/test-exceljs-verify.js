const ExcelJS = require('exceljs');
const { parseExcelWithExcelJS } = require('./src/utils/parseExcel');

async function main() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  ws.addRow(['STT', 'Chỉ tiêu', 'Điểm chuẩn', 'Kế hoạch', 'Thực hiện']);
  ws.addRow(['1', 'CT 1', 80, 100, 95]);
  ws.addRow(['2', 'CT 2', 75, 120, 110]);

  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  ['D2','E2','D3','E3'].forEach(addr => { ws.getCell(addr).fill = yellow; });

  const buffer = await wb.xlsx.writeBuffer();
  const result = await parseExcelWithExcelJS(Buffer.from(buffer));

  console.log('Headers:', result.headers);
  console.log('Meta:', result.meta);
  console.log('Rows:');
  result.rows.forEach((row, i) => {
    console.log(` Row ${i+1}:`, row.map(c => `${c.value}:${c.isInput ? 'Y' : 'N'}`).join(' | '));
  });

  // Simple assertions
  const ok = result.rows[0][3].isInput && result.rows[0][4].isInput &&
             result.rows[1][3].isInput && result.rows[1][4].isInput &&
             !result.rows[0][0].isInput;
  console.log('\nVerification:', ok ? 'PASS' : 'FAIL');
}

main().catch(err => { console.error(err); process.exit(1); });
