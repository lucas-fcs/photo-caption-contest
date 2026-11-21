// Loads variables from .env using Node's native loader (no dotenv dependency).
// In production (Render) there is no .env file: variables come from the dashboard,
// so a missing file is expected and ignored.
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
