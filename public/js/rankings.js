/* Rankings module */
const Rankings = (() => {
  let currentData = null;

  function init(data) {
    currentData = data;
    const select = document.getElementById('ranking-type');
    select.addEventListener('change', () => render(data, select.value));
    render(data, select.value);
  }

  function render(data, type) {
    const ranking = data.rankings[type];
    if (!ranking) return;

    const isParticipation = type === 'participacao_geral';
    const isPct = type.startsWith('pct_');

    // Table
    const container = document.getElementById('ranking-table-container');
    let headers = '<th>#</th><th>Escola</th><th>Município</th>';
    if (isParticipation) {
      headers += '<th>Participação</th><th>Participantes</th><th>Total Alunos</th><th>Segmentos</th>';
    } else if (isPct) {
      headers += '<th>% Adeq.+Avanç.</th><th>Participantes</th>';
    } else {
      headers += '<th>Média</th><th>Participantes</th>';
    }

    let rows = '';
    ranking.forEach((s, i) => {
      const pos = i + 1;
      const rankClass = pos === 1 ? 'rank-gold' : pos === 2 ? 'rank-silver' : pos === 3 ? 'rank-bronze' : '';
      rows += `<tr>
        <td class="${rankClass}">${pos}º</td>
        <td>${s.nome}</td>
        <td>${s.municipio}</td>`;

      if (isParticipation) {
        rows += `<td><strong>${s.valor}%</strong></td>
          <td>${s.total_participantes.toLocaleString('pt-BR')}</td>
          <td>${s.total_alunos.toLocaleString('pt-BR')}</td>
          <td>${s.segmentos.join(', ')}</td>`;
      } else if (isPct) {
        rows += `<td><strong>${s.valor}%</strong></td>
          <td>${s.participantes.toLocaleString('pt-BR')}</td>`;
      } else {
        rows += `<td><strong>${s.valor}</strong></td>
          <td>${s.participantes.toLocaleString('pt-BR')}</td>`;
      }
      rows += '</tr>';
    });

    container.innerHTML = `<table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;

    // Chart
    const titleMap = {
      'proficiencia_lp': 'Proficiência Língua Portuguesa (média)',
      'proficiencia_mat': 'Proficiência Matemática (média)',
      'pct_adequado_avancado_lp': '% Adequado + Avançado em LP',
      'pct_adequado_avancado_mat': '% Adequado + Avançado em MAT',
      'participacao_geral': 'Taxa de Participação Geral (%)',
    };
    document.getElementById('ranking-chart-title').textContent = titleMap[type] || 'Ranking';

    const labels = ranking.map(s => ChartHelpers.shortName(s.nome));
    const values = ranking.map(s => s.valor);
    const suffix = (isParticipation || isPct) ? '%' : ' pts';
    ChartHelpers.createHBar('chart-ranking', labels, values, { xLabel: titleMap[type], suffix });
  }

  return { init };
})();
