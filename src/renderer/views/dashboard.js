Views.dashboard = {
  render() {
    const s = App.state;
    const day = App.day();
    const due = App.dueWords().length;
    const learnedCount = s.vocab.filter((v) => v.learned).length;
    const unlearned = s.vocab.filter((v) => !v.learned).length;
    const plan = App.planProgress();
    const time = App.timeProgress();
    const step = App.currentStep();
    const sp = App.stepProgress(step);
    const daysLeft = Math.max(daysBetween(today(), s.settings.examDate), 0);

    const daily = [
      { text: `${s.settings.dailyNew} yeni kelime öğren (${Math.min(day.learned, s.settings.dailyNew)}/${s.settings.dailyNew})`, done: day.learned >= s.settings.dailyNew || unlearned === 0, go: ['vocab', { tab: 'learn' }] },
      { text: due ? `${due} kelimeyi tekrar et` : 'Tekrar bekleyen kelime yok', done: due === 0, go: ['vocab', { tab: 'review' }] },
      { text: 'Günün yazma topic\'ini yaz', done: day.writing > 0, go: ['writing'] },
      { text: 'Bir konuşma promptu kaydet', done: day.speaking > 0, go: ['speaking'] },
      { text: 'Bir Reading veya Listening çöz', done: day.practice > 0, go: ['tests'] },
      { text: 'Bir gramer konusu çalış', done: day.grammar > 0, go: ['grammar'] },
    ];
    const doneCount = daily.filter((d) => d.done).length;
    const todos = s.todos.filter((t) => !t.done && (!t.due || t.due <= today())).slice(0, 5);

    const bands = SKILLS.map(([k]) => App.latestBand(k));
    // grammar is a study aid, not an IELTS band, so it is shown but left out of the average
    const known = SKILLS.map(([k], i) => (k === 'grammar' ? null : bands[i])).filter((b) => b != null);
    const overall = known.length ? roundHalf(known.reduce((a, b) => a + b, 0) / known.length) : null;
    const vs = App.vocabStats();

    return `<div class="page">
      <div class="page-head"><div><h1>Merhaba, ${esc(App.profile().name)} 👋</h1><p class="sub">Hedef: IELTS ${fmtBand(s.settings.target)} · Sınav ${fmtDate(s.settings.examDate)}</p></div>
        <button class="btn" data-act="settings">Ayarlar</button></div>

      <div class="grid g4">
        <div class="card stat"><b>${daysLeft}</b><span>sınava kalan gün</span></div>
        <div class="card stat"><b>${App.streak()} 🔥</b><span>günlük seri</span></div>
        <div class="card stat"><b>${vs.learned}<small class="muted"> / ${vs.total}</small></b><span>kelime · ${vs.academic} akademik${vs.accuracy == null ? '' : ` · %${vs.accuracy} doğru`}</span></div>
        <div class="card stat"><b>${fmtBand(overall)}</b><span>tahmini genel band</span></div>
      </div>

      <div class="card">
        <div class="row spread"><h2>Genel İlerleme</h2><span class="muted small">Plan: ${plan.done}/${plan.total} madde</span></div>
        <div class="small muted" style="margin-bottom:4px">Plan tamamlama · %${Math.round(plan.pct)}</div>${bar(plan.pct, 'green')}
        <div class="small muted" style="margin:12px 0 4px">Geçen süre · %${Math.round(Math.max(0, Math.min(time, 100)))}</div>${bar(time)}
      </div>

      <div class="grid g2" style="margin-top:16px">
        <div class="card" style="margin:0">
          <div class="row spread"><h2>Bugünün Görevleri</h2><span class="badge ${doneCount === daily.length ? 'b-green' : 'b-blue'}">${doneCount}/${daily.length}</span></div>
          ${daily.map((d, i) => `<div class="check ${d.done ? 'done' : ''}"><input type="checkbox" disabled ${d.done ? 'checked' : ''}><span class="t">${esc(d.text)}</span>${d.done ? '' : `<button class="btn sm" data-go="${i}">Başla</button>`}</div>`).join('')}
          ${todos.length ? `<h3>Kendi görevlerin</h3>${todos.map((t) => `<div class="check"><input type="checkbox" data-todo="${t.id}"><span class="t">${esc(t.text)}</span></div>`).join('')}` : ''}
        </div>
        <div class="card" style="margin:0">
          <div class="row spread"><h2>Beceri Seviyeleri</h2><span class="muted small">hedef ${fmtBand(s.settings.target)}</span></div>
          ${SKILLS.map(([k, label], i) => `<div class="skill-row"><span>${label}</span><div class="target-line">${bar(((bands[i] || 0) / 9) * 100, bands[i] >= s.settings.target ? 'green' : '')}<i style="position:absolute;left:${(s.settings.target / 9) * 100}%;top:-3px;width:2px;height:14px;background:var(--navy)"></i></div><b>${fmtBand(bands[i])}</b></div>`).join('')}
          <p class="small muted" style="margin-bottom:0">Kontrol testleri ve yazma/konuşma değerlendirmelerinden gelen tahminlerdir. Gramer ayrı bir IELTS bölümü olmadığı için ortalamaya katılmaz.</p>
        </div>
      </div>

      <div class="card step current" style="margin-top:16px">
        <div class="step-head"><div><span class="badge b-blue">Adım ${step.index + 1} / ${STEP_DEFS.length}</span><h2 style="margin:6px 0 0">${esc(step.title)}</h2><div class="muted small">${esc(step.focus)} · ${fmtDate(step.start)} – ${fmtDate(step.end)}</div></div>
          <button class="btn" data-act="plan">Planı aç</button></div>
        ${bar(sp.pct)}<div class="small muted" style="margin-top:4px">${sp.done}/${sp.total} tamamlandı</div>
      </div>
    </div>`;
  },

  mount(root) {
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (a?.dataset.act === 'plan') App.go('plan');
      if (a?.dataset.act === 'settings') Views.dashboard.settings();
    });
    // must stay aligned with the order of `daily` in render()
    const routes = [['vocab', { tab: 'learn' }], ['vocab', { tab: 'review' }], ['writing'], ['speaking'], ['tests'], ['grammar']];
    $$('[data-go]', root).forEach((b) => b.addEventListener('click', () => App.go(...routes[b.dataset.go])));
    $$('[data-todo]', root).forEach((c) =>
      c.addEventListener('change', () => {
        const t = App.state.todos.find((x) => x.id === +c.dataset.todo);
        if (t) t.done = true;
        App.save();
        App.render();
      }),
    );
  },

  // Setting a password re-encrypts the profile under it. There is no recovery path by design:
  // a password that could be reset would not be protecting anything.
  setPassword() {
    Dialog.open(
      `<p class="small muted" style="margin-top:0">Bu profilin tüm verisi bu parolayla şifrelenecek. Parolayı unutursan <b>kelimelerin, yazıların ve ilerlemen kurtarılamaz</b> — sıfırlama yok, çünkü parolayı sıfırlayabilen bir sistem şifrelemeyi de çözebilirdi.</p>
       <label class="f">Parola</label><input type="password" id="pw1" autocomplete="new-password">
       <label class="f" style="margin-top:10px">Parola (tekrar)</label><input type="password" id="pw2" autocomplete="new-password">
       <div class="small" id="pw-err" style="color:var(--red);min-height:18px;margin-top:6px"></div>`,
      '<button class="btn" id="pw-no">Vazgeç</button><button class="btn primary" id="pw-yes">Parolayı koy</button>',
      `“${App.profile().name}” için parola`,
    );
    $('#pw1').focus();
    $('#pw-no').onclick = () => Dialog.close();
    $('#pw-yes').onclick = async () => {
      const a = $('#pw1').value;
      const b = $('#pw2').value;
      if (a.length < 4) return ($('#pw-err').textContent = 'Parola en az 4 karakter olmalı.');
      if (a !== b) return ($('#pw-err').textContent = 'İki parola aynı değil.');
      $('#pw-yes').disabled = true;
      $('#pw-err').textContent = 'şifreleniyor…';
      await App.setProfilePassword(a);
      Dialog.close();
      App.toast('Parola kondu — bu profil artık şifreli');
    };
  },

  removePassword() {
    Dialog.confirm(
      'Parola kaldırılsın mı?',
      'Profilin verisi şifresiz kaydedilecek ve açılışta parola sorulmayacak.',
      'Kaldır',
      async () => {
        await App.removeProfilePassword();
        App.toast('Parola kaldırıldı');
      },
    );
  },

  async settings() {
    const s = App.state.settings;
    const root = $('#root');
    root.insertAdjacentHTML(
      'beforeend',
      `<div id="dlg" class="modal-back"><div class="card modal-card">
        <div class="modal-head"><h2>Ayarlar</h2></div>
        <div class="modal-body">
          <h3 style="margin-top:0">Profiller</h3>
          <div class="small muted" style="margin-bottom:6px">Her profilin kendi sınav tarihi, kelimeleri ve ilerlemesi olur. Aralarında hiçbir şey paylaşılmaz.</div>
          <div id="s-profiles"></div>
          <div class="row" style="margin-top:8px"><button class="btn sm" id="s-pnew">+ Yeni profil</button>
            <button class="btn sm" id="s-pass">${App.profile().locked ? '🔒 Parolayı kaldır' : 'Parola koy'}</button></div>
          <div class="small muted" style="margin-top:6px">${Vault.available()
            ? 'Parola koyarsan bu profilin verisi şifrelenir; parolayı bilmeyen dosyayı açsa bile okuyamaz.'
            : '<span style="color:var(--amber)">Parola koruması bu adreste kullanılamıyor — tarayıcı şifrelemeyi yalnızca güvenli bağlantıda (https veya localhost) veriyor.</span>'}</div>
          <h3>Bu profilin ayarları</h3>
          <label class="f">Sınav tarihi</label><input type="date" id="s-exam" value="${s.examDate}">
          <label class="f" style="margin-top:12px">Hedef band</label><input type="number" id="s-target" min="4" max="9" step="0.5" value="${s.target}">
          <label class="f" style="margin-top:12px">Günlük yeni kelime</label><input type="number" id="s-new" min="1" max="30" value="${s.dailyNew}">
          <h3>Bağlantı</h3>
          <label class="f">Ağ kullanımı</label>
          <select id="s-net">
            <option value="auto" ${s.netMode !== 'offline' ? 'selected' : ''}>Otomatik — bağlantı varsa sözlük ve LanguageTool kullanılsın</option>
            <option value="offline" ${s.netMode === 'offline' ? 'selected' : ''}>Her zaman çevrimdışı — sadece cihazdaki veriler</option>
          </select>
          <div class="small muted" style="margin-top:4px">Çevrimdışıyken kelime, gramer, testler, plan ve seslendirme tam çalışır; sözlük önbelleğe ve kendi kelime listene, dil kontrolü yerel kurallara düşer.</div>
          <h3>Seslendirme</h3>
          <label class="f">Ses</label><select id="s-voice"><option value="">Yükleniyor…</option></select>
          <div id="s-voicehint" class="small muted" style="margin-top:4px"></div>
          <label class="f" style="margin-top:12px">Okuma hızı</label>
          <select id="s-rate">${[[-3, 'Çok yavaş'], [-2, 'Yavaş'], [-1, 'Normal (önerilen)'], [0, 'Hızlı'], [2, 'Çok hızlı']].map(([v, l]) => `<option value="${v}" ${s.speechRate === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="s-test">🔊 Dene</button><span class="muted small" id="s-teststate"></span></div>
        </div>
        <div class="modal-foot"><button class="btn" id="s-cancel">Vazgeç</button><button class="btn primary" id="s-save">Kaydet</button></div>
      </div></div>`,
    );
    const drawProfiles = () => {
      const { active, list } = App.profiles;
      $('#s-profiles').innerHTML = list
        .map((p) => `<div class="prow">
          <span class="nm">${esc(p.name)}${p.id === active ? ' <span class="me">· şu an</span>' : ''}</span>
          ${p.id === active ? '' : `<button class="btn sm" data-use="${p.id}">Geç</button>`}
          <button class="btn ghost sm" data-ren="${p.id}">Adını değiştir</button>
          ${list.length > 1 ? `<button class="btn ghost sm" data-del="${p.id}">Sil</button>` : ''}
        </div>`)
        .join('');
      $$('[data-use]', $('#s-profiles')).forEach((b) => (b.onclick = () => { $('#dlg').remove(); App.switchProfile(b.dataset.use); }));
      $$('[data-ren]', $('#s-profiles')).forEach((b) => (b.onclick = () => {
        const p = list.find((x) => x.id === b.dataset.ren);
        Dialog.prompt('Profil adı', '', 'İsim', p.name, async (name) => {
          await App.renameProfile(p.id, name);
          drawProfiles();
          App.renderProfile();
          if (p.id === active) App.render();
        });
      }));
      $$('[data-del]', $('#s-profiles')).forEach((b) => (b.onclick = () => {
        const p = list.find((x) => x.id === b.dataset.del);
        Dialog.confirm(`“${p.name}” silinsin mi?`, 'Bu profilin kelimeleri, yazıları ve tüm ilerlemesi kalıcı olarak silinir. Geri alınamaz.', 'Sil', async () => {
          const wasActive = p.id === App.profiles.active;
          await App.deleteProfile(p.id);
          if (wasActive) return; // deleteProfile already re-rendered onto another profile
          drawProfiles();
        });
      }));
    };
    drawProfiles();
    $('#s-pnew').onclick = () => {
      $('#dlg').remove();
      App.promptNewProfile();
    };
    $('#s-pass').disabled = !Vault.available();
    $('#s-pass').onclick = () => {
      $('#dlg').remove();
      App.profile().locked ? this.removePassword() : this.setPassword();
    };

    $('#s-cancel').onclick = () => { Audio$.stop(); $('#dlg').remove(); };
    $('#s-save').onclick = () => {
      s.examDate = $('#s-exam').value || s.examDate;
      s.target = +$('#s-target').value || s.target;
      s.dailyNew = +$('#s-new').value || s.dailyNew;
      s.voice = $('#s-voice').value;
      s.speechRate = +$('#s-rate').value;
      s.netMode = $('#s-net').value;
      Audio$.stop();
      App.saveNow();
      App.render();
      App.toast('Ayarlar kaydedildi');
    };
    $('#s-test').onclick = () => {
      const state = $('#s-teststate');
      Audio$.play('This is how the listening tests will sound. The exam starts in January.', {
        rate: +$('#s-rate').value,
        voice: $('#s-voice').value,
        onstate: (x) => (state.textContent = { loading: 'hazırlanıyor…', playing: 'oynatılıyor', ended: '' }[x] ?? (AUDIO_ERRORS[x] || x)),
      });
    };

    const r = await Api.raw('voices');
    const sel = $('#s-voice');
    if (!sel) return; // dialog closed while loading
    const list = r.data || [];
    const en = list.filter((v) => /^en/i.test(v.lang));
    sel.innerHTML = `<option value="">Otomatik (İngilizce)</option>${list.map((v) => `<option value="${esc(v.name)}" ${s.voice === v.name ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join('')}`;
    $('#s-voicehint').innerHTML = en.length
      ? `${en.length} İngilizce ses bulundu.`
      : `<span style="color:var(--red)">Sistemde İngilizce ses paketi yok.</span> Windows Ayarlar → Saat ve dil → Konuşma → Ses ekle yolundan “English (United Kingdom)” kur.`;
  },
};
