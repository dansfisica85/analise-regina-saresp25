/* Comparison module */
const Comparison = (() => {
  let currentData = null;

  function init(data) {
    currentData = data;
    const container = document.getElementById('comparison-checkboxes');
    const sorted = Object.entries(data.schools).sort((a, b) => a[1].nome.localeCompare(b[1].nome));
    container.innerHTML = sorted.map(([code, s]) =>
      `<label><input type="checkbox" value="${code}"> ${s.nome} <small style="color:var(--text-light)">(${s.municipio})</small></label>`
    ).join('');

    document.getElementById('btn-compare').addEventListener('click', doCompare);
  }

  function doCompare() {
    const checked = Array.from(document.querySelectorAll('#comparison-checkboxes input:checked'));
    if (checked.length < 2) {
      alert('Selecione pelo menos 2 escolas para comparar.');
      return;
    }
    if (checked.length > 6) {
      alert('Selecione no máximo 6 escolas.');
      return;
    }
    const codes = checked.map(c => c.value);
    renderComparison(codes);
  }

  function renderComparison(codes) {
    const results = document.getElementById('comparison-results');
    const schools = codes.map(c => currentData.schools[c]);
    const names = schools.map(s => ChartHelpers.shortName(s.nome));

    // Table
    let tableHTML = `<table class="data-table" style="margin-bottom:1.5rem">
      <thead><tr><th>Indicador</th>${schools.map(s => `<th>${ChartHelpers.shortName(s.nome)}</th>`).join('')}</tr></thead><tbody>`;

    // EF proficiency
    tableHTML += `<tr><td><strong>Profic. LP (EF)</strong></td>${schools.map(s =>
      `<td>${s.ensino_fundamental ? (s.ensino_fundamental.totals.avg_profic_lp ?? '-') : '-'}</td>`
    ).join('')}</tr>`;
    tableHTML += `<tr><td><strong>Profic. MAT (EF)</strong></td>${schools.map(s =>
      `<td>${s.ensino_fundamental ? (s.ensino_fundamental.totals.avg_profic_mat ?? '-') : '-'}</td>`
    ).join('')}</tr>`;
    tableHTML += `<tr><td><strong>% Adeq.+Avanç. LP</strong></td>${schools.map(s =>
      `<td>${s.ensino_fundamental ? (s.ensino_fundamental.totals.pct_adequado_avancado_lp ?? '-') + '%' : '-'}</td>`
    ).join('')}</tr>`;
    tableHTML += `<tr><td><strong>% Adeq.+Avanç. MAT</strong></td>${schools.map(s =>
      `<td>${s.ensino_fundamental ? (s.ensino_fundamental.totals.pct_adequado_avancado_mat ?? '-') + '%' : '-'}</td>`
    ).join('')}</tr>`;

    // AF participation
    tableHTML += `<tr><td><strong>Participação AF</strong></td>${schools.map(s =>
      `<td>${s.anos_finais ? (s.anos_finais.totals.participation_rate_both * 100).toFixed(1) + '%' : '-'}</td>`
    ).join('')}</tr>`;

    // EM participation
    tableHTML += `<tr><td><strong>Participação EM</strong></td>${schools.map(s =>
      `<td>${s.ensino_medio ? (s.ensino_medio.totals.participation_rate_both * 100).toFixed(1) + '%' : '-'}</td>`
    ).join('')}</tr>`;

    // Total students
    tableHTML += `<tr><td><strong>Alunos EF</strong></td>${schools.map(s =>
      `<td>${s.ensino_fundamental ? s.ensino_fundamental.totals.total_students : '-'}</td>`
    ).join('')}</tr>`;
    tableHTML += `<tr><td><strong>Alunos AF</strong></td>${schools.map(s =>
      `<td>${s.anos_finais ? s.anos_finais.totals.total_students : '-'}</td>`
    ).join('')}</tr>`;
    tableHTML += `<tr><td><strong>Alunos EM</strong></td>${schools.map(s =>
      `<td>${s.ensino_medio ? s.ensino_medio.totals.total_students : '-'}</td>`
    ).join('')}</tr>`;

    tableHTML += '</tbody></table>';

    // Charts
    results.innerHTML = tableHTML + `
      <div class="charts-grid">
        <div class="chart-card">
          <h3>Proficiência LP e MAT (Ensino Fundamental)</h3>
          <div class="chart-container"><canvas id="comp-profic"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>% Adequado + Avançado</h3>
          <div class="chart-container"><canvas id="comp-pct-aa"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Participação por Segmento</h3>
          <div class="chart-container"><canvas id="comp-particip"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Distribuição de Níveis LP</h3>
          <div class="chart-container"><canvas id="comp-levels"></canvas></div>
        </div>
      </div>`;

    setTimeout(() => {
      const colors = ChartHelpers.COLORS;

      // Proficiency comparison
      ChartHelpers.createGroupedBar('comp-profic', names, [
        {
          label: 'LP',
          data: schools.map(s => s.ensino_fundamental ? s.ensino_fundamental.totals.avg_profic_lp : 0),
          backgroundColor: '#3b82f6',
        },
        {
          label: 'MAT',
          data: schools.map(s => s.ensino_fundamental ? s.ensino_fundamental.totals.avg_profic_mat : 0),
          backgroundColor: '#16a34a',
        },
      ], { yLabel: 'Proficiência' });

      // % Adequado+Avançado
      ChartHelpers.createGroupedBar('comp-pct-aa', names, [
        {
          label: '% LP',
          data: schools.map(s => s.ensino_fundamental ? s.ensino_fundamental.totals.pct_adequado_avancado_lp : 0),
          backgroundColor: '#3b82f6',
        },
        {
          label: '% MAT',
          data: schools.map(s => s.ensino_fundamental ? s.ensino_fundamental.totals.pct_adequado_avancado_mat : 0),
          backgroundColor: '#16a34a',
        },
      ], { yLabel: '%' });

      // Participation
      ChartHelpers.createGroupedBar('comp-particip', names, [
        {
          label: 'EF (LP)',
          data: schools.map(s => s.ensino_fundamental ? (s.ensino_fundamental.totals.participation_rate_lp * 100).toFixed(1) : 0),
          backgroundColor: '#16a34a',
        },
        {
          label: 'AF (ambos)',
          data: schools.map(s => s.anos_finais ? (s.anos_finais.totals.participation_rate_both * 100).toFixed(1) : 0),
          backgroundColor: '#0891b2',
        },
        {
          label: 'EM (ambas)',
          data: schools.map(s => s.ensino_medio ? (s.ensino_medio.totals.participation_rate_both * 100).toFixed(1) : 0),
          backgroundColor: '#8b5cf6',
        },
      ], { yLabel: 'Participação (%)' });

      // Stacked levels LP
      const levels = ['Avancado', 'Adequado', 'Basico', 'Abaixo do Basico'];
      const datasets = levels.map(l => ({
        label: ChartHelpers.LEVEL_LABELS[l],
        data: schools.map(s => {
          if (!s.ensino_fundamental) return 0;
          return s.ensino_fundamental.totals.proficiency_levels_lp[l] || 0;
        }),
        backgroundColor: ChartHelpers.LEVEL_COLORS[l],
      }));
      ChartHelpers.createStackedBar('comp-levels', names, datasets, { yLabel: 'Alunos' });
    }, 50);
  }

  return { init };
})();
