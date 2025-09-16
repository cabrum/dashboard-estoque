document.addEventListener('DOMContentLoaded', () => {
  const dashboardContainer = document.getElementById('dashboard-container');
  const downloadButton = document.getElementById('download-button');
  const refreshButton = document.getElementById('refresh-button');
  let stockData = [];

  const fetchStock = async () => {
    try {
      const response = await fetch('/api/stock');
      stockData = await response.json();
      renderDashboard();
    } catch (error) {
      console.error('Erro ao buscar dados do estoque:', error);
    }
  };

  const renderDashboard = () => {
    dashboardContainer.innerHTML = '';

    const groupedByLocation = stockData.reduce((acc, item) => {
      acc[item.local] = acc[item.local] || [];
      acc[item.local].push(item);
      return acc;
    }, {});

    for (const location in groupedByLocation) {
      const card = document.createElement('div');
      card.className = 'location-card';

      const title = document.createElement('h2');
      title.textContent = location;
      card.appendChild(title);

      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Status</th>
            <th>Responsável</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${groupedByLocation[location].map(item => `
            <tr data-id="${item.id}">
              <td>${item.produto}</td>
              <td data-field="quantidade">${item.quantidade}</td>
              <td>
                <button class="status-button ${item.quantidade < 50 ? 'status-red' : item.quantidade < 70 ? 'status-yellow' : 'status-green'}">
                  ${item.quantidade < 50 ? 'Baixo' : item.quantidade < 70 ? 'Revisar' : 'OK'}
                </button>
              </td>
              <td data-field="responsavel">${item.responsavel}</td>
              <td>
                <button class="edit-button">Editar</button>
                <button class="save-button" style="display:none;">Salvar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      `;
      card.appendChild(table);
      dashboardContainer.appendChild(card);
    }
  };

  const updateStock = async () => {
    try {
      await fetch('/api/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData),
      });
    } catch (error) {
      console.error('Erro ao atualizar o estoque:', error);
    }
  };

  dashboardContainer.addEventListener('click', (event) => {
    const target = event.target;
    const row = target.closest('tr');
    if (!row) return;

    const id = parseInt(row.getAttribute('data-id'));
    const item = stockData.find(d => d.id === id);

    if (target.classList.contains('edit-button')) {
      const quantityCell = row.querySelector('td[data-field="quantidade"]');
      const responsibleCell = row.querySelector('td[data-field="responsavel"]');

      quantityCell.innerHTML = `<input type="number" value="${item.quantidade}">`;
      responsibleCell.innerHTML = `<input type="text" value="${item.responsavel}">`;

      target.style.display = 'none';
      row.querySelector('.save-button').style.display = 'inline-block';
    }

    if (target.classList.contains('save-button')) {
      const quantityInput = row.querySelector('input[type="number"]');
      const responsibleInput = row.querySelector('input[type="text"]');

      item.quantidade = parseInt(quantityInput.value) || 0;
      item.responsavel = responsibleInput.value;

      updateStock().then(fetchStock);
    }
  });

  refreshButton.addEventListener('click', fetchStock);

  downloadButton.addEventListener('click', () => {
    if (stockData.length === 0) {
      alert('Não há dados para baixar.');
      return;
    }

    const headers = ['ID', 'Produto', 'Quantidade', 'Responsável', 'Local'];
    
    const escapeCell = (cell) => {
      const cellStr = String(cell == null ? '' : cell).replace(/"/g, '""');
      return `"${cellStr}"`;
    };

    const csvRows = stockData.map(item => {
      return [
        item.id,
        item.produto,
        item.quantidade,
        item.responsavel,
        item.local
      ].map(escapeCell).join(',');
    });

    const csvContent = [headers.map(escapeCell).join(','), ...csvRows].join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio_estoque.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  fetchStock();
});
