const express = require('express');
const path = require('path');
const pool = require('./db'); // Import the pool

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const initDatabaseIfNeeded = async () => {
  const client = await pool.connect();
  try {
    // Try to select from stock
    const result = await client.query('SELECT COUNT(*) as count FROM stock');
    if (parseInt(result.rows[0].count) === 0) {
      console.log('Stock table is empty, initializing...');
      await initializeDatabase(client);
    }
  } catch (err) {
    console.log('Stock table does not exist or error, initializing database...');
    await initializeDatabase(client);
  } finally {
    client.release();
  }
};

const initializeDatabase = async (client) => {
  const fs = require('fs');
  const path = require('path');
  const dataPath = path.join(__dirname, 'data.json');
  const stockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  try {
    await client.query('DROP TABLE IF EXISTS logs');
    await client.query('DROP TABLE IF EXISTS provisioning');
    await client.query('DROP TABLE IF EXISTS stock');
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
    for (const item of stockData) {
      await client.query(
        'INSERT INTO stock (id, produto, quantidade, local, responsavel) VALUES ($1, $2, $3, $4, $5)',
        [item.id, item.produto, item.quantidade, item.local, item.responsavel]
      );
    }
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// Rota para obter os dados do estoque
app.get('/api/stock', async (req, res) => {
  console.log('Request received for /api/stock');
  try {
    const { rows } = await pool.query('SELECT * FROM stock ORDER BY id ASC');
    console.log('Successfully fetched stock data from DB.');
    res.json(rows);
  } catch (err) {
    console.error('ERROR FETCHING FROM DB:', err);
    res.status(500).send('Error reading stock data.');
  }
});

// Rota para atualizar os dados do estoque
app.put('/api/stock', async (req, res) => {
  const newStock = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    // Buscar estoque atual para comparar
    const { rows: currentStock } = await client.query('SELECT id, quantidade, responsavel, produto, local FROM stock');
    const currentStockMap = new Map(currentStock.map(item => [item.id, item]));

    for (const item of newStock) {
      const oldItem = currentStockMap.get(item.id);
      if (oldItem) {
        const quantidadeDiff = item.quantidade - oldItem.quantidade;
        if (quantidadeDiff !== 0) {
          const tipo = quantidadeDiff > 0 ? 'adição' : 'retirada';
          await client.query(
            'INSERT INTO logs (produto, quantidade_alterada, tipo, responsavel, local) VALUES ($1, $2, $3, $4, $5)',
            [item.produto, Math.abs(quantidadeDiff), tipo, item.responsavel || oldItem.responsavel, item.local]
          );
        }
      }

      await client.query(
        'UPDATE stock SET quantidade = $1, responsavel = $2 WHERE id = $3',
        [item.quantidade, item.responsavel, item.id]
      );
    }

    await client.query('COMMIT'); // Commit transaction
    res.send('Stock updated successfully!');
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('ERROR UPDATING DB:', err);
    res.status(500).send('Error saving stock data.');
  } finally {
    client.release();
  }
});


// Rotas para provisionamento
app.get('/api/provisioning', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM provisioning ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('ERROR FETCHING PROVISIONING DATA:', err);
    res.status(500).send('Error reading provisioning data.');
  }
});

app.post('/api/provisioning', async (req, res) => {
  const { produto, quantidade, tecnico, data_prevista, observacoes } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO provisioning (produto, quantidade, tecnico, data_prevista, observacoes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [produto, quantidade, tecnico, data_prevista, observacoes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('ERROR INSERTING PROVISIONING DATA:', err);
    res.status(500).send('Error saving provisioning data.');
  }
});

app.delete('/api/provisioning/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM provisioning WHERE id = $1', [id]);
    res.send('Provisioning item deleted successfully!');
  } catch (err) {
    console.error('ERROR DELETING PROVISIONING DATA:', err);
    res.status(500).send('Error deleting provisioning data.');
  }
});

// Rota para obter os logs
app.get('/api/logs', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM logs ORDER BY data_hora DESC');
    res.json(rows);
  } catch (err) {
    console.error('ERROR FETCHING LOGS:', err);
    res.status(500).send('Error reading logs data.');
  }
});

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Rota para servir o index.html para qualquer outra rota
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDatabaseIfNeeded();
});