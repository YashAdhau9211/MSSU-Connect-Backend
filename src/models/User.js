import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import config from '../config/env.js';
import Campus from './Campus.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
    get() {
      const rawValue = this.getDataValue('phone');
      return rawValue ? decrypt(rawValue) : null;
    },
    set(value) {
      if (value) {
        this.setDataValue('phone', encrypt(value));
      }
    },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('Student', 'Teacher', 'Parent', 'Admin', 'Super_Admin'),
    allowNull: false,
  },
  campus_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'campuses',
      key: 'id',
    },
  },
  profile_picture_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('address');
      return rawValue ? decrypt(rawValue) : null;
    },
    set(value) {
      if (value) {
        this.setDataValue('address', encrypt(value));
      }
    },
  },
  account_status: {
    type: DataTypes.ENUM('active', 'inactive', 'locked'),
    defaultValue: 'active',
    allowNull: false,
  },
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  token_version: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['email'],
    },
    {
      fields: ['campus_id', 'role'],
    },
    {
      fields: ['account_status', 'campus_id'],
    },
  ],
  hooks: {
    beforeCreate: async (user) => {
      // Hash password before creating user
      if (user.password_hash && !user.password_hash.startsWith('$2')) {
        const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if it was changed
      if (user.changed('password_hash') && user.password_hash && !user.password_hash.startsWith('$2')) {
        const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
  },
});

// Define associations
User.belongsTo(Campus, {
  foreignKey: 'campus_id',
  as: 'campus',
});

Campus.hasMany(User, {
  foreignKey: 'campus_id',
  as: 'users',
});

// Instance method to verify password
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

// Instance method to check if account is locked
User.prototype.isLocked = function() {
  if (!this.locked_until) return false;
  return new Date() < this.locked_until;
};

// Instance method to get user without sensitive data
User.prototype.toSafeObject = function() {
  const user = this.toJSON();
  delete user.password_hash;
  return user;
};

export default User;
