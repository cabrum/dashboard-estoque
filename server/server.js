
const express = require('express');
const fs = require('fs');
const fs = require('fs/promises');
const path = require('path');
const { Parser } = require('json2csv');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const dataPath = path.join(__dirname, 'data.json');

// Rota para obter os dados do estoque
app.get('/api/stock', (req, res) => {
app.get('/api/stock', async (req, res) => {
  console.log('Recebida requisição para /api/stock');
  console.log('Caminho do arquivo de dados:', dataPath);
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('ERRO AO LER data.json:', err);
      res.status(500).send('Erro ao ler os dados do estoque.');
      return;
    }
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    console.log('Sucesso ao ler data.json, enviando dados.');
    res.send(JSON.parse(data));
  });
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('ERRO AO LER OU PARSEAR data.json:', error);
    res.status(500).send('Erro ao ler os dados do estoque.');
  }
});

// Rota para atualizar os dados do estoque
app.put('/api/stock', (req, res) => {
app.put('/api/stock', async (req, res) => {
  const newStock = req.body;
  fs.writeFile(dataPath, JSON.stringify(newStock, null, 2), (err) => {
    if (err) {
      res.status(500).send('Erro ao salvar os dados do estoque.');
      return;
    }
  try {
    await fs.writeFile(dataPath, JSON.stringify(newStock, null, 2), 'utf8');
    res.send('Estoque atualizado com sucesso!');
  });
  } catch (error) {
    console.error('ERRO AO ESCREVER em data.json:', error);
    res.status(500).send('Erro ao salvar os dados do estoque.');
  }
});

// Rota para baixar o relatório em CSV
app.get('/api/stock/download', async (req, res) => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    const stockData = JSON.parse(data);
    const parser = new Parser({ bom: true }); // bom: true para melhor compatibilidade com Excel
    const csv = parser.parse(stockData);
    res.header('Content-Type', 'text/csv');
    res.attachment('relatorio_estoque.csv');
    res.send(csv);
  } catch (error) {
    console.error('ERRO ao gerar CSV:', error);
    res.status(500).send('Erro ao gerar o relatório.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

