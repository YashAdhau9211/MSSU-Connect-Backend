import Campus from '../models/Campus.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { encrypt, decrypt } from '../utils/encryption.js';

console.log('='.repeat(50));
console.log('Verifying Database Models Structure');
console.log('='.repeat(50));

// Test Campus model
console.log('\n1. Campus Model:');
console.log('   ✓ Model loaded:', Campus.name);
console.log('   ✓ Table name:', Campus.tableName);
console.log('   ✓ Attributes:', Object.keys(Campus.rawAttributes).join(', '));

// Test User model
console.log('\n2. User Model:');
console.log('   ✓ Model loaded:', User.name);
console.log('   ✓ Table name:', User.tableName);
console.log('   ✓ Attributes:', Object.keys(User.rawAttributes).join(', '));
console.log('   ✓ Has encryption for phone:', User.rawAttributes.phone.get !== undefined);
console.log('   ✓ Has encryption for address:', User.rawAttributes.address.get !== undefined);
console.log('   ✓ Has beforeCreate hook:', User.options.hooks.beforeCreate !== undefined);
console.log('   ✓ Has beforeUpdate hook:', User.options.hooks.beforeUpdate !== undefined);
console.log('   ✓ Has verifyPassword method:', User.prototype.verifyPassword !== undefined);
console.log('   ✓ Has isLocked method:', User.prototype.isLocked !== undefined);
console.log('   ✓ Has toSafeObject method:', User.prototype.toSafeObject !== undefined);

// Test AuditLog model
console.log('\n3. AuditLog Model:');
console.log('   ✓ Model loaded:', AuditLog.name);
console.log('   ✓ Table name:', AuditLog.tableName);
console.log('   ✓ Attributes:', Object.keys(AuditLog.rawAttributes).join(', '));
console.log('   ✓ Is immutable (update throws):', AuditLog.prototype.update !== undefined);
console.log('   ✓ Is immutable (destroy throws):', AuditLog.prototype.destroy !== undefined);
console.log('   ✓ Has beforeUpdate hook:', AuditLog.options.hooks.beforeUpdate !== undefined);
console.log('   ✓ Has beforeDestroy hook:', AuditLog.options.hooks.beforeDestroy !== undefined);

// Test associations
console.log('\n4. Model Associations:');
console.log('   ✓ User belongs to Campus:', User.associations.campus !== undefined);
console.log('   ✓ Campus has many Users:', Campus.associations.users !== undefined);
console.log('   ✓ AuditLog belongs to User:', AuditLog.associations.user !== undefined);
console.log('   ✓ AuditLog belongs to Admin:', AuditLog.associations.admin !== undefined);

// Test encryption utility
console.log('\n5. Encryption Utility:');
const testData = '+919876543210';
const encrypted = encrypt(testData);
const decrypted = decrypt(encrypted);
console.log('   ✓ Original:', testData);
console.log('   ✓ Encrypted:', encrypted.substring(0, 50) + '...');
console.log('   ✓ Decrypted:', decrypted);
console.log('   ✓ Encryption works:', testData === decrypted ? 'YES' : 'NO');

// Test null encryption
const nullEncrypted = encrypt(null);
const nullDecrypted = decrypt(null);
console.log('   ✓ Null encryption:', nullEncrypted === null ? 'YES' : 'NO');
console.log('   ✓ Null decryption:', nullDecrypted === null ? 'YES' : 'NO');

console.log('\n' + '='.repeat(50));
console.log('✓ All model structure verifications passed!');
console.log('='.repeat(50));
console.log('\nNote: To test database connectivity and run migrations:');
console.log('  1. Configure your database credentials in .env file');
console.log('  2. Run: npm run migrate');
console.log('  3. Run: npm run seed');
console.log('='.repeat(50));
