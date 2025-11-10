export const up = async (queryInterface, Sequelize) => {
  const campuses = [
    {
      id: Sequelize.literal('gen_random_uuid()'),
      name: 'Navi Mumbai',
      code: 'NM',
      address: 'Navi Mumbai Campus Address',
      contact_email: 'navimumbai@mssu.ac.in',
      contact_phone: '+912227123456',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: Sequelize.literal('gen_random_uuid()'),
      name: 'Thane',
      code: 'TH',
      address: 'Thane Campus Address',
      contact_email: 'thane@mssu.ac.in',
      contact_phone: '+912225123456',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: Sequelize.literal('gen_random_uuid()'),
      name: 'Nagpur',
      code: 'NG',
      address: 'Nagpur Campus Address',
      contact_email: 'nagpur@mssu.ac.in',
      contact_phone: '+917122123456',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: Sequelize.literal('gen_random_uuid()'),
      name: 'Pune',
      code: 'PN',
      address: 'Pune Campus Address',
      contact_email: 'pune@mssu.ac.in',
      contact_phone: '+912026123456',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  await queryInterface.bulkInsert('campuses', campuses);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.bulkDelete('campuses', {
    code: ['NM', 'TH', 'NG', 'PN'],
  });
};
