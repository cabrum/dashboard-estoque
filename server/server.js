
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const dataPath = path.join(__dirname, 'data.json');

// Rota para obter os dados do estoque
app.get('/api/stock', (req, res) => {
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Erro ao ler os dados do estoque.');
      return;
    }
    res.send(JSON.parse(data));
  });
});

// Rota para atualizar os dados do estoque
app.put('/api/stock', (req, res) => {
  const newStock = req.body;
  fs.writeFile(dataPath, JSON.stringify(newStock, null, 2), (err) => {
    if (err) {
      res.status(500).send('Erro ao salvar os dados do estoque.');
      return;
    }
    res.send('Estoque atualizado com sucesso!');
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

