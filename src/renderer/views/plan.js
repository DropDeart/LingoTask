Views.plan = {
  render() {
    const s = App.state;
    const steps = App.steps();
    const cur = App.currentStep().index;
    const plan = App.planProgress();

    const stepCard = (st) => {
      const p = App.stepProgress(st);
      return `<div class="card step ${st.index === cur ? 'current' : ''}">
        <div class="step-head"><div>
          <span class="badge ${p.pct === 100 ? 'b-green' : st.index === cur ? 'b-blue' : 'b-amber'}">Adım ${st.index + 1}${st.index === cur ? ' · şu an' : ''}${p.pct === 100 ? ' · tamamlandı' : ''}</span>
          <h2 style="margin:6px 0 0">${esc(st.title)}</h2><div class="muted small">${esc(st.focus)} · ${fmtDate(st.start)} – ${fmtDate(st.end)}</div></div>
          <div style="width:140px;text-align:right"><div class="small muted">${p.done}/${p.total}</div>${bar(p.pct, 'green')}</div></div>
        ${st.items
          .map((it) => {
            const done = App.isDone(it);
            if (it.kind === 'auto') {
              const pct = Math.min((it.now / it.target) * 100, 100);
              return `<div class="check ${done ? 'done' : ''}"><input type="checkbox" disabled ${done ? 'checked' : ''}>
                <span class="t"><span class="label">${esc(it.text)}</span>
                <div class="row" style="gap:8px;margin-top:4px"><div style="flex:1;max-width:220px">${bar(pct, done ? 'green' : 'teal')}</div>
                <span class="small" style="${done ? 'color:var(--green)' : 'color:var(--teal)'};font-weight:600">${it.now} / ${it.target}</span></div></span>
                <span class="badge ${done ? 'b-green' : 'b-blue'}">OTO</span></div>`;
            }
            const action = it.kind === 'test' ? `<button class="btn sm ${done ? '' : 'primary'}" data-test="${st.index}:${it.skill}:${it.ref}">${done ? 'Tekrar' : 'Başla'}</button>` : '';
            return `<div class="check ${done ? 'done' : ''}"><input type="checkbox" data-check="${it.key}" ${done ? 'checked' : ''} ${it.kind === 'test' ? 'disabled' : ''}>
              <span class="t">${it.kind === 'test' ? '<span class="badge b-blue" style="margin-right:6px">TEST</span>' : ''}${esc(it.text)}</span>${action}</div>`;
          })
          .join('')}
      </div>`;
    };

    const todos = s.todos.slice().sort((a, b) => a.done - b.done || (a.due || '9') .localeCompare(b.due || '9'));
    return `<div class="page">
      <div class="page-head"><div><h1>Çalışma Planı</h1><p class="sub">${fmtDate(s.settings.startDate)} → ${fmtDate(s.settings.examDate)} arası 6 adım. <span class="badge b-blue">OTO</span> işaretli maddeler uygulamadaki gerçek ilerlemene göre kendiliğinden tamamlanır; diğerlerini sen işaretlersin.</p></div>
        <div style="width:220px"><div class="small muted" style="text-align:right">Toplam · %${Math.round(plan.pct)}</div>${bar(plan.pct, 'green')}</div></div>

      <div class="card">
        <h2>Kendi Görev Listem</h2>
        <div class="row" style="margin-bottom:10px"><input type="text" id="todo-text" placeholder="Yeni görev ekle…" style="flex:1"><input type="date" id="todo-due" style="width:160px"><button class="btn primary" id="todo-add">Ekle</button></div>
        ${todos.length ? todos.map((t) => `<div class="check ${t.done ? 'done' : ''}"><input type="checkbox" data-todo="${t.id}" ${t.done ? 'checked' : ''}><span class="t">${esc(t.text)}${t.due ? ` <span class="muted small">· ${fmtDate(t.due)}</span>` : ''}</span><button class="btn ghost sm" data-del="${t.id}">Sil</button></div>`).join('') : '<div class="empty">Henüz görev yok.</div>'}
      </div>
      <div style="height:16px"></div>
      ${steps.map(stepCard).join('<div style="height:16px"></div>')}
    </div>`;
  },

  mount(root) {
    const s = App.state;
    const add = () => {
      const text = $('#todo-text').value.trim();
      if (!text) return;
      s.todos.push({ id: Date.now(), text, due: $('#todo-due').value || null, done: false });
      App.save();
      App.render();
    };
    $('#todo-add').onclick = add;
    $('#todo-text').addEventListener('keydown', (e) => e.key === 'Enter' && add());

    root.addEventListener('change', (e) => {
      const c = e.target.closest('[data-check]');
      if (c) {
        s.checks[c.dataset.check] = c.checked;
        App.save();
        App.render();
      }
      const t = e.target.closest('[data-todo]');
      if (t) {
        const todo = s.todos.find((x) => x.id === +t.dataset.todo);
        todo.done = t.checked;
        App.save();
        App.render();
      }
    });
    root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-del]');
      if (d) {
        s.todos = s.todos.filter((x) => x.id !== +d.dataset.del);
        App.save();
        App.render();
      }
      const b = e.target.closest('[data-test]');
      if (b) {
        const [step, skill, ref] = b.dataset.test.split(':');
        const cp = { step: +step, skill, ref };
        if (skill === 'reading' || skill === 'listening') App.go('tests', { kind: skill, id: ref, checkpoint: cp });
        else if (skill === 'grammar') App.go('grammar', { id: ref, checkpoint: cp });
        else if (skill === 'writing') App.go('writing', { checkpoint: cp });
        else App.go('speaking', { checkpoint: cp });
      }
    });
  },
};
