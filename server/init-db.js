
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const dataPath = path.join(__dirname, 'data.json');
const stockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const initDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock (
        id SERIAL PRIMARY KEY,
        produto VARCHAR(255) NOT NULL,
        quantidade INTEGER NOT NULL,
        local VARCHAR(255) NOT NULL,
        responsavel VARCHAR(255)
      );
    `);

    // Check if table is empty
    const res = await client.query('SELECT COUNT(*) FROM stock');
    if (res.rows[0].count > 0) {
      console.log('Database already seeded.');
      return;
    }

    // Insert data
    for (const item of stockData) {
      await client.query(
        'INSERT INTO stock (id, produto, quantidade, local, responsavel) VALUES ($1, $2, $3, $4, $5)',
        [item.id, item.produto, item.quantidade, item.local, item.responsavel]
      );
    }

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Error initializing database', err);
  } finally {
    client.release();
  }
};

initDatabase().then(() => pool.end());
