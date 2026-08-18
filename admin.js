/* ===== 数据管理 ===== */
(function () {
  'use strict';
  var PASS = '980620';
  var $ = function (id) { return document.getElementById(id); };

  var D = null;             // 可编辑数据（深拷贝自 window.ORDER_DATA）
  var currentTab = 'car';

  /* ---------- 数据深拷贝 ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function initData() {
    D = clone(window.ORDER_DATA);
    // 保证每个车系在所有集合都有项
    D.carOrder.forEach(function (c) {
      D.vehicles[c] = D.vehicles[c] || [];
      D.jingpin[c] = D.jingpin[c] || [];
      D.colors[c] = D.colors[c] || [];
      D.interiors[c] = D.interiors[c] || [];
      D.maintain[c] = D.maintain[c] || { sell: 0, cost: 0 };
      D.loan[c] = D.loan[c] || { insBonus: 0, limit: 0 };
    });
  }

  /* ---------- 登录 ---------- */
  function tryLogin() {
    if ($('pwdInput').value === PASS) {
      sessionStorage.setItem('price_admin_auth', '1');
      showPanel();
    } else {
      $('loginErr').textContent = '密码错误，请重试';
    }
  }
  function showPanel() {
    $('loginView').style.display = 'none';
    $('panelView').hidden = false;
    if (!D) initData();
    renderTab(currentTab);
  }

  /* ---------- Tab ---------- */
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    renderTab(tab);
  }
  function renderTab(tab) {
    var fn = { car: renderCar, jp: renderJp, color: renderColor, interior: renderInterior,
               mt: renderMt, bank: renderBank, loan: renderLoan, github: renderGithub }[tab];
    $('tabContent').innerHTML = fn();
    bindEditors();
    if (tab === 'github') fillGithubForm();
    $('saveStatus').textContent = '';
  }

  /* ---------- 渲染：车系/车型 ---------- */
  function renderCar() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block"><h3>';
      h += '<input data-write=\'{"type":"carName","car":"' + car + '"}\' value="' + car + '" style="width:140px">';
      h += '<button class="del-sm" data-del=\'{"type":"car","car":"' + car + '"}\' title="删除车系">x</button>';
      h += '</h3>';
      h += '<div style="display:grid;grid-template-columns:.6fr 1fr 1fr 30px;gap:8px;margin-bottom:6px">' +
           '<span class="mg-label">配置/车型</span><span class="mg-label">指导价</span><span class="mg-label">成本价</span><span></span></div>';
      (D.vehicles[car] || []).forEach(function (m, i) {
        h += '<div class="mg-row" style="grid-template-columns:.6fr 1fr 1fr 30px">';
        h += '<input data-write=\'{"type":"model","car":"' + car + '","idx":' + i + '}\' value="' + m.model + '">';
        h += '<input type="number" data-write=\'{"type":"guide","car":"' + car + '","idx":' + i + '}\' value="' + m.guide + '">';
        h += '<input type="number" data-write=\'{"type":"cost","car":"' + car + '","idx":' + i + '}\' value="' + m.cost + '">';
        h += '<button class="del-sm" data-del=\'{"type":"model","car":"' + car + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"model","car":"' + car + '"}\'>+ 添加车型</button>';
      h += '</div>';
    });
    h += '<button class="mg-add" data-add=\'{"type":"car"}\'>+ 添加车系</button>';
    return h;
  }

  /* ---------- 渲染：精品 ---------- */
  function renderJp() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block"><h3>' + car + '</h3>';
      h += '<div style="display:grid;grid-template-columns:1fr .7fr 30px;gap:8px;margin-bottom:6px">' +
           '<span class="mg-label">精品名称</span><span class="mg-label">采购价</span><span></span></div>';
      (D.jingpin[car] || []).forEach(function (p, i) {
        h += '<div class="mg-row" style="grid-template-columns:1fr .7fr 30px">';
        h += '<input data-write=\'{"type":"jpName","car":"' + car + '","idx":' + i + '}\' value="' + p.name + '">';
        h += '<input type="number" data-write=\'{"type":"jpBuy","car":"' + car + '","idx":' + i + '}\' value="' + p.buy + '">';
        h += '<button class="del-sm" data-del=\'{"type":"jp","car":"' + car + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"jp","car":"' + car + '"}\'>+ 添加精品</button>';
      h += '</div>';
    });
    return h;
  }

  /* ---------- 渲染：颜色/加价 ---------- */
  function renderColor() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block"><h3>' + car + '（可选颜色）</h3>';
      (D.colors[car] || []).forEach(function (c, i) {
        h += '<div class="mg-row" style="grid-template-columns:1fr 30px">';
        h += '<input data-write=\'{"type":"color","car":"' + car + '","idx":' + i + '}\' value="' + c + '">';
        h += '<button class="del-sm" data-del=\'{"type":"color","car":"' + car + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"color","car":"' + car + '"}\'>+ 添加颜色</button>';
      h += '</div>';
    });
    // 颜色加价
    h += '<div class="mg-block"><h3>颜色加价（全局）</h3>';
    h += '<div style="display:grid;grid-template-columns:1fr .7fr 30px;gap:8px;margin-bottom:6px">' +
         '<span class="mg-label">颜色</span><span class="mg-label">加价(元)</span><span></span></div>';
    Object.keys(D.colorPremium).forEach(function (c) {
      h += '<div class="mg-row" style="grid-template-columns:1fr .7fr 30px">';
      h += '<input data-write=\'{"type":"premName","car":"' + c + '"}\' value="' + c + '">';
      h += '<input type="number" data-write=\'{"type":"premVal","car":"' + c + '"}\' value="' + D.colorPremium[c] + '">';
      h += '<button class="del-sm" data-del=\'{"type":"prem","car":"' + c + '"}\'>x</button>';
      h += '</div>';
    });
    h += '<button class="mg-add" data-add=\'{"type":"prem"}\'>+ 添加加价颜色</button>';
    h += '</div>';
    return h;
  }

  /* ---------- 渲染：内饰 ---------- */
  function renderInterior() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block"><h3>' + car + '</h3>';
      (D.interiors[car] || []).forEach(function (c, i) {
        h += '<div class="mg-row" style="grid-template-columns:1fr 30px">';
        h += '<input data-write=\'{"type":"interior","car":"' + car + '","idx":' + i + '}\' value="' + c + '">';
        h += '<button class="del-sm" data-del=\'{"type":"interior","car":"' + car + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"interior","car":"' + car + '"}\'>+ 添加内饰</button>';
      h += '</div>';
    });
    return h;
  }

  /* ---------- 渲染：保养 ---------- */
  function renderMt() {
    var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">' +
            '<span class="mg-label">车系</span><span style="display:flex;gap:8px"><span style="flex:1">销售价</span><span style="flex:1">成本价</span></span></div>';
    D.carOrder.forEach(function (car) {
      var m = D.maintain[car] || { sell: 0, cost: 0 };
      h += '<div class="mg-row" style="grid-template-columns:1fr 1fr;grid-template-rows:auto">';
      h += '<div style="font-weight:600">' + car + '</div>';
      h += '<div style="display:flex;gap:8px">';
      h += '<input type="number" data-write=\'{"type":"mtSell","car":"' + car + '"}\' value="' + m.sell + '">';
      h += '<input type="number" data-write=\'{"type":"mtCost","car":"' + car + '"}\' value="' + m.cost + '">';
      h += '</div></div>';
    });
    return h;
  }

  /* ---------- 渲染：银行 ---------- */
  function renderBank() {
    var h = '<div style="display:grid;grid-template-columns:1fr .7fr 30px;gap:8px;margin-bottom:6px">' +
            '<span class="mg-label">银行</span><span class="mg-label">返息率</span><span></span></div>';
    D.banks.forEach(function (b, i) {
      h += '<div class="mg-row" style="grid-template-columns:1fr .7fr 30px">';
      h += '<input data-write=\'{"type":"bankName","idx":' + i + '}\' value="' + b.bank + '">';
      h += '<input type="number" step="0.0005" data-write=\'{"type":"bankRate","idx":' + i + '}\' value="' + b.rate + '">';
      h += '<button class="del-sm" data-del=\'{"type":"bank","idx":' + i + '}\'>x</button>';
      h += '</div>';
    });
    h += '<button class="mg-add" data-add=\'{"type":"bank"}\'>+ 添加银行</button>';
    return h;
  }

  /* ---------- 渲染：限价/保险 ---------- */
  function renderLoan() {
    var h = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px">' +
            '<span class="mg-label">车系</span><span class="mg-label">保险返佣</span><span class="mg-label">限价</span></div>';
    D.carOrder.forEach(function (car) {
      var l = D.loan[car] || { insBonus: 0, limit: 0 };
      h += '<div class="mg-row" style="grid-template-columns:1fr 1fr 1fr">';
      h += '<div style="font-weight:600">' + car + '</div>';
      h += '<input type="number" data-write=\'{"type":"insBonus","car":"' + car + '"}\' value="' + l.insBonus + '">';
      h += '<input type="number" data-write=\'{"type":"limit","car":"' + car + '"}\' value="' + l.limit + '">';
      h += '</div>';
    });
    return h;
  }

  /* ---------- 渲染：GitHub ---------- */
  function renderGithub() {
    return '<div class="mg-block"><h3>GitHub 仓库配置</h3>' +
      '<p class="mg-label" style="margin-bottom:10px">用于把修改后的价格数据写回仓库的 data.js（需仓库访问令牌 TOKEN，仅保存在本浏览器）。</p>' +
      '<div class="grid"><div class="field"><label>仓库所有者(owner)</label><input id="ghOwner" placeholder="你的GitHub用户名"></div>' +
      '<div class="field"><label>仓库名(repo)</label><input id="ghRepo" placeholder="如 order-price-web"></div>' +
      '<div class="field"><label>分支(branch)</label><input id="ghBranch" placeholder="main"></div>' +
      '<div class="field"><label>文件路径</label><input id="ghPath" value="data.js"></div>' +
      '<div class="field" style="grid-column:1/-1"><label>访问令牌 TOKEN（repo 权限，不写入代码）</label><input id="ghToken" type="password" placeholder="ghp_xxx"></div></div>' +
      '<button class="btn" id="testConn" style="margin-top:12px">测试连接</button></div>';
  }
  function fillGithubForm() {
    var cfg = loadCfg();
    if ($('ghOwner')) $('ghOwner').value = cfg.owner || '';
    if ($('ghRepo')) $('ghRepo').value = cfg.repo || '';
    if ($('ghBranch')) $('ghBranch').value = cfg.branch || 'main';
    if ($('ghPath')) $('ghPath').value = cfg.path || 'data.js';
    if ($('ghToken')) $('ghToken').value = cfg.token || '';
  }
  function loadCfg() {
    try { return JSON.parse(localStorage.getItem('price_admin_cfg') || '{}'); }
    catch (e) { return {}; }
  }
  function saveCfg(c) { localStorage.setItem('price_admin_cfg', JSON.stringify(c)); }

  /* ---------- 编辑操作 ---------- */
  function writeEdit(w, inp) {
    var val = inp.value;
    if (w.type === 'guide' || w.type === 'cost' || w.type === 'jpBuy' || w.type === 'mtSell' ||
        w.type === 'mtCost' || w.type === 'bankRate' || w.type === 'insBonus' || w.type === 'limit' ||
        w.type === 'premVal') {
      val = parseFloat(val) || 0;
    }
    switch (w.type) {
      case 'carName': renameCar(w.car, val); break;
      case 'model': D.vehicles[w.car][w.idx].model = val; break;
      case 'guide': D.vehicles[w.car][w.idx].guide = val; break;
      case 'cost': D.vehicles[w.car][w.idx].cost = val; break;
      case 'jpName': D.jingpin[w.car][w.idx].name = val; break;
      case 'jpBuy': D.jingpin[w.car][w.idx].buy = val; break;
      case 'color': D.colors[w.car][w.idx] = val; break;
      case 'premName': renamePrem(w.car, val); break;
      case 'premVal': D.colorPremium[w.car] = val; break;
      case 'interior': D.interiors[w.car][w.idx] = val; break;
      case 'mtSell': D.maintain[w.car].sell = val; break;
      case 'mtCost': D.maintain[w.car].cost = val; break;
      case 'bankName': D.banks[w.idx].bank = val; break;
      case 'bankRate': D.banks[w.idx].rate = val; break;
      case 'insBonus': D.loan[w.car].insBonus = val; break;
      case 'limit': D.loan[w.car].limit = val; break;
    }
  }
  function addEdit(w) {
    switch (w.type) {
      case 'car': addCar(); break;
      case 'model': D.vehicles[w.car].push({ model: '新车型', guide: 0, cost: 0 }); break;
      case 'jp': D.jingpin[w.car].push({ name: '新精品', buy: 0 }); break;
      case 'color': D.colors[w.car].push('新颜色'); break;
      case 'interior': D.interiors[w.car].push('新内饰'); break;
      case 'prem': D.colorPremium['新颜色'] = 0; break;
      case 'bank': D.banks.push({ bank: '新银行', rate: 0 }); break;
    }
    renderTab(currentTab);
  }
  function delEdit(w) {
    if (w.type === 'car') {
      if (!confirm('确定删除车系「' + w.car + '」及其所有数据？')) return;
      delCar(w.car);
    } else if (w.type === 'prem') {
      delete D.colorPremium[w.car];
    } else if (w.type === 'model') {
      D.vehicles[w.car].splice(w.idx, 1);
    } else if (w.type === 'jp') {
      D.jingpin[w.car].splice(w.idx, 1);
    } else if (w.type === 'color') {
      D.colors[w.car].splice(w.idx, 1);
    } else if (w.type === 'interior') {
      D.interiors[w.car].splice(w.idx, 1);
    } else if (w.type === 'bank') {
      D.banks.splice(w.idx, 1);
    }
    renderTab(currentTab);
  }
  function addCar() {
    var name = '新车系';
    var i = 1;
    while (D.carOrder.indexOf(name) >= 0) { name = '新车系' + i; i++; }
    D.carOrder.push(name);
    D.vehicles[name] = []; D.jingpin[name] = [];
    D.colors[name] = []; D.interiors[name] = [];
    D.maintain[name] = { sell: 0, cost: 0 };
    D.loan[name] = { insBonus: 0, limit: 0 };
    renderTab(currentTab);
  }
  function renameCar(oldName, newName) {
    if (!newName || newName === oldName) return;
    if (D.carOrder.indexOf(newName) >= 0) return;
    var o = D.carOrder.indexOf(oldName);
    D.carOrder[o] = newName;
    D.vehicles[newName] = D.vehicles[oldName]; delete D.vehicles[oldName];
    D.jingpin[newName] = D.jingpin[oldName]; delete D.jingpin[oldName];
    D.colors[newName] = D.colors[oldName]; delete D.colors[oldName];
    D.interiors[newName] = D.interiors[oldName]; delete D.interiors[oldName];
    D.maintain[newName] = D.maintain[oldName]; delete D.maintain[oldName];
    D.loan[newName] = D.loan[oldName]; delete D.loan[oldName];
    renderTab(currentTab);
  }
  function delCar(name) {
    D.carOrder.splice(D.carOrder.indexOf(name), 1);
    delete D.vehicles[name]; delete D.jingpin[name];
    delete D.colors[name]; delete D.interiors[name];
    delete D.maintain[name]; delete D.loan[name];
    renderTab(currentTab);
  }
  function renamePrem(oldName, newName) {
    if (!newName || newName === oldName) return;
    if (D.colorPremium[newName] !== undefined) return;
    D.colorPremium[newName] = D.colorPremium[oldName];
    delete D.colorPremium[oldName];
    renderTab(currentTab);
  }

  /* ---------- 事件绑定 ---------- */
  function bindEditors() {
    var root = $('tabContent');
    root.querySelectorAll('input[data-write]').forEach(function (inp) {
      inp.addEventListener('change', function () { writeEdit(JSON.parse(inp.dataset.write), inp); });
    });
    root.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () { addEdit(JSON.parse(b.dataset.add)); });
    });
    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () { delEdit(JSON.parse(b.dataset.del)); });
    });
    if ($('testConn')) $('testConn').addEventListener('click', testConnection);
  }

  /* ---------- 生成输出 ---------- */
  function buildOutput() {
    var out = {
      vehicles: {}, carOrder: D.carOrder.slice(), jingpin: {},
      colors: {}, interiors: {}, maintain: {}, banks: D.banks.slice(), loan: {}, colorPremium: D.colorPremium
    };
    D.carOrder.forEach(function (c) {
      out.vehicles[c] = D.vehicles[c] || [];
      out.jingpin[c] = D.jingpin[c] || [];
      out.colors[c] = D.colors[c] || [];
      out.interiors[c] = D.interiors[c] || [];
      out.maintain[c] = D.maintain[c] || { sell: 0, cost: 0 };
      out.loan[c] = D.loan[c] || { insBonus: 0, limit: 0 };
    });
    return out;
  }
  function makeDataJs() {
    return '// 自动生成：订单价格申请 数据源\nwindow.ORDER_DATA = ' +
      JSON.stringify(buildOutput(), null, 1) + ';\n';
  }
  function utf8ToB64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /* ---------- GitHub ---------- */
  function readCfg() {
    var cfg = loadCfg();
    if ($('ghOwner')) cfg.owner = $('ghOwner').value.trim() || cfg.owner;
    if ($('ghRepo')) cfg.repo = $('ghRepo').value.trim() || cfg.repo;
    if ($('ghBranch')) cfg.branch = $('ghBranch').value.trim() || 'main';
    if ($('ghPath')) cfg.path = $('ghPath').value.trim() || 'data.js';
    if ($('ghToken') && $('ghToken').value) cfg.token = $('ghToken').value.trim();
    return cfg;
  }
  function testConnection() {
    var cfg = readCfg();
    var st = $('saveStatus');
    st.textContent = '测试中...'; st.className = 'status';
    fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo, {
      headers: { Authorization: 'token ' + cfg.token }
    }).then(function (r) {
      if (r.ok) { st.textContent = '连接成功 ✓'; st.className = 'status ok'; }
      else if (r.status === 401) { st.textContent = 'TOKEN 无效或权限不足'; st.className = 'status err'; }
      else if (r.status === 404) { st.textContent = '仓库不存在，请检查 owner/repo'; st.className = 'status err'; }
      else { st.textContent = '错误 ' + r.status; st.className = 'status err'; }
    }).catch(function () {
      st.textContent = '网络错误，无法连接 GitHub'; st.className = 'status err';
    });
  }
  function saveToGithub() {
    var cfg = readCfg();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      switchTab('github');
      var st = $('saveStatus');
      st.textContent = '请先填写 owner / repo / TOKEN，再点击「保存到 GitHub」';
      st.className = 'status err';
      return;
    }
    saveCfg(cfg);
    var content = makeDataJs();
    var st = $('saveStatus');
    st.textContent = '正在写入 GitHub...'; st.className = 'status';
    var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + cfg.path;
    var headers = { Authorization: 'token ' + cfg.token, 'Content-Type': 'application/json' };
    // 先获取现有文件 sha
    fetch(url + '?ref=' + encodeURIComponent(cfg.branch), { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (f) {
        var body = { message: '更新订单价格数据', content: utf8ToB64(content), branch: cfg.branch };
        if (f.sha) body.sha = f.sha;
        return fetch(url, { method: 'PUT', headers: headers, body: JSON.stringify(body) });
      })
      .then(function (r) {
        if (r.ok) {
          st.textContent = '已保存 ✓ 等待 GitHub Pages 更新（约 1-2 分钟）'; st.className = 'status ok';
        } else {
          return r.json().then(function (j) {
            var msg = (j.message || '未知错误') + (j.errors ? ' ' + j.errors.map(function (e) { return e.message; }).join(';') : '');
            st.textContent = '保存失败：' + msg; st.className = 'status err';
          });
        }
      })
      .catch(function () {
        st.textContent = '保存失败：网络错误'; st.className = 'status err';
      });
  }
  function previewData() {
    var win = window.open('', '_blank');
    win.document.write('<pre>' + escapeHtml(makeDataJs()) + '</pre>');
    win.document.close();
  }
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 启动 ---------- */
  $('loginBtn').addEventListener('click', tryLogin);
  $('pwdInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryLogin(); });
  $('backBtn').addEventListener('click', function () { location.href = 'index.html'; });
  $('logoutBtn').addEventListener('click', function () {
    sessionStorage.removeItem('price_admin_auth');
    location.reload();
  });
  $('saveBtn').addEventListener('click', saveToGithub);
  $('previewBtn').addEventListener('click', previewData);
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchTab(b.dataset.tab); });
  });

  // 已登录则直接进入
  if (sessionStorage.getItem('price_admin_auth') === '1') showPanel();
})();
