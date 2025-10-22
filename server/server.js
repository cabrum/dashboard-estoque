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

// Rotas para provisionamento
app.get('/api/provisioning', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM provisioning ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('ERROR FETCHING FROM DB:', err);
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
    console.error('ERROR INSERTING INTO DB:', err);
    res.status(500).send('Error saving provisioning data.');
  }
});

app.delete('/api/provisioning/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM provisioning WHERE id = $1', [id]);
    res.status(204).send(); // No content
  } catch (err) {
    console.error('ERROR DELETING FROM DB:', err);
    res.status(500).send('Error deleting provisioning data.');
  }
});

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Rota para servir o index.html para qualquer outra rota
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});