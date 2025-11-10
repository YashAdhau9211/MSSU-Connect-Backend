export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: Sequelize.TEXT,
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    role: {
      type: Sequelize.ENUM('Student', 'Teacher', 'Parent', 'Admin', 'Super_Admin'),
      allowNull: false,
    },
    campus_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'campuses',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    profile_picture_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    account_status: {
      type: Sequelize.ENUM('active', 'inactive', 'locked'),
      defaultValue: 'active',
      allowNull: false,
    },
    failed_login_attempts: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    locked_until: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    token_version: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    last_login_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Add indexes
  await queryInterface.addIndex('users', ['email'], {
    unique: true,
    name: 'idx_users_email',
  });

  await queryInterface.addIndex('users', ['campus_id', 'role'], {
    name: 'idx_users_campus_role',
  });

  await queryInterface.addIndex('users', ['account_status', 'campus_id'], {
    name: 'idx_users_status_campus',
  });

  await queryInterface.addIndex('users', ['deleted_at'], {
    name: 'idx_users_deleted',
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('users');
};
