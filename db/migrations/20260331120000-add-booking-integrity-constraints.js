'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE availabilities
      DROP CONSTRAINT IF EXISTS availabilities_slots_nonnegative_chk;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE availabilities
      ADD CONSTRAINT availabilities_slots_nonnegative_chk
      CHECK ("slotsAvailable" >= 0);
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_availability_active_uniq
      ON bookings ("userId", "availabilityId")
      WHERE status <> 'cancelled';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS bookings_user_availability_active_uniq;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE availabilities
      DROP CONSTRAINT IF EXISTS availabilities_slots_nonnegative_chk;
    `);
  },
};
