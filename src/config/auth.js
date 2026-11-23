module.exports = {
  // bcrypt cost factor: each +1 doubles the hashing time.
  SALT_ROUNDS: 10,
  MIN_PASSWORD_LENGTH: 8,
  // bcrypt ignores everything after the 72nd byte, so longer passwords
  // would silently collide with any password sharing those first 72 bytes.
  MAX_PASSWORD_BYTES: 72,
};
