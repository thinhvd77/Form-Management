// Shared organizational data for branches, departments, and positions
export const orgData = {
  branches: [
    { id: 'hs', name: 'Hội sở' }
  ],
  departments: {
    hs: [
      { id: 'hs-kt', name: 'Kế toán & ngân quỹ' },
      { id: 'hs-pgd', name: 'Phòng giao dịch Bình Tây' },
      { id: 'hs-cn', name: 'Phòng Khách hàng cá nhân' },
      { id: 'hs-dn', name: 'Phòng Khách hàng doanh nghiệp' },
      { id: 'hs-th', name: 'Phòng Tổng hợp' },
      { id: 'hs-ktgs', name: 'Phòng Kiểm tra giám sát nội bộ' },
      { id: 'hs-qlrr', name: 'Phòng Kế hoạch & quản lý rủi ro' },
      { id: 'hs-gd', name: 'Ban giám đốc' }
    ]
  },
  positions: {
    'hs-kt': [
      { id: 'hs-kt-tp', name: 'Trưởng phòng' },
      { id: 'hs-kt-pp', name: 'Phó Trưởng phòng' },
      { id: 'hs-kt-nv-1', name: 'Nhân viên Nhóm I' },
      { id: 'hs-kt-nv-2', name: 'Nhân viên Nhóm II' }
    ],
    'hs-cn': [
      { id: 'hs-cn-tp', name: 'Trưởng phòng' },
      { id: 'hs-cn-pp', name: 'Phó Trưởng phòng' },
      { id: 'hs-cn-cv', name: 'Nhân viên phát triển cho vay' },
      { id: 'hs-cn-cv-dv', name: 'Nhân viên phát triển cho vay và dịch vụ' }
    ],
    'hs-pgd': [
      { id: 'hs-pgd-tp', name: 'Trưởng phòng' },
      { id: 'hs-pgd-pp', name: 'Phó Trưởng phòng' },
      { id: 'hs-pgd-cv', name: 'Nhân viên phát triển cho vay' }
    ],
    'hs-dn': [
      { id: 'hs-dn-tp', name: 'Trưởng phòng' },
      { id: 'hs-dn-pp', name: 'Phó Trưởng phòng' },
      { id: 'hs-dn-ct', name: 'Cán bộ chuyên trách' },
      { id: 'hs-dn-cv', name: 'Nhân viên phát triển cho vay' },
      { id: 'hs-dn-cv-xln', name: 'Nhân viên phát triển cho vay và xử lý nợ' },
      { id: 'hs-dn-tt', name: 'Nhân viên thanh toán quốc tế' }
    ],
    'hs-th': [
      { id: 'hs-th-tp', name: 'Trưởng phòng' },
      { id: 'hs-th-nv', name: 'Nhân viên' }
    ],
    'hs-ktgs': [
      { id: 'hs-ktgs-tp', name: 'Trưởng phòng' },
      { id: 'hs-ktgs-nv', name: 'Nhân viên' }
    ],
    'hs-qlrr': [
      { id: 'hs-qlrr-tp', name: 'Trưởng phòng' },
      { id: 'hs-qlrr-nv', name: 'Nhân viên' }
    ],
    'hs-gd': [
      { id: 'hs-gd-gd', name: 'Giám đốc' },
      { id: 'hs-gd-pgd', name: 'Phó Giám đốc' }
    ]
  }
};

export function findNameById(list, id) {
  return (list || []).find(x => x.id === id)?.name || '';
}
