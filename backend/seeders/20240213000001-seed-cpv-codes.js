'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Sample CPV codes - Common Procurement Vocabulary codes
    const cpvCodes = [
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '03000000',
        description: 'Agricultural, farming, fishing, forestry and related products',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '09000000',
        description: 'Petroleum products, fuel, electricity and other sources of energy',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '15000000',
        description: 'Food, beverages, tobacco and related products',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '22000000',
        description: 'Printed matter and related products',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '30000000',
        description: 'Office and computing machinery, equipment and supplies except furniture and software packages',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '31000000',
        description: 'Electrical machinery, apparatus, equipment and consumables; lighting',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '32000000',
        description: 'Radio, television, communication, telecommunication and related equipment',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '34000000',
        description: 'Transport equipment and auxiliary products to transportation',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '38000000',
        description: 'Laboratory, optical and precision equipments (excludes glasses)',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '45000000',
        description: 'Construction work',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '48000000',
        description: 'Software package and information systems',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '50000000',
        description: 'Repair and maintenance services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '51000000',
        description: 'Installation services (except software)',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '55000000',
        description: 'Hotel, restaurant and retail trade services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '60000000',
        description: 'Transport services (excl. Waste transport)',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '63000000',
        description: 'Supporting and auxiliary transport services; travel agencies services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '64000000',
        description: 'Postal and telecommunications services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '71000000',
        description: 'Architectural, construction, engineering and inspection services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '72000000',
        description: 'IT services: consulting, software development, Internet and support',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '73000000',
        description: 'Research and development services and related consultancy services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '75000000',
        description: 'Administration, defence and social security services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '79000000',
        description: 'Business services: law, marketing, consulting, recruitment, printing and security',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '80000000',
        description: 'Education and training services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '85000000',
        description: 'Health and social work services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '90000000',
        description: 'Sewage, refuse, cleaning and environmental services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        code: '92000000',
        description: 'Recreational, cultural and sporting services',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('cpv_codes', cpvCodes);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('cpv_codes', null, {});
  }
};
