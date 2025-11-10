export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('audit_logs', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    admin_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    action_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    resource_type: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    resource_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    ip_address: {
      type: Sequelize.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    details: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Add composite indexes
  await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], {
    name: 'idx_audit_user_created',
  });

  await queryInterface.addIndex('audit_logs', ['action_type', 'created_at'], {
    name: 'idx_audit_action_created',
  });

  await queryInterface.addIndex('audit_logs', ['admin_id', 'created_at'], {
    name: 'idx_audit_admin_created',
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('audit_logs');
};
