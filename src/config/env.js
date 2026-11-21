// Loads variables from .env with Node's native parser (no dotenv dependency).
//
// Why not process.loadEnvFile()? Jest runs each test file in a sandbox with its
// own copy of process.env, and loadEnvFile writes to the real one, so tests would
// never see the values. Assigning to process.env directly works everywhere.
//
// Variables already set (e.g. by Render's dashboard) always win over the file.
// In production there is no .env file, so a missing file is expected.
const fs = require('fs');
const path = require('path');
const { parseEnv } = require('util');

const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');

let content;
try {
  content = fs.readFileSync(ENV_PATH, 'utf8');
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

if (content) {
  for (const [key, value] of Object.entries(parseEnv(content))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
