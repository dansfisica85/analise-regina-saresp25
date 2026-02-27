/* Dashboard module */
const Dashboard = (() => {
  function init(data) {
    renderCards(data);
    renderProficiencyCharts(data);
    renderLevelCharts(data);
  }

  function renderCards(data) {
    const container = document.getElementById('dashboard-cards');
    const schools = data.schools;
    const schoolList = Object.values(schools);

    const totalStudents = schoolList.reduce((sum, s) => {
      let n = 0;
      if (s.ensino_fundamental) n += s.ensino_fundamental.totals.total_students;
      if (s.anos_finais) n += s.anos_finais.totals.total_students;
      if (s.ensino_medio) n += s.ensino_medio.totals.total_students;
      return sum + n;
    }, 0);

    const withProfic = schoolList.filter(s => s.ensino_fundamental && s.ensino_fundamental.totals.avg_profic_lp !== null);
    const withoutProfic = schoolList.filter(s => !s.ensino_fundamental);
    const avgLP = withProfic.length > 0
      ? (withProfic.reduce((s, sc) => s + sc.ensino_fundamental.totals.avg_profic_lp, 0) / withProfic.length).toFixed(1)
      : '-';
    const avgMAT = withProfic.length > 0
      ? (withProfic.reduce((s, sc) => s + sc.ensino_fundamental.totals.avg_profic_mat, 0) / withProfic.length).toFixed(1)
      : '-';

    // Aggregate levels
    const levels = ['Avancado', 'Adequado', 'Basico', 'Abaixo do Basico'];
    const totalsLP = { 'Avancado': 0, 'Adequado': 0, 'Basico': 0, 'Abaixo do Basico': 0 };
    const totalsMAT = { 'Avancado': 0, 'Adequado': 0, 'Basico': 0, 'Abaixo do Basico': 0 };
    schoolList.forEach(s => {
      if (!s.ensino_fundamental) return;
      const t = s.ensino_fundamental.totals;
      if (t.proficiency_levels_lp) levels.forEach(l => { totalsLP[l] += t.proficiency_levels_lp[l] || 0; });
      if (t.proficiency_levels_mat) levels.forEach(l => { totalsMAT[l] += t.proficiency_levels_mat[l] || 0; });
    });

    const totalMun = data.metadata.municipalities.length;

    container.innerHTML = `
      <div class="card">
        <div class="card-label">Escolas Analisadas</div>
        <div class="card-value">${data.metadata.total_schools}</div>
        <div class="card-sub">${totalMun} municípios</div>
      </div>
      <div class="card">
        <div class="card-label">Total de Registros</div>
        <div class="card-value">${totalStudents.toLocaleString('pt-BR')}</div>
        <div class="card-sub">Todos os segmentos</div>
      </div>
      <div class="card">
        <div class="card-label">Média Proficiência LP</div>
        <div class="card-value">${avgLP}</div>
        <div class="card-sub">${withProfic.length} escolas com dados | ${withoutProfic.length} sem EF</div>
      </div>
      <div class="card">
        <div class="card-label">Média Proficiência MAT</div>
        <div class="card-value">${avgMAT}</div>
        <div class="card-sub">${withProfic.length} escolas com dados | ${withoutProfic.length} sem EF</div>
      </div>
      <div class="card">
        <div class="card-label">Alunos LP por Nível (Total)</div>
        <div class="card-value" style="font-size:1rem">
          <span class="level-avancado">${totalsLP['Avancado']} Av</span> |
          <span class="level-adequado">${totalsLP['Adequado']} Ad</span> |
          <span class="level-basico">${totalsLP['Basico']} Ba</span> |
          <span class="level-abaixo">${totalsLP['Abaixo do Basico']} Ab</span>
        </div>
        <div class="card-sub">Língua Portuguesa - Ens. Fundamental</div>
      </div>
      <div class="card">
        <div class="card-label">Alunos MAT por Nível (Total)</div>
        <div class="card-value" style="font-size:1rem">
          <span class="level-avancado">${totalsMAT['Avancado']} Av</span> |
          <span class="level-adequado">${totalsMAT['Adequado']} Ad</span> |
          <span class="level-basico">${totalsMAT['Basico']} Ba</span> |
          <span class="level-abaixo">${totalsMAT['Abaixo do Basico']} Ab</span>
        </div>
        <div class="card-sub">Matemática - Ens. Fundamental</div>
      </div>
    `;

    // Non-participating schools alert
    if (withoutProfic.length > 0) {
      const alertHTML = `<div class="non-participating" style="margin-bottom:1.5rem">
        <h4>Escolas que não participaram do Ensino Fundamental (sem dados de proficiência)</h4>
        <table class="data-table"><thead><tr><th>Escola</th><th>Município</th><th>Segmentos Disponíveis</th></tr></thead><tbody>
        ${withoutProfic.sort((a,b) => a.nome.localeCompare(b.nome)).map(s =>
          `<tr><td>${s.nome}</td><td>${s.municipio}</td><td>${s.segmentos.join(', ') || 'Nenhum'}</td></tr>`
        ).join('')}
        </tbody></table>
      </div>`;
      container.insertAdjacentHTML('afterend', alertHTML);
    }
  }

  function renderProficiencyCharts(data) {
    const ranking = data.rankings.proficiencia_lp;
    if (!ranking || ranking.length === 0) return;

    const labels = ranking.map(s => ChartHelpers.shortName(s.nome));
    const values = ranking.map(s => s.valor);
    ChartHelpers.createHBar('chart-profic-lp', labels, values, { xLabel: 'Proficiência LP', suffix: ' pts' });

    const rankMat = data.rankings.proficiencia_mat;
    const labelsM = rankMat.map(s => ChartHelpers.shortName(s.nome));
    const valuesM = rankMat.map(s => s.valor);
    ChartHelpers.createHBar('chart-profic-mat', labelsM, valuesM, { xLabel: 'Proficiência MAT', suffix: ' pts' });
  }

  function renderLevelCharts(data) {
    const levels = ['Avancado', 'Adequado', 'Basico', 'Abaixo do Basico'];
    const totalsLP = { 'Avancado': 0, 'Adequado': 0, 'Basico': 0, 'Abaixo do Basico': 0 };
    const totalsMAT = { 'Avancado': 0, 'Adequado': 0, 'Basico': 0, 'Abaixo do Basico': 0 };

    Object.values(data.schools).forEach(s => {
      if (!s.ensino_fundamental) return;
      const t = s.ensino_fundamental.totals;
      if (t.proficiency_levels_lp) {
        levels.forEach(l => { totalsLP[l] += t.proficiency_levels_lp[l] || 0; });
      }
      if (t.proficiency_levels_mat) {
        levels.forEach(l => { totalsMAT[l] += t.proficiency_levels_mat[l] || 0; });
      }
    });

    const lbls = levels.map(l => ChartHelpers.LEVEL_LABELS[l]);
    const colrs = levels.map(l => ChartHelpers.LEVEL_COLORS[l]);

    ChartHelpers.createDoughnut('chart-levels-lp', lbls, levels.map(l => totalsLP[l]), colrs);
    ChartHelpers.createDoughnut('chart-levels-mat', lbls, levels.map(l => totalsMAT[l]), colrs);
  }

  return { init };
})();
