'use strict';

const SERVICES = [
  {
    name: 'Haircut',
    description: 'Classic haircut and styling session.',
    duration: 45,
    price: 35.0,
    active: true,
  },
  {
    name: 'Beard Trim',
    description: 'Detailed beard shaping and trim.',
    duration: 30,
    price: 20.0,
    active: true,
  },
  {
    name: 'Haircut + Beard',
    description: 'Combined grooming package.',
    duration: 60,
    price: 50.0,
    active: true,
  },
];

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existingServices] = await queryInterface.sequelize.query(
      `SELECT id, name FROM services WHERE name IN (:names)`,
      {
        replacements: { names: SERVICES.map((service) => service.name) },
      }
    );

    const existingByName = new Map(existingServices.map((service) => [service.name, service.id]));

    const servicesToInsert = SERVICES.filter((service) => !existingByName.has(service.name)).map((service) => ({
      ...service,
      createdAt: now,
      updatedAt: now,
    }));

    if (servicesToInsert.length > 0) {
      await queryInterface.bulkInsert('services', servicesToInsert);
    }

    const [allSeedServices] = await queryInterface.sequelize.query(
      `SELECT id, name FROM services WHERE name IN (:names)`,
      {
        replacements: { names: SERVICES.map((service) => service.name) },
      }
    );

    const serviceIdByName = new Map(allSeedServices.map((service) => [service.name, service.id]));

    const availabilityRows = [];
    for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      const dateString = formatDate(date);

      for (const service of SERVICES) {
        const serviceId = serviceIdByName.get(service.name);
        if (!serviceId) {
          continue;
        }

        availabilityRows.push(
          {
            serviceId,
            date: dateString,
            startTime: '09:00:00',
            endTime: '09:30:00',
            slotsAvailable: 2,
            createdAt: now,
            updatedAt: now,
          },
          {
            serviceId,
            date: dateString,
            startTime: '14:00:00',
            endTime: '14:30:00',
            slotsAvailable: 2,
            createdAt: now,
            updatedAt: now,
          }
        );
      }
    }

    const [existingAvailability] = await queryInterface.sequelize.query(
      `SELECT "serviceId", date, "startTime", "endTime" FROM availabilities WHERE "serviceId" IN (:serviceIds)`,
      {
        replacements: { serviceIds: Array.from(serviceIdByName.values()) },
      }
    );

    const existingAvailabilityKeys = new Set(
      existingAvailability.map(
        (row) => `${row.serviceId}|${formatDate(new Date(row.date))}|${row.startTime}|${row.endTime}`
      )
    );

    const availabilityToInsert = availabilityRows.filter((row) => {
      const key = `${row.serviceId}|${row.date}|${row.startTime}|${row.endTime}`;
      return !existingAvailabilityKeys.has(key);
    });

    if (availabilityToInsert.length > 0) {
      await queryInterface.bulkInsert('availabilities', availabilityToInsert);
    }
  },

  async down(queryInterface) {
    const [services] = await queryInterface.sequelize.query(
      `SELECT id FROM services WHERE name IN (:names)`,
      {
        replacements: { names: SERVICES.map((service) => service.name) },
      }
    );

    const serviceIds = services.map((service) => service.id);

    if (serviceIds.length > 0) {
      await queryInterface.bulkDelete('availabilities', {
        serviceId: serviceIds,
      });
    }

    await queryInterface.bulkDelete('services', {
      name: SERVICES.map((service) => service.name),
    });
  },
};
