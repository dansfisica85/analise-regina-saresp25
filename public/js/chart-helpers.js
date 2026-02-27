/* Chart.js helpers and shared utilities */
const ChartHelpers = (() => {
  const COLORS = [
    '#3b82f6','#16a34a','#eab308','#dc2626','#8b5cf6',
    '#0891b2','#f97316','#ec4899','#14b8a6','#6366f1',
    '#84cc16','#f43f5e','#06b6d4','#a855f7','#22c55e',
    '#ef4444','#0ea5e9','#d946ef','#10b981','#f59e0b',
    '#6d28d9','#e11d48','#059669','#7c3aed','#ca8a04','#be123c'
  ];

  const LEVEL_COLORS = {
    'Avancado': '#16a34a',
    'Adequado': '#3b82f6',
    'Basico': '#eab308',
    'Abaixo do Basico': '#dc2626',
  };

  const LEVEL_LABELS = {
    'Avancado': 'Avançado',
    'Adequado': 'Adequado',
    'Basico': 'Básico',
    'Abaixo do Basico': 'Abaixo do Básico',
  };

  const charts = {};

  function destroy(id) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
  }

  function getCtx(canvasId) {
    destroy(canvasId);
    const el = document.getElementById(canvasId);
    if (!el) return null;
    return el.getContext('2d');
  }

  function shortName(name) {
    return name
      .replace(/^(PEI )?EE /, '')
      .replace(/Prof[ªa]?\. ?/g, '')
      .replace(/Dr\. ?/, '')
      .replace(/Dona /, '');
  }

  function createHBar(canvasId, labels, data, options = {}) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: options.colors || labels.map((_, i) => COLORS[i % COLORS.length]),
          borderWidth: 0,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.x}${options.suffix || ''}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: !!options.xLabel, text: options.xLabel || '' },
          },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });
    return charts[canvasId];
  }

  function createBar(canvasId, labels, datasets, options = {}) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, position: 'top' },
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { beginAtZero: true, title: { display: !!options.yLabel, text: options.yLabel || '' } },
        },
        ...options.chartOptions,
      },
    });
    return charts[canvasId];
  }

  function createStackedBar(canvasId, labels, datasets, options = {}) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${options.suffix || ''}`,
            },
          },
        },
        scales: {
          x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { stacked: true, beginAtZero: true, title: { display: !!options.yLabel, text: options.yLabel || '' } },
        },
      },
    });
    return charts[canvasId];
  }

  function createDoughnut(canvasId, labels, data, colors) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 12 } } },
        },
      },
    });
    return charts[canvasId];
  }

  function createGroupedBar(canvasId, labels, datasets, options = {}) {
    const ctx = getCtx(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
        },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { beginAtZero: true, title: { display: !!options.yLabel, text: options.yLabel || '' } },
        },
      },
    });
    return charts[canvasId];
  }

  return {
    COLORS, LEVEL_COLORS, LEVEL_LABELS,
    destroy, shortName,
    createHBar, createBar, createStackedBar, createDoughnut, createGroupedBar,
  };
})();
