'use strict';

// Files live in src/public/images/. They are generated placeholders
// and can be swapped for real photos, keeping the same filenames.
const IMAGES = [
  {
    title: 'Pier at sunset',
    filename: 'pier-sunset.jpg',
    alt_text: 'Illustration of a wooden pier over dark blue water, with a pale sun setting under an orange sky.',
    description: 'The last light of the day over a quiet pier. What is the pier thinking?',
  },
  {
    title: 'Mountain lake',
    filename: 'mountain-lake.jpg',
    alt_text: 'Illustration of two grey mountain peaks against a light blue sky, above a green valley.',
    description: 'Two peaks, one valley and a lot of silence.',
  },
  {
    title: 'City at night',
    filename: 'city-night.jpg',
    alt_text: 'Illustration of a city skyline at night, dark buildings with lit yellow windows and a full moon behind them.',
    description: 'Every lit window has a story. Give this skyline a caption.',
  },
  {
    title: 'Desert road',
    filename: 'desert-road.jpg',
    alt_text: 'Illustration of a grey road running straight to the horizon across orange desert, under a warm yellow sky.',
    description: 'A long road and nowhere in particular to be.',
  },
  {
    title: 'Forest trail',
    filename: 'forest-trail.jpg',
    alt_text: 'Illustration of a brown dirt trail between dark green pine trees, under a bright green sky.',
    description: 'A trail into the woods. Where does it lead?',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  IMAGES,

  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'images',
      IMAGES.map((image) => ({ ...image, created_at: now, updated_at: now })),
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('images', {
      filename: { [Sequelize.Op.in]: IMAGES.map((image) => image.filename) },
    });
  },
};
