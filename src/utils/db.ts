import { Pool } from 'pg';
import { ENV } from '../constant';

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});

export default pool;
