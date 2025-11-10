export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('campuses', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING(10),
      allowNull: false,
      unique: true,
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    contact_email: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    contact_phone: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
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

  // Add index on code field
  await queryInterface.addIndex('campuses', ['code'], {
    unique: true,
    name: 'idx_campuses_code',
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('campuses');
};
