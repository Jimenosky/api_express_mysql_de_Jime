const User = require('../models/User');

(async () => {
  try {
    const email = process.argv[2] || 'juan.perez@ejemplo.com';
    const user = await User.findByEmailWithPassword(email);
    console.log('User fetched:', user ? { id: user.id, email: user.email, hasPassword: !!user.password } : null);
  } catch (e) {
    console.error('Test error:', e.message);
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
