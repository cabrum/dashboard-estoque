document.addEventListener('DOMContentLoaded', () => {
  const dashboardContainer = document.getElementById('dashboard-container');
  const refreshButton = document.getElementById('refresh-button');
  const locationNav = document.getElementById('location-nav');
  const exportButton = document.getElementById('export-button');
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-select');
  const reportsButton = document.getElementById('reports-button');
  const reportsModal = document.getElementById('reports-modal');
  const closeModal = document.querySelector('.close');
  const exportDetailedBtn = document.getElementById('export-detailed-btn');
  const exportSummaryBtn = document.getElementById('export-summary-btn');
  const provisionamentoModal = document.getElementById('provisionamento-modal');
  const produtoSelect = document.getElementById('produto-select');
  const quantidadeProvisionada = document.getElementById('quantidade-provisionada');
  const tecnicoResponsavel = document.getElementById('tecnico-responsavel');
  const dataPrevista = document.getElementById('data-prevista');
  const observacoes = document.getElementById('observacoes');
  const adicionarProvisionadoBtn = document.getElementById('adicionar-provisionado');
  const limparFormBtn = document.getElementById('limpar-form');
  const provisionadosContainer = document.getElementById('provisionados-container');
  
  let stockData = [];
  let currentLocation = 'Estoque Geral'; // Default location
  let filteredData = [];
  let provisionadosData = []; // Array para armazenar provisionamentos

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
    } else if (currentLocation === 'Provisionado') {
      renderProvisionadosDashboard();
      return;
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
          <th>Provisionado</th>
          <th>Status</th>
          <th>Responsável</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${itemsForCurrentLocation.map(item => {
          const provisionado = getProvisionadoByProduto(item.produto);
          return `
          <tr data-id="${item.id}">
            <td>${item.produto}</td>
            <td data-field="quantidade">${item.quantidade}</td>
            <td>${provisionado ? provisionado.quantidade : '-'}</td>
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
        `;}).join('')}
      </tbody>
    `;
    card.appendChild(table);
    dashboardContainer.appendChild(card);
  };

  const renderProvisionadosDashboard = () => {
    dashboardContainer.innerHTML = '';

    if (provisionadosData.length === 0) {
      dashboardContainer.innerHTML = '<p>Nenhum item provisionado encontrado.</p>';
      return;
    }

    const card = document.createElement('div');
    card.className = 'location-card';

    const title = document.createElement('h2');
    title.textContent = 'Provisionado';
    card.appendChild(title);

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Produto</th>
          <th>Quantidade</th>
          <th>Técnico</th>
          <th>Data Prevista</th>
          <th>Observações</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${provisionadosData.map((item, index) => `
          <tr data-id="${index}">
            <td>${item.produto}</td>
            <td>${item.quantidade}</td>
            <td>${item.tecnico}</td>
            <td>${item.dataPrevista}</td>
            <td>${item.observacoes || '-'}</td>
            <td>
              <button class="remover-provisionado" data-index="${index}">Remover</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
    card.appendChild(table);
    dashboardContainer.appendChild(card);
  };

  const getProvisionadoByProduto = (produto) => {
    return provisionadosData.find(item => item.produto === produto);
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
    // Agrupar dados por produto e somar quantidades
    const aggregatedData = {};
    
    data.forEach(item => {
      if (!aggregatedData[item.produto]) {
        aggregatedData[item.produto] = {
          produto: item.produto,
          quantidadeTotal: 0
        };
      }
      aggregatedData[item.produto].quantidadeTotal += item.quantidade;
    });

    // Converter para array e ordenar por quantidade (maior para menor)
    const sortedData = Object.values(aggregatedData).sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);

    // Criar CSV simplificado
    const headers = ['Produto', 'Quantidade Total'];
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of sortedData) {
        const values = [
          row.produto,
          row.quantidadeTotal
        ];
        
        const escapedValues = values.map(val => {
            const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
            return `"${escaped}"`;
        });
        csvRows.push(escapedValues.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'estoque_resumido.csv');
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

  // Função de busca e filtro
  const applyFilters = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;

    let dataToFilter = stockData;

    // Aplicar filtro de localização
    if (currentLocation !== 'Estoque Geral') {
      dataToFilter = dataToFilter.filter(item => item.local === currentLocation);
    } else {
      // Para Estoque Geral, agregar dados
      const aggregatedStock = {};
      dataToFilter.forEach(item => {
        if (item.local !== 'Estoque Geral') {
          if (!aggregatedStock[item.produto]) {
            aggregatedStock[item.produto] = { ...item, quantidade: 0, responsavel: '' };
          }
          aggregatedStock[item.produto].quantidade += item.quantidade;
        }
      });
      dataToFilter = Object.values(aggregatedStock);
    }

    // Aplicar busca por produto
    if (searchTerm) {
      dataToFilter = dataToFilter.filter(item => 
        item.produto.toLowerCase().includes(searchTerm)
      );
    }

    // Aplicar filtro por nível de estoque
    if (filterValue !== 'all') {
      dataToFilter = dataToFilter.filter(item => {
        if (filterValue === 'low-estoque') return item.quantidade < 50;
        if (filterValue === 'medium-estoque') return item.quantidade >= 50 && item.quantidade < 70;
        if (filterValue === 'high-estoque') return item.quantidade >= 70;
        return true;
      });
    }

    filteredData = dataToFilter;
    renderFilteredDashboard();
  };

  const renderFilteredDashboard = () => {
    dashboardContainer.innerHTML = '';

    if (!filteredData || filteredData.length === 0) {
      dashboardContainer.innerHTML = '<p>Nenhum item encontrado com os filtros aplicados.</p>';
      return;
    }

    const card = document.createElement('div');
    card.className = 'location-card';

    const title = document.createElement('h2');
    title.textContent = currentLocation + (searchInput.value || filterSelect.value !== 'all' ? ' (Filtrado)' : '');
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
        ${filteredData.map(item => `
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

  // Event listeners para busca e filtro
  searchInput.addEventListener('input', applyFilters);
  filterSelect.addEventListener('change', applyFilters);

  // Funções para relatórios e estatísticas
  const generateStatistics = () => {
    try {
      if (!stockData || stockData.length === 0) {
        document.getElementById('total-products').textContent = '0';
        document.getElementById('total-quantity').textContent = '0';
        document.getElementById('low-stock-items').textContent = '0';
        document.getElementById('active-locations').textContent = '0';
        return;
      }

      const uniqueProducts = new Set(stockData.map(item => item.produto)).size;
      const totalQuantity = stockData.reduce((sum, item) => sum + item.quantidade, 0);
      const lowStockItems = stockData.filter(item => item.quantidade < 50).length;
      const uniqueLocations = new Set(stockData.map(item => item.local)).size;

      document.getElementById('total-products').textContent = uniqueProducts;
      document.getElementById('total-quantity').textContent = totalQuantity.toLocaleString();
      document.getElementById('low-stock-items').textContent = lowStockItems;
      document.getElementById('active-locations').textContent = uniqueLocations;
    } catch (error) {
      console.error('Erro ao gerar estatísticas:', error);
      document.getElementById('total-products').textContent = 'Erro';
      document.getElementById('total-quantity').textContent = 'Erro';
      document.getElementById('low-stock-items').textContent = 'Erro';
      document.getElementById('active-locations').textContent = 'Erro';
    }
  };

  const exportDetailedReport = () => {
    try {
      if (!stockData || stockData.length === 0) {
        alert('Nenhum dado disponível para exportar.');
        return;
      }

      const headers = ['ID', 'Produto', 'Quantidade', 'Local', 'Responsável', 'Status'];
      const csvRows = [];
      csvRows.push(headers.join(','));

      const sortedData = [...stockData].sort((a, b) => a.local.localeCompare(b.local) || a.produto.localeCompare(b.produto));

      for (const item of sortedData) {
        const status = item.quantidade < 50 ? 'Baixo' : item.quantidade < 70 ? 'Revisar' : 'OK';
        const values = [
          item.id,
          item.produto,
          item.quantidade,
          item.local,
          item.responsavel || '',
          status
        ];
        
        const escapedValues = values.map(val => {
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(escapedValues.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'relatorio_detalhado_estoque.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar relatório detalhado:', error);
      alert('Erro ao exportar relatório detalhado. Verifique o console para mais detalhes.');
    }
  };

  const exportSummaryReport = () => {
    try {
      if (!stockData || stockData.length === 0) {
        alert('Nenhum dado disponível para exportar.');
        return;
      }

      // Agrupar por local
      const locationSummary = {};
      
      stockData.forEach(item => {
        if (!locationSummary[item.local]) {
          locationSummary[item.local] = {
            local: item.local,
            totalItens: 0,
            totalQuantidade: 0,
            itensBaixoEstoque: 0
          };
        }
        locationSummary[item.local].totalItens++;
        locationSummary[item.local].totalQuantidade += item.quantidade;
        if (item.quantidade < 50) {
          locationSummary[item.local].itensBaixoEstoque++;
        }
      });

      const headers = ['Local', 'Total de Itens', 'Quantidade Total', 'Itens com Estoque Baixo'];
      const csvRows = [];
      csvRows.push(headers.join(','));

      const sortedLocations = Object.values(locationSummary).sort((a, b) => a.local.localeCompare(b.local));

      for (const location of sortedLocations) {
        const values = [
          location.local,
          location.totalItens,
          location.totalQuantidade,
          location.itensBaixoEstoque
        ];
        
        const escapedValues = values.map(val => {
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(escapedValues.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'resumo_por_local.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar resumo por local:', error);
      alert('Erro ao exportar resumo por local. Verifique o console para mais detalhes.');
    }
  };

  // Event listeners para modal de relatórios
  reportsButton.addEventListener('click', () => {
    generateStatistics();
    reportsModal.classList.remove('hidden');
  });

  closeModal.addEventListener('click', () => {
    reportsModal.classList.add('hidden');
  });

  window.addEventListener('click', (event) => {
    if (event.target === reportsModal) {
      reportsModal.classList.add('hidden');
    }
  });

  exportDetailedBtn.addEventListener('click', () => {
    exportDetailedReport();
    reportsModal.classList.add('hidden');
  });

  exportSummaryBtn.addEventListener('click', () => {
    exportSummaryReport();
    reportsModal.classList.add('hidden');
  });

  // Funções para o sistema de provisionamento
  const populateProdutoSelect = () => {
    produtoSelect.innerHTML = '<option value="">Selecione um produto...</option>';
    
    const uniqueProducts = [...new Set(stockData.map(item => item.produto))].sort();
    uniqueProducts.forEach(produto => {
      const option = document.createElement('option');
      option.value = produto;
      option.textContent = produto;
      produtoSelect.appendChild(option);
    });
  };

  const addProvisionado = () => {
    const produto = produtoSelect.value;
    const quantidade = parseInt(quantidadeProvisionada.value);
    const tecnico = tecnicoResponsavel.value;
    const data = dataPrevista.value;
    const obs = observacoes.value;

    if (!produto || !quantidade || !tecnico || !data) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const provisionado = {
      produto,
      quantidade,
      tecnico,
      dataPrevista: data,
      observacoes: obs
    };

    provisionadosData.push(provisionado);
    renderProvisionadosList();
    limparForm();
    renderDashboard(); // Atualizar as tabelas para mostrar os provisionados
  };

  const limparForm = () => {
    produtoSelect.value = '';
    quantidadeProvisionada.value = '';
    tecnicoResponsavel.value = '';
    dataPrevista.value = '';
    observacoes.value = '';
  };

  const renderProvisionadosList = () => {
    provisionadosContainer.innerHTML = '';

    if (provisionadosData.length === 0) {
      provisionadosContainer.innerHTML = '<p>Nenhum provisionamento ativo.</p>';
      return;
    }

    provisionadosData.forEach((item, index) => {
      const provisionadoDiv = document.createElement('div');
      provisionadoDiv.className = 'provisionado-item';
      provisionadoDiv.innerHTML = `
        <div class="provisionado-header">
          <span class="provisionado-produto">${item.produto}</span>
          <span class="provisionado-quantidade">${item.quantidade} und</span>
        </div>
        <div class="provisionado-detalhes">
          <div class="provisionado-detalhe">
            <strong>Técnico:</strong> ${item.tecnico}
          </div>
          <div class="provisionado-detalhe">
            <strong>Data:</strong> ${item.dataPrevista}
          </div>
          ${item.observacoes ? `
          <div class="provisionado-detalhe">
            <strong>Obs:</strong> ${item.observacoes}
          </div>
          ` : ''}
        </div>
        <button class="remover-provisionado" data-index="${index}">Remover</button>
      `;
      provisionadosContainer.appendChild(provisionadoDiv);
    });
  };

  const removeProvisionado = (index) => {
    provisionadosData.splice(index, 1);
    renderProvisionadosList();
    renderDashboard(); // Atualizar as tabelas
  };

  // Event listeners para o sistema de provisionamento
  locationNav.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName === 'BUTTON') {
      currentLocation = target.getAttribute('data-location');
      
      // Update active button
      document.querySelectorAll('.location-button').forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');
      
      if (currentLocation === 'Provisionado') {
        populateProdutoSelect();
      }
      
      renderDashboard();
    }
  });

  // Event listener para o botão Provisionado
  const provisionadoButton = document.querySelector('button[data-location="Provisionado"]');
  if (provisionadoButton) {
    provisionadoButton.addEventListener('click', () => {
      populateProdutoSelect();
      provisionamentoModal.classList.remove('hidden');
      renderProvisionadosList();
    });
  }

  // Event listeners para o modal de provisionamento
  const provisionamentoClose = provisionamentoModal.querySelector('.close');
  provisionamentoClose.addEventListener('click', () => {
    provisionamentoModal.classList.add('hidden');
  });

  window.addEventListener('click', (event) => {
    if (event.target === provisionamentoModal) {
      provisionamentoModal.classList.add('hidden');
    }
  });

  adicionarProvisionadoBtn.addEventListener('click', addProvisionado);
  limparFormBtn.addEventListener('click', limparForm);

  // Event listener para remover provisionados da lista
  provisionadosContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('remover-provisionado')) {
      const index = parseInt(event.target.getAttribute('data-index'));
      removeProvisionado(index);
    }
  });

  // Event listener para remover provisionados da tabela
  dashboardContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('remover-provisionado')) {
      const index = parseInt(event.target.getAttribute('data-index'));
      removeProvisionado(index);
    }
  });

  // Modificar o fetchStock para atualizar o select quando os dados forem carregados
  const originalFetchStock = fetchStock;
  fetchStock = async () => {
    await originalFetchStock();
    populateProdutoSelect();
  };

  // Modificar o renderDashboard para usar filtros quando aplicável
  const originalRenderDashboard = renderDashboard;
  renderDashboard = () => {
    if (searchInput.value || filterSelect.value !== 'all') {
      applyFilters();
    } else {
      originalRenderDashboard();
    }
  };

  // Carregar dados automaticamente ao iniciar a página
  console.log('Carregando dados iniciais do estoque...');
  fetchStock();
});
