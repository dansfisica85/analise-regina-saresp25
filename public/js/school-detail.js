/* School Detail module */
const SchoolDetail = (() => {
  let currentData = null;

  function init(data) {
    currentData = data;
    const select = document.getElementById('school-select');
    const sorted = Object.entries(data.schools).sort((a, b) => a[1].nome.localeCompare(b[1].nome));
    select.innerHTML = sorted.map(([code, s]) =>
      `<option value="${code}">${s.nome} (${s.municipio})</option>`
    ).join('');
    select.addEventListener('change', () => renderSchool(select.value));
    if (sorted.length > 0) renderSchool(sorted[0][0]);
  }

  function renderSchool(codesc) {
    const s = currentData.schools[codesc];
    if (!s) return;

    // Info card
    const infoCard = document.getElementById('school-info-card');
    const badges = s.segmentos.map(seg => {
      const cls = seg === 'EF' ? 'badge-ef' : seg === 'AF' ? 'badge-af' : 'badge-em';
      const label = seg === 'EF' ? 'Ens. Fundamental' : seg === 'AF' ? 'Anos Finais' : 'Ens. Médio';
      return `<span class="badge ${cls}">${label}</span>`;
    }).join(' ');

    let statsHTML = '';

    // EF Stats
    if (s.ensino_fundamental) {
      const t = s.ensino_fundamental.totals;
      statsHTML += `<h3 style="margin-top:1rem;color:var(--success)">Ensino Fundamental</h3>
        <div class="stats-grid">
          <div class="stat-item"><div class="stat-label">Alunos</div><div class="stat-value">${t.total_students}</div></div>
          <div class="stat-item"><div class="stat-label">Média LP</div><div class="stat-value">${t.avg_profic_lp ?? '-'}</div></div>
          <div class="stat-item"><div class="stat-label">Média MAT</div><div class="stat-value">${t.avg_profic_mat ?? '-'}</div></div>
          <div class="stat-item"><div class="stat-label">% Adeq.+Avanç. LP</div><div class="stat-value">${t.pct_adequado_avancado_lp ?? '-'}%</div></div>
          <div class="stat-item"><div class="stat-label">% Adeq.+Avanç. MAT</div><div class="stat-value">${t.pct_adequado_avancado_mat ?? '-'}%</div></div>
          <div class="stat-item"><div class="stat-label">Participação LP</div><div class="stat-value">${(t.participation_rate_lp * 100).toFixed(1)}%</div></div>
        </div>`;
    }

    // AF Stats
    if (s.anos_finais) {
      const t = s.anos_finais.totals;
      statsHTML += `<h3 style="margin-top:1rem;color:var(--info)">Anos Finais</h3>
        <div class="stats-grid">
          <div class="stat-item"><div class="stat-label">Alunos</div><div class="stat-value">${t.total_students}</div></div>
          <div class="stat-item"><div class="stat-label">Participação Dia 1</div><div class="stat-value">${(t.participation_rate_dia1 * 100).toFixed(1)}%</div></div>
          <div class="stat-item"><div class="stat-label">Participação Dia 2</div><div class="stat-value">${(t.participation_rate_dia2 * 100).toFixed(1)}%</div></div>
          <div class="stat-item"><div class="stat-label">Ambos os Dias</div><div class="stat-value">${(t.participation_rate_both * 100).toFixed(1)}%</div></div>
        </div>`;
    }

    // EM Stats
    if (s.ensino_medio) {
      const t = s.ensino_medio.totals;
      statsHTML += `<h3 style="margin-top:1rem;color:#8b5cf6">Ensino Médio</h3>
        <div class="stats-grid">
          <div class="stat-item"><div class="stat-label">Alunos</div><div class="stat-value">${t.total_students}</div></div>
          <div class="stat-item"><div class="stat-label">Participação LG/CN</div><div class="stat-value">${(t.participation_rate_lg_cn * 100).toFixed(1)}%</div></div>
          <div class="stat-item"><div class="stat-label">Participação MAT/CH</div><div class="stat-value">${(t.participation_rate_mat_ch * 100).toFixed(1)}%</div></div>
          <div class="stat-item"><div class="stat-label">Ambas as Provas</div><div class="stat-value">${(t.participation_rate_both * 100).toFixed(1)}%</div></div>
        </div>`;
    }

    infoCard.innerHTML = `<div class="school-info">
      <h2>${s.nome}</h2>
      <div class="meta">
        <span>${s.municipio}</span>
        <span>CODESC: ${s.codesc}</span>
        ${badges}
      </div>
      ${statsHTML}
    </div>`;

    // Charts
    const chartsContainer = document.getElementById('school-charts-container');
    chartsContainer.innerHTML = '';

    // EF: proficiency per grade
    if (s.ensino_fundamental) {
      const grades = Object.values(s.ensino_fundamental.grades);
      if (grades.length > 0) {
        chartsContainer.innerHTML += `
          <div class="charts-grid">
            <div class="chart-card">
              <h3>Proficiência por Série (EF)</h3>
              <div class="chart-container"><canvas id="school-ef-profic"></canvas></div>
            </div>
            <div class="chart-card">
              <h3>Níveis de Proficiência - LP (EF)</h3>
              <div class="chart-container"><canvas id="school-ef-levels-lp"></canvas></div>
            </div>
          </div>`;

        setTimeout(() => {
          const labels = grades.map(g => g.grade_label);
          ChartHelpers.createGroupedBar('school-ef-profic', labels, [
            { label: 'LP', data: grades.map(g => g.avg_profic_lp), backgroundColor: '#3b82f6' },
            { label: 'MAT', data: grades.map(g => g.avg_profic_mat), backgroundColor: '#16a34a' },
          ], { yLabel: 'Proficiência' });

          // Stacked levels for LP
          const levels = ['Avancado', 'Adequado', 'Basico', 'Abaixo do Basico'];
          const datasets = levels.map(l => ({
            label: ChartHelpers.LEVEL_LABELS[l],
            data: grades.map(g => g.proficiency_levels_lp[l] || 0),
            backgroundColor: ChartHelpers.LEVEL_COLORS[l],
          }));
          ChartHelpers.createStackedBar('school-ef-levels-lp', labels, datasets, { yLabel: 'Alunos' });
        }, 50);
      }
    }

    // AF: participation per grade
    if (s.anos_finais) {
      const grades = Object.values(s.anos_finais.grades);
      if (grades.length > 0) {
        chartsContainer.innerHTML += `
          <div class="charts-grid">
            <div class="chart-card">
              <h3>Participação por Série (Anos Finais)</h3>
              <div class="chart-container"><canvas id="school-af-particip"></canvas></div>
            </div>
          </div>`;

        setTimeout(() => {
          const labels = grades.map(g => g.grade_label);
          ChartHelpers.createGroupedBar('school-af-particip', labels, [
            { label: 'Dia 1', data: grades.map(g => (g.participation_rate_dia1 * 100).toFixed(1)), backgroundColor: '#0891b2' },
            { label: 'Dia 2', data: grades.map(g => (g.participation_rate_dia2 * 100).toFixed(1)), backgroundColor: '#06b6d4' },
            { label: 'Ambos', data: grades.map(g => (g.participation_rate_both * 100).toFixed(1)), backgroundColor: '#155e75' },
          ], { yLabel: 'Participação (%)' });
        }, 50);
      }
    }

    // EM: participation per grade
    if (s.ensino_medio) {
      const grades = Object.values(s.ensino_medio.grades);
      if (grades.length > 0) {
        chartsContainer.innerHTML += `
          <div class="charts-grid">
            <div class="chart-card">
              <h3>Participação por Série (Ensino Médio)</h3>
              <div class="chart-container"><canvas id="school-em-particip"></canvas></div>
            </div>
          </div>`;

        setTimeout(() => {
          const labels = grades.map(g => g.grade_label);
          ChartHelpers.createGroupedBar('school-em-particip', labels, [
            { label: 'LG/CN', data: grades.map(g => (g.participation_rate_lg_cn * 100).toFixed(1)), backgroundColor: '#8b5cf6' },
            { label: 'MAT/CH', data: grades.map(g => (g.participation_rate_mat_ch * 100).toFixed(1)), backgroundColor: '#a855f7' },
            { label: 'Ambas', data: grades.map(g => (g.participation_rate_both * 100).toFixed(1)), backgroundColor: '#6d28d9' },
          ], { yLabel: 'Participação (%)' });
        }, 50);
      }
    }
  }

  return { init };
})();
