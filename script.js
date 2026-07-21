(function () {
  const displayEl = document.getElementById('display');
  const sublineEl = document.getElementById('subline');
  const keypad = document.getElementById('keypad');
  const radLabel = document.querySelector('.rad-label');
  const degLabel = document.querySelector('.deg-label');
  const invBtn = document.querySelector('.k-inv');
  const sinBtn = document.getElementById('sin-btn');
  const cosBtn = document.getElementById('cos-btn');
  const tanBtn = document.getElementById('tan-btn');

  let state = { disp: '0', sub: '', ans: 0, mode: 'Deg', inv: false, justEval: false, err: false };

  function render() {
    displayEl.textContent = state.disp;
    sublineEl.textContent = state.sub;
    radLabel.className = 'rad-label ' + (state.mode === 'Rad' ? 'active' : 'dim');
    degLabel.className = 'deg-label ' + (state.mode === 'Deg' ? 'active' : 'dim');
    invBtn.classList.toggle('active', state.inv);
    sinBtn.textContent = state.inv ? 'sin⁻¹' : 'sin';
    cosBtn.textContent = state.inv ? 'cos⁻¹' : 'cos';
    tanBtn.textContent = state.inv ? 'tan⁻¹' : 'tan';
    displayEl.scrollLeft = displayEl.scrollWidth;
    sublineEl.scrollLeft = sublineEl.scrollWidth;
  }

  function fact(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function tokenize(s, ans) {
    const T = [];
    let i = 0;
    const isD = (c) => c >= '0' && c <= '9';
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      if (isD(c) || c === '.') {
        let j = i, num = '';
        while (j < s.length && (isD(s[j]) || s[j] === '.')) num += s[j++];
        if (s[j] === 'E') {
          num += 'e'; j++;
          if (s[j] === '+' || s[j] === '-') num += s[j++];
          while (j < s.length && isD(s[j])) num += s[j++];
        }
        T.push({ t: 'num', v: parseFloat(num) });
        i = j;
        continue;
      }
      if (c === '√') { T.push({ t: 'func', v: 'sqrt' }); i++; continue; }
      if (c === 'π') { T.push({ t: 'const', v: Math.PI }); i++; continue; }
      if (/[a-zA-Z]/.test(c)) {
        let j = i, name = '';
        while (j < s.length && /[a-zA-Z]/.test(s[j])) name += s[j++];
        const fns = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'ln', 'log', 'sqrt'];
        if (fns.indexOf(name) !== -1) T.push({ t: 'func', v: name });
        else if (name === 'e') T.push({ t: 'const', v: Math.E });
        else if (name === 'pi') T.push({ t: 'const', v: Math.PI });
        else if (name === 'Ans' || name === 'ans') T.push({ t: 'const', v: ans });
        else throw new Error('name ' + name);
        i = j;
        continue;
      }
      if (c === '×') { T.push({ t: 'op', v: '*' }); i++; continue; }
      if (c === '÷') { T.push({ t: 'op', v: '/' }); i++; continue; }
      if (c === '−' || c === '-') { T.push({ t: 'op', v: '-' }); i++; continue; }
      if (c === '+' || c === '*' || c === '/' || c === '^') { T.push({ t: 'op', v: c }); i++; continue; }
      if (c === '(') { T.push({ t: 'lp' }); i++; continue; }
      if (c === ')') { T.push({ t: 'rp' }); i++; continue; }
      if (c === '!') { T.push({ t: 'fact' }); i++; continue; }
      throw new Error('char ' + c);
    }
    return T;
  }

  function evaluate(raw, mode, ans) {
    let s = raw;
    const open = (s.match(/\(/g) || []).length;
    const close = (s.match(/\)/g) || []).length;
    if (open > close) s += ')'.repeat(open - close);
    const T = tokenize(s, ans);
    let p = 0;
    const peek = () => T[p];
    const eat = () => T[p++];
    const d2r = (x) => mode === 'Deg' ? x * Math.PI / 180 : x;
    const r2d = (x) => mode === 'Deg' ? x * 180 / Math.PI : x;
    const applyFn = (name, a) => {
      switch (name) {
        case 'sin': return Math.sin(d2r(a));
        case 'cos': return Math.cos(d2r(a));
        case 'tan': return Math.tan(d2r(a));
        case 'asin': return r2d(Math.asin(a));
        case 'acos': return r2d(Math.acos(a));
        case 'atan': return r2d(Math.atan(a));
        case 'ln': return Math.log(a);
        case 'log': return Math.log10(a);
        case 'sqrt': return Math.sqrt(a);
      }
      throw new Error('fn');
    };
    const parseExpr = () => {
      let v = parseTerm();
      while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
        const op = eat().v; const r = parseTerm(); v = op === '+' ? v + r : v - r;
      }
      return v;
    };
    const parseTerm = () => {
      let v = parsePower();
      while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
        const op = eat().v; const r = parsePower(); v = op === '*' ? v * r : v / r;
      }
      return v;
    };
    const parsePower = () => {
      const b = parseUnary();
      if (peek() && peek().t === 'op' && peek().v === '^') { eat(); const e = parsePower(); return Math.pow(b, e); }
      return b;
    };
    const parseUnary = () => {
      if (peek() && peek().t === 'op' && (peek().v === '-' || peek().v === '+')) {
        const op = eat().v; const v = parseUnary(); return op === '-' ? -v : v;
      }
      return parsePostfix();
    };
    const parsePostfix = () => {
      let v = parsePrimary();
      while (peek() && peek().t === 'fact') { eat(); v = fact(v); }
      return v;
    };
    const parsePrimary = () => {
      const tk = peek();
      if (!tk) throw new Error('end');
      if (tk.t === 'num') { eat(); return tk.v; }
      if (tk.t === 'const') { eat(); return tk.v; }
      if (tk.t === 'lp') { eat(); const v = parseExpr(); if (peek() && peek().t === 'rp') eat(); return v; }
      if (tk.t === 'func') {
        eat();
        let arg;
        if (peek() && peek().t === 'lp') { eat(); arg = parseExpr(); if (peek() && peek().t === 'rp') eat(); }
        else arg = parseUnary();
        return applyFn(tk.v, arg);
      }
      throw new Error('primary');
    };
    const v = parseExpr();
    if (p < T.length) throw new Error('trailing');
    return v;
  }

  function fmt(x) {
    if (Number.isNaN(x)) return '오류';
    if (!isFinite(x)) return x > 0 ? '∞' : '-∞';
    const r = parseFloat(x.toPrecision(13));
    return String(r);
  }

  function reduce(s, k) {
    if (k === 'mode') return Object.assign({}, s, { mode: s.mode === 'Deg' ? 'Rad' : 'Deg' });
    if (k === 'inv') return Object.assign({}, s, { inv: !s.inv });
    if (k === 'CE') return Object.assign({}, s, { disp: '0', sub: '', justEval: false, err: false });
    if (k === 'back') {
      if (s.err) return Object.assign({}, s, { disp: '0', sub: '', err: false, justEval: false });
      let d = s.disp;
      d = d.length <= 1 ? '0' : d.slice(0, -1);
      if (d === '' || d === '-' || d === '−') d = '0';
      return Object.assign({}, s, { disp: d, justEval: false });
    }
    if (k === '=') {
      try {
        const val = evaluate(s.disp, s.mode, s.ans);
        const out = fmt(val);
        if (out === '오류') return Object.assign({}, s, { disp: '오류', err: true, justEval: true });
        return Object.assign({}, s, { disp: out, sub: s.disp, ans: val, justEval: true, err: false });
      } catch (e) {
        return Object.assign({}, s, { disp: '오류', sub: s.disp, err: true, justEval: true });
      }
    }

    const map = {
      '*': '×', '/': '÷', '-': '−', '+': '+', '^': '^',
      '(': '(', ')': ')', '.': '.',
      'sin': s.inv ? 'asin(' : 'sin(',
      'cos': s.inv ? 'acos(' : 'cos(',
      'tan': s.inv ? 'atan(' : 'tan(',
      'ln': 'ln(', 'log': 'log(', 'sqrt': '√(',
      'pi': 'π', 'e': 'e', 'Ans': 'Ans', 'EXP': 'E', '!': '!'
    };
    let text = (k >= '0' && k <= '9') ? k : map[k];
    if (text === undefined) return s;

    const isDigit = (k >= '0' && k <= '9') || k === '.';
    const isValue = isDigit || ['pi', 'e', 'Ans'].indexOf(k) !== -1 || /\($/.test(text) || ['sin', 'cos', 'tan', 'ln', 'log', 'sqrt'].indexOf(k) !== -1;
    const operators = ['+', '-', '*', '/', '^', ')', '!', 'EXP'];

    let d = s.disp;
    if (s.err) d = '0';

    if (s.justEval || s.err) {
      if (operators.indexOf(k) !== -1) {
        d = (d === '오류' ? String(s.ans) : d) + text;
      } else {
        d = text === '.' ? '0.' : text;
      }
      return Object.assign({}, s, { disp: d, sub: '', justEval: false, err: false });
    }

    if (d === '0') {
      if (text === '.') return Object.assign({}, s, { disp: '0.', justEval: false });
      if (isValue) return Object.assign({}, s, { disp: text, justEval: false });
      return Object.assign({}, s, { disp: d + text, justEval: false });
    }
    return Object.assign({}, s, { disp: d + text, justEval: false });
  }

  function press(k) {
    state = reduce(state, k);
    render();
  }

  keypad.addEventListener('click', (e) => {
    const el = e.target.closest('[data-k]');
    if (!el) return;
    press(el.getAttribute('data-k'));
  });

  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k >= '0' && k <= '9') press(k);
    else if (k === '.') press('.');
    else if (k === '+') press('+');
    else if (k === '-') press('-');
    else if (k === '*') press('*');
    else if (k === '/') { e.preventDefault(); press('/'); }
    else if (k === '(') press('(');
    else if (k === ')') press(')');
    else if (k === '^') press('^');
    else if (k === 'Enter' || k === '=') { e.preventDefault(); press('='); }
    else if (k === 'Backspace') press('back');
    else if (k === 'Escape') press('CE');
  });

  render();
})();
