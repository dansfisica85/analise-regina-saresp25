/* Main app controller */
(async () => {
  const tabs = document.querySelectorAll('.nav-btn');
  const contents = document.querySelectorAll('.tab-content');

  // Tab navigation
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });

  // Load data
  try {
    const res = await fetch('data/saresp_data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    window.SARESP_DATA = data;

    // Initialize all modules
    Dashboard.init(data);
    Rankings.init(data);
    SchoolDetail.init(data);
    Comparison.init(data);
    Municipality.init(data);
  } catch (err) {
    document.getElementById('main-content').innerHTML =
      `<div class="loading"><p>Erro ao carregar dados: ${err.message}</p></div>`;
  }
})();
