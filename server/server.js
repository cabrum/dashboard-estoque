const express = require('express');
const path = require('path');
const pool = require('./db'); // Import the pool

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

    for (const item of newStock) {
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

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Rota para servir o index.html para qualquer outra rota
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});