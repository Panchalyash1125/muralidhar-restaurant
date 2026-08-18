const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run admin:hash -- "your-strong-password"');
  process.exit(1);
}

bcrypt.hash(password, 12)
  .then(hash => {
    console.log(hash);
  })
  .catch(error => {
    console.error('Could not hash admin password:', error.message);
    process.exit(1);
  });
