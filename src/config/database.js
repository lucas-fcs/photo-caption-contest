require('./env');

const common = {
  dialect: 'postgres',
  // Record executed seeders in the "SequelizeData" table, so running
  // db:seed:all twice does not insert duplicates (the default is to track nothing).
  seederStorage: 'sequelize',
  define: {
    underscored: true,
  },
};

const local = {
  ...common,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

module.exports = {
  development: {
    ...local,
    database: process.env.DB_NAME,
  },
  test: {
    ...local,
    database: process.env.DB_NAME_TEST,
    logging: false,
  },
  production: {
    ...common,
    use_env_variable: 'DATABASE_URL',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: true },
    },
  },
};
