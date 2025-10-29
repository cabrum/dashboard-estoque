
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
    await client.query('DROP TABLE IF EXISTS stock;');
    await client.query('DROP TABLE IF EXISTS provisioning;');

    // Create table
    await client.query(`
      CREATE TABLE stock (
        id SERIAL PRIMARY KEY,
        produto VARCHAR(255) NOT NULL,
        quantidade INTEGER NOT NULL,
        local VARCHAR(255) NOT NULL,
        responsavel VARCHAR(255)
      );
    `);

    await client.query(`
      CREATE TABLE provisioning (
        id SERIAL PRIMARY KEY,
        produto VARCHAR(255) NOT NULL,
        quantidade INTEGER NOT NULL,
        tecnico VARCHAR(255) NOT NULL,
        data_prevista DATE NOT NULL,
        observacoes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE logs (
        id SERIAL PRIMARY KEY,
        produto VARCHAR(255) NOT NULL,
        quantidade_alterada INTEGER NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        responsavel VARCHAR(255),
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        local VARCHAR(255)
      );
    `);

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

initDatabase();
