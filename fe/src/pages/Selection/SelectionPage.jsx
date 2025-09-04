import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faUsers, faUserTie } from '@fortawesome/free-solid-svg-icons';
import './SelectionPage.css'; // Import file CSS thuần
import { orgData } from '../../data/orgData';
import { getTemplate, makeKey } from '../../services/formTemplates';
import { TemplatesAPI } from '../../services/api';

// Dữ liệu danh mục dùng chung
const data = orgData;


const EvaluationForm = () => {
  // Toàn bộ logic useState và các hàm handle...Change không thay đổi
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [template, setTemplate] = useState(null); // template được admin tạo cho bộ chọn này
  const [editedRows, setEditedRows] = useState([]); // dữ liệu có thể chỉnh sửa cho các cột nhất định

  const handleBranchChange = (e) => {
    const branchId = e.target.value;
    setSelectedBranch(branchId);
    setSelectedDepartment('');
    setSelectedPosition('');
    setPositions([]);
    setIsTableVisible(false);
    if (branchId) setDepartments(data.departments[branchId] || []);
    else setDepartments([]);
  };

  const handleDepartmentChange = (e) => {
    const departmentId = e.target.value;
    setSelectedDepartment(departmentId);
    setSelectedPosition('');
    setIsTableVisible(false);
    if (departmentId) setPositions(data.positions[departmentId] || []);
    else setPositions([]);
  };

  const handlePositionChange = (e) => {
    const positionId = e.target.value;
    setSelectedPosition(positionId);
    setIsTableVisible(!!positionId);
  };

  // Khi đã chọn đủ 3 yếu tố, lấy template tương ứng từ backend; fallback local
  useEffect(() => {
    let canceled = false;
    async function load() {
      if (selectedBranch && selectedDepartment && selectedPosition) {
        const key = makeKey(selectedBranch, selectedDepartment, selectedPosition);
        try {
          const res = await TemplatesAPI.get(key);
          if (!canceled) setTemplate(res || null);
        } catch {
          const tpl = getTemplate(key);
          if (!canceled) setTemplate(tpl || null);
        }
      } else {
        setTemplate(null);
      }
    }
    load();
    return () => { canceled = true; };
  }, [selectedBranch, selectedDepartment, selectedPosition]);

  const headers = useMemo(() => template?.headers || [], [template]);
  const rows = useMemo(() => template?.rows || [], [template]);

  // Normalize helper
  const normalize = (s) => String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

  // Determine editable columns: "Kế hoạch", "Thực hiện"
  const editableColIndices = useMemo(() => {
    return headers.reduce((acc, h, idx) => {
      const n = normalize(h);
      if (n === 'ke hoach' || n === 'thuc hien') acc.push(idx);
      return acc;
    }, []);
  }, [headers]);

  // Initialize editableRows when rows change
  useEffect(() => {
    setEditedRows(rows.map(r => Array.isArray(r) ? [...r] : r));
  }, [rows]);

  const handleCellChange = (ri, ci, val) => {
    setEditedRows(prev => {
      const next = [...prev];
      const row = Array.isArray(next[ri]) ? [...next[ri]] : [];
      row[ci] = val;
      next[ri] = row;
      return next;
    });
  };

  return (
    <div className="page-container">
      <div className="evaluation-card">
        <div className="header-section">
          <h1>Biểu Mẫu Tự Đánh Giá Mức Độ Hoàn Thành Công Việc</h1>
          <p>Vui lòng hoàn thành các lựa chọn bên dưới để hiển thị biểu mẫu đánh giá.</p>
        </div>

        <div className="selection-grid">
          <div className="select-group">
            <label htmlFor="branch-select">
              <FontAwesomeIcon icon={faBuilding} className="icon" />
              Chọn Chi Nhánh
            </label>
            <select id="branch-select" value={selectedBranch} onChange={handleBranchChange} className="custom-select">
              <option value="">-- Vui lòng chọn --</option>
              {data.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="select-group">
            <label htmlFor="department-select">
              <FontAwesomeIcon icon={faUsers} className="icon" />
              Chọn Phòng Ban
            </label>
            <select id="department-select" value={selectedDepartment} onChange={handleDepartmentChange} disabled={!selectedBranch} className="custom-select">
              <option value="">-- Vui lòng chọn --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="select-group">
            <label htmlFor="position-select">
              <FontAwesomeIcon icon={faUserTie} className="icon" />
              Chọn Chức Vụ
            </label>
            <select id="position-select" value={selectedPosition} onChange={handlePositionChange} disabled={!selectedDepartment} className="custom-select">
              <option value="">-- Vui lòng chọn --</option>
              {positions.map(pos => (
                <option key={pos.id} value={pos.id}>{pos.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`evaluation-table-container ${isTableVisible ? 'visible' : ''}`}>
          <h2>Nội dung đánh giá</h2>
          {!template && (
            <p style={{ color: '#6b7280', marginBottom: 12 }}>
              Chưa có mẫu form cho lựa chọn này. Vui lòng liên hệ Admin để tạo nhóm form.
            </p>
          )}
          <div className="table-wrapper">
            <table className="results-table">
              <thead>
                {headers.length > 0 ? (
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i}>{String(h)}</th>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    <th>STT</th>
                    <th>Nội Dung Công Việc</th>
                    <th className="text-center">Tỷ Trọng (%)</th>
                    <th>Kết Quả Cần Đạt</th>
                    <th className="text-center">Tự Đánh Giá</th>
                    <th>Ghi Chú</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {editedRows.length > 0 ? (
                  editedRows.map((row, ridx) => (
                    <tr key={ridx}>
                      {headers.length > 0 ? (
                        headers.map((_, cidx) => {
                          const isEditable = editableColIndices.includes(cidx);
                          return (
                            <td key={cidx}>
                              {isEditable ? (
                                <input
                                  className="custom-select"
                                  value={row?.[cidx] ?? ''}
                                  onChange={(e) => handleCellChange(ridx, cidx, e.target.value)}
                                />
                              ) : (
                                row?.[cidx] ?? ''
                              )}
                            </td>
                          );
                        })
                      ) : (
                        <>
                          <td>{ridx + 1}</td>
                          <td>{row.task || ''}</td>
                          <td className="text-center">{row.weight || ''}</td>
                          <td>{row.expected || ''}</td>
                          <td>
                            <select className="custom-select" defaultValue="">
                              <option value="" disabled>Chọn</option>
                              <option>Hoàn thành tốt</option>
                              <option>Hoàn thành</option>
                              <option>Chưa đạt</option>
                            </select>
                          </td>
                          <td><input type="text" className="custom-select" placeholder="Nhập ghi chú..." /></td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>
                      Không có dữ liệu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="action-buttons">
            <button type="button" className="btn btn-secondary">Lưu Nháp</button>
            <button type="submit" className="btn btn-primary">Nộp Đánh Giá</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationForm;