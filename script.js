(function () {
  'use strict';

  var DIFF = {
    easy:   { label: 'Easy',   clues: 40 },
    medium: { label: 'Medium', clues: 32 },
    hard:   { label: 'Hard',   clues: 26 }
  };

  /* ---------- grid helpers ---------- */
  var R = [], C = [], B = [], PEERS = [];
  for (var i = 0; i < 81; i++) {
    R[i] = (i / 9) | 0;
    C[i] = i % 9;
    B[i] = ((R[i] / 3) | 0) * 3 + ((C[i] / 3) | 0);
  }
  for (i = 0; i < 81; i++) {
    var p = [];
    for (var j = 0; j < 81; j++) {
      if (j !== i && (R[j] === R[i] || C[j] === C[i] || B[j] === B[i])) p.push(j);
    }
    PEERS[i] = p;
  }
  var POP = new Uint8Array(512);
  for (i = 1; i < 512; i++) POP[i] = POP[i >> 1] + (i & 1);

  function shuffle(a) {
    for (var k = a.length - 1; k > 0; k--) {
      var m = (Math.random() * (k + 1)) | 0;
      var t = a[k]; a[k] = a[m]; a[m] = t;
    }
    return a;
  }

  /* ---------- solver / generator ---------- */
  function search(g, rows, cols, boxes, st) {
    var best = -1, bm = 0, bn = 10;
    for (var k = 0; k < 81; k++) {
      if (g[k]) continue;
      var m = ~(rows[R[k]] | cols[C[k]] | boxes[B[k]]) & 511;
      var n = POP[m];
      if (n === 0) return;
      if (n < bn) { best = k; bm = m; bn = n; if (n === 1) break; }
    }
    if (best < 0) {
      st.count++;
      if (!st.sol) st.sol = g.slice();
      return;
    }
    var ds = [];
    for (var d = 0; d < 9; d++) if (bm & (1 << d)) ds.push(d);
    if (st.random) shuffle(ds);
    var r = R[best], c = C[best], b = B[best];
    for (var x = 0; x < ds.length; x++) {
      var bit = 1 << ds[x];
      g[best] = ds[x] + 1;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      search(g, rows, cols, boxes, st);
      g[best] = 0;
      rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (st.count >= st.limit) return;
    }
  }

  function solveGrid(grid, limit, random) {
    var g = grid.slice();
    var rows = [0,0,0,0,0,0,0,0,0], cols = [0,0,0,0,0,0,0,0,0], boxes = [0,0,0,0,0,0,0,0,0];
    for (var k = 0; k < 81; k++) {
      if (g[k]) {
        var bit = 1 << (g[k] - 1);
        rows[R[k]] |= bit; cols[C[k]] |= bit; boxes[B[k]] |= bit;
      }
    }
    var st = { count: 0, limit: limit, random: random, sol: null };
    search(g, rows, cols, boxes, st);
    return st;
  }

  function makePuzzle(diff) {
    var empty = [];
    for (var k = 0; k < 81; k++) empty.push(0);
    var full = solveGrid(empty, 1, true).sol;
    var puz = full.slice();
    var filled = 81, target = DIFF[diff].clues;
    var order = shuffle(empty.map(function (_, idx) { return idx; }));
    for (var x = 0; x < order.length; x++) {
      if (filled <= target) break;
      var idx = order[x], v = puz[idx];
      puz[idx] = 0;
      if (solveGrid(puz, 2, false).count !== 1) puz[idx] = v;
      else filled--;
    }
    return { puzzle: puz, solution: full };
  }

  /* ---------- DOM ---------- */
  function $(id) { return document.getElementById(id); }
  var boardEl = $('board'), padEl = $('pad');
  var cells = [], boxEls = [], padBtns = [];

  for (var b = 0; b < 9; b++) {
    var be = document.createElement('div');
    be.className = 'box';
    boardEl.appendChild(be);
    boxEls.push(be);
  }
  for (i = 0; i < 81; i++) {
    (function (idx) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'cell';
      el.addEventListener('click', function () { select(idx); });
      boxEls[B[idx]].appendChild(el);
      cells[idx] = el;
    })(i);
  }
  for (var dgt = 1; dgt <= 9; dgt++) {
    (function (d) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'num';
      btn.innerHTML = '<span>' + d + '</span><small></small>';
      btn.addEventListener('click', function () { place(d); });
      padEl.appendChild(btn);
      padBtns[d] = btn;
    })(dgt);
  }

  /* ---------- state ---------- */
  var S = null;
  var BEST_KEY = 'plain-sudoku-best';

  function loadBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveBest(o) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function fmt(sec) {
    var m = (sec / 60) | 0, s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function firstEmpty(values, solution) {
    for (var k = 0; k < 81; k++) if (values[k] !== solution[k]) return k;
    return null;
  }

  function newGame(diff) {
    var made = makePuzzle(diff);
    S = {
      diff: diff,
      puzzle: made.puzzle,
      solution: made.solution,
      values: made.puzzle.slice(),
      notes: new Array(81).fill(0),
      sel: null,
      noteMode: false,
      mistakes: 0,
      hints: 0,
      elapsed: 0,
      won: false,
      hist: []
    };
    S.sel = firstEmpty(S.values, S.solution);
    render();
  }

  /* ---------- actions ---------- */
  function push() {
    S.hist.push({ values: S.values.slice(), notes: S.notes.slice(), mistakes: S.mistakes, hints: S.hints });
    if (S.hist.length > 300) S.hist.shift();
  }

  function select(idx) {
    S.sel = idx;
    render();
  }

  function isGiven(k) { return S.puzzle[k] !== 0; }

  function clearPeerNotes(k, d) {
    var bit = 1 << (d - 1), ps = PEERS[k];
    for (var x = 0; x < ps.length; x++) S.notes[ps[x]] &= ~bit;
  }

  function checkWin() {
    for (var k = 0; k < 81; k++) if (S.values[k] !== S.solution[k]) return;
    S.won = true;
    var best = loadBest();
    S.newBest = false;
    if (best[S.diff] == null || S.elapsed < best[S.diff]) {
      best[S.diff] = S.elapsed;
      S.newBest = true;
      saveBest(best);
    }
  }

  function place(d) {
    if (S.won || S.sel == null || isGiven(S.sel)) return;
    var k = S.sel;
    if (S.noteMode) {
      if (S.values[k]) return;
      push();
      S.notes[k] ^= (1 << (d - 1));
    } else if (S.values[k] === d) {
      push();
      S.values[k] = 0;
    } else {
      push();
      S.values[k] = d;
      S.notes[k] = 0;
      if (d !== S.solution[k]) S.mistakes++;
      else clearPeerNotes(k, d);
      checkWin();
    }
    render();
  }

  function erase() {
    if (S.won || S.sel == null || isGiven(S.sel)) return;
    var k = S.sel;
    if (!S.values[k] && !S.notes[k]) return;
    push();
    S.values[k] = 0;
    S.notes[k] = 0;
    render();
  }

  function undo() {
    if (S.won || !S.hist.length) return;
    var h = S.hist.pop();
    S.values = h.values; S.notes = h.notes; S.mistakes = h.mistakes; S.hints = h.hints;
    render();
  }

  function hint() {
    if (S.won) return;
    var t = null;
    if (S.sel != null && !isGiven(S.sel) && S.values[S.sel] !== S.solution[S.sel]) {
      t = S.sel;
    } else {
      var open = [];
      for (var k = 0; k < 81; k++) if (S.values[k] !== S.solution[k]) open.push(k);
      if (!open.length) return;
      t = open[(Math.random() * open.length) | 0];
    }
    push();
    S.values[t] = S.solution[t];
    S.notes[t] = 0;
    clearPeerNotes(t, S.solution[t]);
    S.hints++;
    S.sel = t;
    checkWin();
    render();
  }

  function toggleNotes() {
    S.noteMode = !S.noteMode;
    render();
  }

  function move(dr, dc) {
    var k = S.sel == null ? 0 : S.sel;
    var r = Math.min(8, Math.max(0, R[k] + dr));
    var c = Math.min(8, Math.max(0, C[k] + dc));
    S.sel = r * 9 + c;
    render();
    cells[S.sel].focus({ preventScroll: true });
  }

  /* ---------- render ---------- */
  function render() {
    var hd = S.sel != null ? S.values[S.sel] : 0;
    var selPeers = S.sel != null ? PEERS[S.sel] : [];
    var isPeer = {};
    for (var x = 0; x < selPeers.length; x++) isPeer[selPeers[x]] = true;

    for (var k = 0; k < 81; k++) {
      var v = S.values[k], given = isGiven(k);
      var cls = 'cell';
      if (S.sel != null && isPeer[k]) cls += ' rel';
      if (hd && v === hd) cls += ' same';
      if (!given && v) cls += ' user';
      if (!given && v && v !== S.solution[k]) cls += ' bad';
      if (k === S.sel) cls += ' sel';
      var el = cells[k];
      el.className = cls;

      var html = '';
      if (v) {
        html = String(v);
      } else if (S.notes[k]) {
        html = '<div class="notes">';
        for (var d = 1; d <= 9; d++) {
          var on = S.notes[k] & (1 << (d - 1));
          html += '<span' + (on && d === hd ? ' class="hit"' : '') + '>' + (on ? d : '') + '</span>';
        }
        html += '</div>';
      }
      if (el.innerHTML !== html) el.innerHTML = html;

      el.setAttribute('aria-label',
        'Row ' + (R[k] + 1) + ', column ' + (C[k] + 1) + ', ' +
        (v ? (given ? 'given ' : '') + v : 'empty'));
    }

    // number pad: remaining count per digit
    var counts = [0,0,0,0,0,0,0,0,0,0];
    for (k = 0; k < 81; k++) if (S.values[k] && S.values[k] === S.solution[k]) counts[S.values[k]]++;
    for (d = 1; d <= 9; d++) {
      var left = 9 - counts[d];
      padBtns[d].querySelector('small').textContent = left > 0 ? left : '';
      padBtns[d].disabled = left <= 0 || S.won;
    }
    padEl.classList.toggle('notes-on', S.noteMode);

    // difficulty buttons
    var lv = $('levels').querySelectorAll('button');
    for (var q = 0; q < lv.length; q++) {
      lv[q].setAttribute('aria-pressed', lv[q].getAttribute('data-d') === S.diff ? 'true' : 'false');
    }

    // tools
    $('notes').setAttribute('aria-pressed', S.noteMode ? 'true' : 'false');
    $('notesLabel').textContent = S.noteMode ? 'Notes on' : 'Notes off';
    $('undo').disabled = S.won || !S.hist.length;
    $('erase').disabled = S.won;
    $('hintBtn').disabled = S.won;

    // status
    $('stats').textContent = 'Mistakes ' + S.mistakes + ' · Hints ' + S.hints;
    var best = loadBest();
    $('best').textContent = 'Best ' + DIFF[S.diff].label.toLowerCase() + ' ' + (best[S.diff] != null ? fmt(best[S.diff]) : '—');
    $('timer').textContent = fmt(S.elapsed);

    // win panel
    var win = $('win');
    win.hidden = !S.won;
    if (S.won) {
      $('winTime').textContent = DIFF[S.diff].label + ' in ' + fmt(S.elapsed) +
        ' with ' + S.mistakes + ' mistake' + (S.mistakes === 1 ? '' : 's') +
        ' and ' + S.hints + ' hint' + (S.hints === 1 ? '' : 's');
      $('winBest').textContent = S.newBest ? 'New best time' : '';
    }
  }

  /* ---------- events ---------- */
  $('levels').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (t && t.getAttribute('data-d')) newGame(t.getAttribute('data-d'));
  });
  $('newgame').addEventListener('click', function () { newGame(S.diff); });
  $('winNew').addEventListener('click', function () { newGame(S.diff); });
  $('undo').addEventListener('click', undo);
  $('erase').addEventListener('click', erase);
  $('notes').addEventListener('click', toggleNotes);
  $('hintBtn').addEventListener('click', hint);

  document.addEventListener('keydown', function (e) {
    if (!S) return;
    var key = e.key;
    if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'Z')) { e.preventDefault(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (key >= '1' && key <= '9') { place(+key); return; }
    if (key === 'Backspace' || key === 'Delete' || key === '0') { e.preventDefault(); erase(); return; }
    if (key === 'ArrowUp') { e.preventDefault(); move(-1, 0); return; }
    if (key === 'ArrowDown') { e.preventDefault(); move(1, 0); return; }
    if (key === 'ArrowLeft') { e.preventDefault(); move(0, -1); return; }
    if (key === 'ArrowRight') { e.preventDefault(); move(0, 1); return; }
    if (key === 'n' || key === 'N') { toggleNotes(); return; }
    if (key === 'h' || key === 'H') { hint(); return; }
  });

  setInterval(function () {
    if (!S || S.won || document.hidden) return;
    S.elapsed++;
    $('timer').textContent = fmt(S.elapsed);
  }, 1000);

  /* ---------- boot ---------- */
  newGame('easy');
})();
