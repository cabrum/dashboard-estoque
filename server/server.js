const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

const dataPath = path.join(__dirname, 'data.json');

// Rota para obter os dados do estoque
app.get('/api/stock', (req, res) => {
  console.log('Recebida requisição para /api/stock');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('ERRO AO LER data.json:', err);
      return res.status(500).send('Erro ao ler o arquivo de dados do estoque.');
    }
    try {
      const jsonData = JSON.parse(data);
      console.log('Sucesso ao ler e analisar data.json, enviando dados.');
      res.json(jsonData);
    } catch (parseErr) {
      console.error('ERRO AO ANALISAR JSON de data.json:', parseErr);
      res.status(500).send('Erro: O formato do arquivo de dados (data.json) é inválido.');
    }
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

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
