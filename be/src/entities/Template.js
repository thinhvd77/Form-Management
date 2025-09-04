const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Template',
  tableName: 'templates',
  columns: {
    key: { type: String, primary: true },
    branchId: { type: String },
    departmentId: { type: String },
    positionId: { type: String },
    headers: { type: 'jsonb', nullable: false },
    rows: { type: 'jsonb', nullable: false },
    sourceFile: { type: String, nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'idx_templates_bdp', columns: ['branchId', 'departmentId', 'positionId'] },
  ],
});
