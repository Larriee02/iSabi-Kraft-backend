import 'dotenv/config';

const required = ['MONGODB_URI', 'JWT_SECRET', 'PAYSTACK_SECRET_KEY'];
const validateEnv = () => {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

export default validateEnv;