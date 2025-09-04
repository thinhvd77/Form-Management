# Hướng dẫn Import File Excel

## Tổng quan
Hệ thống FormReview hỗ trợ import file Excel (.xlsx) để tạo template đánh giá. Hệ thống sử dụng **background fill (tô nền)** để xác định các ô có thể nhập liệu.

## Quy tắc xác định Input Fields

### ✅ Phương pháp hiện tại: Background Fill Detection
- **Tất cả các ô có background fill (tô nền) sẽ trở thành input field**
- Không giới hạn theo cột cụ thể
- Áp dụng cho toàn bộ bảng

### Cách chuẩn bị file Excel:
1. Tạo bảng với headers và dữ liệu
2. **Tô nền (background fill)** cho các ô muốn người dùng có thể nhập liệu
3. Các ô không tô nền sẽ chỉ hiển thị, không cho phép chỉnh sửa

## Ví dụ file Excel hợp lệ:

```
| STT | Chỉ tiêu              | Điểm chuẩn | Kế hoạch | Thực hiện |
|-----|-----------------------|------------|----------|-----------|
| 1   | Doanh thu tháng       | 100        | [FILL]   | [FILL]    |
| 2   | Khách hàng mới        | 50         | [FILL]   | [FILL]    |
| 3   | Tỷ lệ hài lòng        | 90%        | [FILL]   | [FILL]    |
```

Trong đó [FILL] nghĩa là ô được tô nền (background fill) bất kỳ màu nào.

## Kết quả sau khi import:
- Các ô có background fill → Input fields (cho phép nhập liệu)
- Các ô không có background fill → Read-only (chỉ hiển thị)
- Metadata chứa `inputMode: 'fill-only'` để frontend xử lý đúng cách

## Technical Details

### Backend Changes
- `parseExcel.js`: Enhanced `isCellFilled()` function to detect various fill patterns
- All parsing modes now include `inputMode: 'fill-only'` in metadata
- Removed column restrictions (`INPUT_ONLY_PLANNED_AND_ACTUAL = false`)
- Object structure: `{ value: cellValue, isInput: boolean }`

### Frontend Changes
- `SelectionPage.jsx`: Respects `template.meta.inputMode` to disable legacy column detection
- `AdminPage.jsx`: Handles object-based cell rendering with proper input field detection
- CSS: `.input-required` class for visual feedback on editable cells
