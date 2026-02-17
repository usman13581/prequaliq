'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const nutsCodes = [
      // NUTS 1 (3 regions)
      { code: 'SE1', name: 'East Sweden', nameSwedish: 'Östra Sverige', level: 1, parentCode: null },
      { code: 'SE2', name: 'South Sweden', nameSwedish: 'Södra Sverige', level: 1, parentCode: null },
      { code: 'SE3', name: 'North Sweden', nameSwedish: 'Norra Sverige', level: 1, parentCode: null },
      
      // NUTS 2 (8 areas)
      { code: 'SE11', name: 'Stockholm', nameSwedish: 'Stockholm', level: 2, parentCode: 'SE1' },
      { code: 'SE12', name: 'East Middle Sweden', nameSwedish: 'Östra Mellansverige', level: 2, parentCode: 'SE1' },
      { code: 'SE21', name: 'Småland and the islands', nameSwedish: 'Småland med öarna', level: 2, parentCode: 'SE2' },
      { code: 'SE22', name: 'South Sweden', nameSwedish: 'Sydsverige', level: 2, parentCode: 'SE2' },
      { code: 'SE23', name: 'West Sweden', nameSwedish: 'Västsverige', level: 2, parentCode: 'SE2' },
      { code: 'SE31', name: 'North Middle Sweden', nameSwedish: 'Norra Mellansverige', level: 2, parentCode: 'SE3' },
      { code: 'SE32', name: 'Middle Norrland', nameSwedish: 'Mellersta Norrland', level: 2, parentCode: 'SE3' },
      { code: 'SE33', name: 'Upper Norrland', nameSwedish: 'Övre Norrland', level: 2, parentCode: 'SE3' },
      
      // NUTS 3 (21 counties)
      { code: 'SE110', name: 'Stockholm County', nameSwedish: 'Stockholms län', level: 3, parentCode: 'SE11' },
      { code: 'SE121', name: 'Uppsala County', nameSwedish: 'Uppsala län', level: 3, parentCode: 'SE12' },
      { code: 'SE122', name: 'Södermanland County', nameSwedish: 'Södermanlands län', level: 3, parentCode: 'SE12' },
      { code: 'SE123', name: 'Östergötland County', nameSwedish: 'Östergötlands län', level: 3, parentCode: 'SE12' },
      { code: 'SE124', name: 'Örebro County', nameSwedish: 'Örebro län', level: 3, parentCode: 'SE12' },
      { code: 'SE125', name: 'Västmanland County', nameSwedish: 'Västmanlands län', level: 3, parentCode: 'SE12' },
      { code: 'SE211', name: 'Jönköping County', nameSwedish: 'Jönköpings län', level: 3, parentCode: 'SE21' },
      { code: 'SE212', name: 'Kronoberg County', nameSwedish: 'Kronobergs län', level: 3, parentCode: 'SE21' },
      { code: 'SE213', name: 'Kalmar County', nameSwedish: 'Kalmar län', level: 3, parentCode: 'SE21' },
      { code: 'SE214', name: 'Gotland County', nameSwedish: 'Gotlands län', level: 3, parentCode: 'SE21' },
      { code: 'SE221', name: 'Blekinge County', nameSwedish: 'Blekinge län', level: 3, parentCode: 'SE22' },
      { code: 'SE224', name: 'Skåne County', nameSwedish: 'Skåne län', level: 3, parentCode: 'SE22' },
      { code: 'SE231', name: 'Halland County', nameSwedish: 'Hallands län', level: 3, parentCode: 'SE23' },
      { code: 'SE232', name: 'Västra Götaland County', nameSwedish: 'Västra Götalands län', level: 3, parentCode: 'SE23' },
      { code: 'SE311', name: 'Värmland County', nameSwedish: 'Värmlands län', level: 3, parentCode: 'SE31' },
      { code: 'SE312', name: 'Dalarna County', nameSwedish: 'Dalarnas län', level: 3, parentCode: 'SE31' },
      { code: 'SE313', name: 'Gävleborg County', nameSwedish: 'Gävleborgs län', level: 3, parentCode: 'SE31' },
      { code: 'SE321', name: 'Västernorrland County', nameSwedish: 'Västernorrlands län', level: 3, parentCode: 'SE32' },
      { code: 'SE322', name: 'Jämtland County', nameSwedish: 'Jämtlands län', level: 3, parentCode: 'SE32' },
      { code: 'SE331', name: 'Västerbotten County', nameSwedish: 'Västerbottens län', level: 3, parentCode: 'SE33' },
      { code: 'SE332', name: 'Norrbotten County', nameSwedish: 'Norrbottens län', level: 3, parentCode: 'SE33' }
    ];

    // Insert all NUTS codes
    for (const nutsCode of nutsCodes) {
      await queryInterface.bulkInsert('nuts_codes', [{
        ...nutsCode,
        id: Sequelize.literal('gen_random_uuid()'),
        createdAt: new Date(),
        updatedAt: new Date()
      }], {
        ignoreDuplicates: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('nuts_codes', null, {});
  }
};
