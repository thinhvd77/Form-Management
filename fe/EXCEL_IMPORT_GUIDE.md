# Excel Import with Conditional Input Fields - Implementation Guide

## Overview

This implementation adds advanced Excel import functionality that automatically detects italic formatting in Excel files and creates conditional input fields in the web interface based on that formatting.

## Key Features

### 1. **Cell Formatting Detection**
- Reads Excel files with cell style information using `{ cellStyles: true }`
- Detects italic formatting in cells to determine input requirements
- Maintains formatting information throughout the data processing pipeline

### 2. **Conditional Input Fields**
- If a cell in the 'Chỉ tiêu' (Criteria) column has italic formatting, the corresponding cells in 'Kế hoạch' (Plan) and 'Thực hiện' (Implementation) columns become editable input fields
- Visual indicators distinguish between regular display cells and input cells

### 3. **Enhanced Data Structure**
- Each cell is now represented as an object: `{ value: "cell content", isInput: true/false }`
- Backward compatibility maintained for existing data formats

## Technical Implementation

### Backend Changes (AdminPage.jsx)

#### Enhanced Excel Parsing
```javascript
// Enable cell styles reading
const wb = XLSX.read(ab, { type: 'array', cellStyles: true });

// Store style information alongside cell values
const styleGrid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => null));

// Helper function to detect italic formatting
const isCellItalic = (style) => {
    if (!style) return false;
    if (style.font && style.font.italic === true) return true;
    return false;
};
```

#### Data Structure Transformation
```javascript
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
```

#### Table Rendering
```javascript
// Enhanced table cell rendering with input support
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
```

### Frontend Changes (SelectionPage.jsx)

#### Enhanced Cell Rendering
```javascript
// Handle new object structure from Excel with formatting
if (cellData && typeof cellData === 'object' && cellData.hasOwnProperty('value')) {
    return (
        <td key={cidx} className={cellData.isInput ? 'input-required' : ''}>
            {cellData.isInput ? (
                <input
                    className="custom-input"
                    value={cellData.value ?? ''}
                    onChange={(e) => handleCellChange(ridx, cidx, { ...cellData, value: e.target.value })}
                    placeholder="Nhập giá trị..."
                />
            ) : (
                cellData.value ?? ''
            )}
        </td>
    );
}
```

### CSS Styling

#### Admin Page Styles
```css
.input-cell { 
    background-color: #fffbeb !important; 
    border-left: 3px solid #f59e0b;
    position: relative;
}

.input-cell::before {
    content: "📝";
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 10px;
    opacity: 0.6;
}
```

#### Selection Page Styles
```css
.input-required {
    background-color: #fef3c7 !important;
    border-left: 3px solid #f59e0b;
    position: relative;
}

.input-required::before {
    content: "📝";
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 10px;
    opacity: 0.7;
    pointer-events: none;
}
```

## Usage Example

### Excel File Preparation
1. Create an Excel file with columns: STT, Chỉ tiêu, Điểm chuẩn, Kế hoạch, Thực hiện
2. For rows where you want input fields, format the text in the 'Chỉ tiêu' column as **italic**
3. Example:
   - "Điều chuyển môn nghiệp vụ" (normal text) → display only
   - "*Tăng trưởng dư nợ*" (italic text) → creates input fields in 'Kế hoạch' and 'Thực hiện' columns

### Import Process
1. Go to Admin page
2. Upload the Excel file
3. The system automatically detects italic formatting
4. Preview shows input fields (highlighted in yellow with pencil icon) where applicable
5. Save the template to make it available for users

### User Experience
1. Users navigate to Selection page
2. Fill in personal information and select branch/department/position
3. The evaluation table displays with:
   - Regular text in non-editable cells
   - Input fields in cells marked by italic formatting in Excel
   - Visual indicators (yellow background, orange border, pencil icon) for input cells

## Visual Indicators

- **Input cells**: Yellow background (#fef3c7) with orange left border (#f59e0b)
- **Pencil icon**: 📝 appears in top-right corner of input cells
- **Focus state**: Blue border and shadow when input is focused

## Backward Compatibility

The implementation maintains full backward compatibility:
- Existing templates without object structure work normally
- Legacy data is automatically handled through fallback logic
- Old format data is converted to new object format seamlessly

## Error Handling

- Invalid Excel files are gracefully handled with error messages
- Missing style information defaults to non-input cells
- Malformed data structures fall back to display-only mode

## Performance Considerations

- Cell styling detection adds minimal overhead to file processing
- Style information is cached during initial parsing
- Rendering optimizations prevent unnecessary re-renders

## Future Enhancements

Potential improvements that could be added:
- Support for other formatting types (bold, underline, colors)
- Cell validation based on formatting
- Export functionality preserving input values
- Conditional formatting based on user roles
- Real-time collaboration on input fields

This implementation provides a robust, user-friendly solution for creating dynamic forms based on Excel formatting, significantly improving the user experience for form management and data entry.
