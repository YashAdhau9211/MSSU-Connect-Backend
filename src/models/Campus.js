import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Campus = sequelize.define('Campus', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  contact_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'campuses',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['code'],
    },
  ],
});

export default Campus;
