document.addEventListener('DOMContentLoaded', () => {
  const dashboardContainer = document.getElementById('dashboard-container');
  const refreshButton = document.getElementById('refresh-button');
  const locationNav = document.getElementById('location-nav');
  const exportButton = document.getElementById('export-button');
  
  let stockData = [];
  let currentLocation = 'Estoque Geral'; // Default location

  const fetchStock = async () => {
    try {
      const response = await fetch('/api/stock');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      stockData = await response.json();
      renderDashboard();
    } catch (error) {
      console.error('Erro ao buscar dados do estoque:', error);
      dashboardContainer.innerHTML = `<p style="color: red;">Erro ao carregar o estoque: ${error.message}.</p>`;
    }
  };

  const renderDashboard = () => {
    dashboardContainer.innerHTML = '';

    if (!stockData || stockData.length === 0) {
      dashboardContainer.innerHTML = '<p>Nenhum dado de estoque encontrado.</p>';
      return;
    }

    let itemsForCurrentLocation;

    if (currentLocation === 'Estoque Geral') {
      const aggregatedStock = {};
      stockData.forEach(item => {
        if (item.local !== 'Estoque Geral') {
          if (!aggregatedStock[item.produto]) {
            aggregatedStock[item.produto] = { ...item, quantidade: 0, responsavel: '' };
          }
          aggregatedStock[item.produto].quantidade += item.quantidade;
        }
      });
      itemsForCurrentLocation = Object.values(aggregatedStock);
    } else {
      const groupedByLocation = stockData.reduce((acc, item) => {
        acc[item.local] = acc[item.local] || [];
        acc[item.local].push(item);
        return acc;
      }, {});
      itemsForCurrentLocation = groupedByLocation[currentLocation] || [];
    }

    if (itemsForCurrentLocation.length === 0) {
      dashboardContainer.innerHTML = `<p>Nenhum item encontrado para ${currentLocation}.</p>`;
      return;
    }

    const card = document.createElement('div');
    card.className = 'location-card';

    const title = document.createElement('h2');
    title.textContent = currentLocation;
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
        ${itemsForCurrentLocation.map(item => `
          <tr data-id="${item.id}">
            <td>${item.produto}</td>
            <td data-field="quantidade">${item.quantidade}</td>
            <td>
              <button class="status-button ${item.quantidade < 50 ? 'status-red' : item.quantidade < 70 ? 'status-yellow' : 'status-green'}">
                ${item.quantidade < 50 ? 'Baixo' : item.quantidade < 70 ? 'Revisar' : 'OK'}
              </button>
            </td>
            <td data-field="responsavel">${item.responsavel || ''}</td>
            <td>
              ${currentLocation !== 'Estoque Geral' ? 
                `<button class="edit-button">Editar</button>
                <button class="save-button hidden">Salvar</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
    card.appendChild(table);
    dashboardContainer.appendChild(card);
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

      target.classList.add('hidden');
      row.querySelector('.save-button').classList.remove('hidden');
    }

    if (target.classList.contains('save-button')) {
      const quantityInput = row.querySelector('input[type="number"]');
      const responsibleInput = row.querySelector('input[type="text"]');

      item.quantidade = parseInt(quantityInput.value) || 0;
      item.responsavel = responsibleInput.value;

      updateStock().then(fetchStock);
    }
  });

  locationNav.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName === 'BUTTON') {
      currentLocation = target.getAttribute('data-location');
      
      // Update active button
      document.querySelectorAll('.location-button').forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');
      
      renderDashboard();
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener('click', fetchStock);
  }

  const exportToCsv = (data) => {
    const headers = ['id', 'produto', 'quantidade', 'local', 'responsavel'];
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] === null || row[header] === undefined ? '' : row[header];
            const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'estoque.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (exportButton) {
    exportButton.addEventListener('click', () => {
        exportToCsv(stockData);
    });
  }

  fetchStock();
});