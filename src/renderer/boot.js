Updater.init();
App.init().catch((e) => {
  document.getElementById('root').innerHTML = `<div class="page"><div class="card">Başlatma hatası: ${esc(e.message)}</div></div>`;
});
