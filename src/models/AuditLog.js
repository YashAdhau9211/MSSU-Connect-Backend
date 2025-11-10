import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from './User.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  resource_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  resource_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'audit_logs',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      fields: ['user_id', 'created_at'],
    },
    {
      fields: ['action_type', 'created_at'],
    },
    {
      fields: ['admin_id', 'created_at'],
    },
  ],
  hooks: {
    beforeUpdate: () => {
      throw new Error('Audit logs are immutable and cannot be updated');
    },
    beforeDestroy: () => {
      throw new Error('Audit logs are immutable and cannot be deleted');
    },
  },
});

// Define associations
AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

AuditLog.belongsTo(User, {
  foreignKey: 'admin_id',
  as: 'admin',
});

// Override update and destroy methods to enforce immutability
AuditLog.prototype.update = function() {
  throw new Error('Audit logs are immutable and cannot be updated');
};

AuditLog.prototype.destroy = function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
};

AuditLog.update = function() {
  throw new Error('Audit logs are immutable and cannot be updated');
};

AuditLog.destroy = function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
};

export default AuditLog;
