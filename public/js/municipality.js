/* Municipality module */
const Municipality = (() => {
  function init(data) {
    renderCards(data);
    renderCharts(data);
    renderDetail(data);
  }

  function renderCards(data) {
    const container = document.getElementById('mun-cards');
    const muns = Object.values(data.municipalities).sort((a, b) => b.num_escolas - a.num_escolas);
    container.innerHTML = muns.map(m => `
      <div class="card">
        <div class="card-label">${m.municipio}</div>
        <div class="card-value">${m.num_escolas}</div>
        <div class="card-sub">
          escolas | ${m.total_alunos.toLocaleString('pt-BR')} registros
          ${m.avg_profic_lp ? `<br>LP: ${m.avg_profic_lp} | MAT: ${m.avg_profic_mat}` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderCharts(data) {
    const muns = Object.values(data.municipalities).sort((a, b) => (b.avg_profic_lp || 0) - (a.avg_profic_lp || 0));
    const withProfic = muns.filter(m => m.avg_profic_lp !== null);
    const labels = withProfic.map(m => m.municipio);

    ChartHelpers.createGroupedBar('chart-mun-profic', labels, [
      { label: 'LP', data: withProfic.map(m => m.avg_profic_lp), backgroundColor: '#3b82f6' },
      { label: 'MAT', data: withProfic.map(m => m.avg_profic_mat), backgroundColor: '#16a34a' },
    ], { yLabel: 'Proficiência Média' });

    const allMuns = Object.values(data.municipalities).sort((a, b) => b.total_alunos - a.total_alunos);
    const labelsAll = allMuns.map(m => m.municipio);
    ChartHelpers.createStackedBar('chart-mun-students', labelsAll, [
      { label: 'Ens. Fundamental', data: allMuns.map(m => m.total_alunos_ef), backgroundColor: '#16a34a' },
      { label: 'Anos Finais', data: allMuns.map(m => m.total_alunos_af), backgroundColor: '#0891b2' },
      { label: 'Ens. Médio', data: allMuns.map(m => m.total_alunos_em), backgroundColor: '#8b5cf6' },
    ], { yLabel: 'Alunos' });
  }

  function renderDetail(data) {
    const container = document.getElementById('mun-detail');
    const muns = Object.values(data.municipalities).sort((a, b) => b.num_escolas - a.num_escolas);

    container.innerHTML = '<div class="mun-detail-grid">' + muns.map(m => {
      const schoolList = m.escolas.map(e => {
        const s = data.schools[e.codesc];
        const badges = (s.segmentos || []).map(seg => {
          const cls = seg === 'EF' ? 'badge-ef' : seg === 'AF' ? 'badge-af' : 'badge-em';
          return `<span class="badge ${cls}" style="font-size:0.65rem;padding:0.1rem 0.4rem">${seg}</span>`;
        }).join(' ');
        return `<li>${e.nome} ${badges}</li>`;
      }).join('');

      return `<div class="mun-card">
        <h3>${m.municipio}</h3>
        <div class="stats-grid" style="margin-bottom:0.75rem">
          <div class="stat-item"><div class="stat-label">Escolas</div><div class="stat-value">${m.num_escolas}</div></div>
          <div class="stat-item"><div class="stat-label">Registros</div><div class="stat-value">${m.total_alunos.toLocaleString('pt-BR')}</div></div>
          ${m.avg_profic_lp ? `<div class="stat-item"><div class="stat-label">Profic. LP</div><div class="stat-value">${m.avg_profic_lp}</div></div>` : ''}
          ${m.avg_profic_mat ? `<div class="stat-item"><div class="stat-label">Profic. MAT</div><div class="stat-value">${m.avg_profic_mat}</div></div>` : ''}
        </div>
        <ul class="mun-school-list">${schoolList}</ul>
      </div>`;
    }).join('') + '</div>';
  }

  return { init };
})();
