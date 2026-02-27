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
    const isLP = type.includes('_lp');

    // Table
    const container = document.getElementById('ranking-table-container');
    let headers = '<th>#</th><th>Escola</th><th>Município</th>';
    if (isParticipation) {
      headers += '<th>Participação</th><th>Participantes</th><th>Total Alunos</th><th>Segmentos</th>';
    } else if (isPct) {
      headers += '<th>% Adeq.+Avanç.</th><th>Abaixo do Básico</th><th>Básico</th><th>Adequado</th><th>Avançado</th><th>Total</th>';
    } else {
      headers += '<th>Média</th><th>Abaixo do Básico</th><th>Básico</th><th>Adequado</th><th>Avançado</th><th>Total</th>';
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
      } else {
        const school = data.schools[s.codesc];
        const ef = school && school.ensino_fundamental;
        const levelsKey = isLP || type === 'proficiencia_lp' ? 'proficiency_levels_lp' : 'proficiency_levels_mat';
        const lvl = ef ? ef.totals[levelsKey] : null;
        const ab = lvl ? lvl['Abaixo do Basico'] || 0 : 0;
        const ba = lvl ? lvl['Basico'] || 0 : 0;
        const ad = lvl ? lvl['Adequado'] || 0 : 0;
        const av = lvl ? lvl['Avancado'] || 0 : 0;
        const total = ab + ba + ad + av;

        if (isPct) {
          rows += `<td><strong>${s.valor}%</strong></td>`;
        } else {
          rows += `<td><strong>${s.valor}</strong></td>`;
        }
        rows += `
          <td class="level-abaixo">${ab}</td>
          <td class="level-basico">${ba}</td>
          <td class="level-adequado">${ad}</td>
          <td class="level-avancado">${av}</td>
          <td>${total}</td>`;
      }
      rows += '</tr>';
    });

    // Add non-participating schools section for proficiency rankings
    let nonParticipating = '';
    if (!isParticipation) {
      const rankedCodes = new Set(ranking.map(s => s.codesc));
      const missing = Object.values(data.schools).filter(s => !rankedCodes.has(s.codesc));
      if (missing.length > 0) {
        nonParticipating = `<div class="non-participating">
          <h4>Escolas sem dados de proficiência neste segmento</h4>
          <table class="data-table"><thead><tr><th>Escola</th><th>Município</th><th>Status</th><th>Segmentos Disponíveis</th></tr></thead><tbody>`;
        missing.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(s => {
          const segs = s.segmentos.length > 0 ? s.segmentos.join(', ') : 'Nenhum';
          nonParticipating += `<tr>
            <td>${s.nome}</td>
            <td>${s.municipio}</td>
            <td><span class="badge-no-data">Não participou do EF</span></td>
            <td>${segs}</td>
          </tr>`;
        });
        nonParticipating += '</tbody></table></div>';
      }
    }

    container.innerHTML = `<table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>${nonParticipating}`;

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
