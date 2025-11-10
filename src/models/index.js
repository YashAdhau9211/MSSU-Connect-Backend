import { sequelize } from '../config/database.js';
import Campus from './Campus.js';
import User from './User.js';
import AuditLog from './AuditLog.js';

// Export all models
const models = {
  Campus,
  User,
  AuditLog,
};

// Initialize associations (already defined in model files)
// This ensures all associations are loaded

export { sequelize, Campus, User, AuditLog };
export default models;
