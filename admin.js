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
    D.globalColors = D.globalColors || {};
    D.globalJps = D.globalJps || {};
    D.globalInteriors = D.globalInteriors || {};
    D.globalMt = D.globalMt || null;
    D.dropdowns = D.dropdowns || { '按揭': [], '客户来源': [], '车辆来源': [] };
    D.calc = D.calc || {
      priceDeduct: ['cash', 'replace', 'insurance', 'ecom', 'base', 'specialDisc'],
      grossAdd: ['replace', 'insurance', 'ecom', 'base', 'specialDisc', 'specialRebate'],
      unitProfitAdd: ['tier3', 'replace', 'insurance', 'ecom', 'base', 'specialDisc', 'specialRebate']
    };
    // 保证每个车系在所有集合都有项
    D.carOrder.forEach(function (c) {
      D.vehicles[c] = D.vehicles[c] || [];
      D.jingpin[c] = D.jingpin[c] || [];
      D.colors[c] = (D.colors[c] || []).map(function (x) {
        return typeof x === 'string' ? { name: x, premium: 0 } : x;
      });
      D.interiors[c] = (D.interiors[c] || []).map(function (x) {
        return typeof x === 'string' ? { name: x, premium: 0 } : x;
      });
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
               mt: renderMt, bank: renderBank, loan: renderLoan, dropdown: renderDropdown, calc: renderCalc, github: renderGithub }[tab];
    $('tabContent').innerHTML = fn();
    bindEditors();
    if (tab === 'github') fillGithubForm();
    $('saveStatus').textContent = '';
  }

  /* ---------- 渲染：车系/车型 ---------- */
  function renderCar() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block" data-drag-car="' + car + '"><h3>';
      h += '<span class="drag-handle" draggable="true" title="拖拽调整顺序">⠿</span>';
      h += '<input data-write=\'{"type":"carName","car":"' + car + '"}\' value="' + car + '" style="width:140px">';
      h += '<button class="del-sm" data-del=\'{"type":"car","car":"' + car + '"}\' title="删除车系">x</button>';
      h += '</h3>';
      h += '<div style="display:grid;grid-template-columns:30px .6fr 1fr 1fr 30px;gap:8px;margin-bottom:6px">' +
           '<span></span><span class="mg-label">配置/车型</span><span class="mg-label">指导价</span><span class="mg-label">成本价</span><span></span></div>';
      (D.vehicles[car] || []).forEach(function (m, i) {
        h += '<div class="mg-row" style="grid-template-columns:30px .6fr 1fr 1fr 30px" data-drag-car="' + car + '" data-drag-idx="' + i + '">';
        h += '<span class="drag-handle" draggable="true" title="拖拽调整顺序">⠿</span>';
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

  /* ---------- 渲染：精品（多车系同名精品可设全局，与颜色加价一致） ---------- */
  function renderJp() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block"><h3>' + car + '</h3>';
      h += '<div style="display:grid;grid-template-columns:1fr .7fr 80px 30px;gap:8px;margin-bottom:6px">' +
           '<span class="mg-label">精品名称</span><span class="mg-label">采购价</span><span class="mg-label">全局</span><span class="mg-label">删除</span></div>';
      (D.jingpin[car] || []).forEach(function (p, i) {
        var multi = countJpOf(p.name) > 1;
        var isGlobal = D.globalJps[p.name] !== undefined;
        var disp = isGlobal ? D.globalJps[p.name] : p.buy;
        var g = multi
          ? '<span class="mg-label"><input type="checkbox" data-global-jp data-jp="' + p.name + '"' + (isGlobal ? ' checked' : '') + '> 全局</span>'
          : '<span></span>';
        h += '<div class="mg-row" style="grid-template-columns:1fr .7fr 80px 30px">';
        h += '<input data-write=\'{"type":"jpName","car":"' + car + '","idx":' + i + '}\' value="' + p.name + '">';
        h += '<input type="number" data-jp-buy="' + p.name + '" data-write=\'{"type":"jpBuy","car":"' + car + '","idx":' + i + '}\' value="' + disp + '">';
        h += g;
        h += '<button class="del-sm" data-del=\'{"type":"jp","car":"' + car + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"jp","car":"' + car + '"}\'>+ 添加精品</button>';
      h += '</div>';
    });
    return h;
  }

  function countJpOf(name) {
    var n = 0;
    D.carOrder.forEach(function (c) {
      (D.jingpin[c] || []).forEach(function (x) { if (x.name === name) n++; });
    });
    return n;
  }
  function toggleGlobalJp(name, checked) {
    if (checked) {
      var cur = 0;
      var inp = document.querySelector('#tabContent input[data-jp-buy="' + name + '"]');
      if (inp && inp.value !== '' && !isNaN(parseFloat(inp.value))) {
        cur = parseFloat(inp.value) || 0;
      } else {
        D.carOrder.forEach(function (c) {
          (D.jingpin[c] || []).forEach(function (x) { if (x.name === name && x.buy) cur = x.buy; });
        });
      }
      D.globalJps[name] = cur;
      D.carOrder.forEach(function (c) {
        (D.jingpin[c] || []).forEach(function (x) { if (x.name === name) x.buy = cur; });
      });
    } else {
      delete D.globalJps[name];
    }
    renderTab('jp');
  }

  function countCarOf(color) {
    var n = 0;
    D.carOrder.forEach(function (c) {
      (D.colors[c] || []).forEach(function (x) { if (x.name === color) n++; });
    });
    return n;
  }
  function toggleGlobal(color, checked) {
    if (checked) {
      var cur = 0;
      var inp = document.querySelector('#tabContent input[data-premium-color="' + color + '"]');
      if (inp && inp.value !== '' && !isNaN(parseFloat(inp.value))) {
        cur = parseFloat(inp.value) || 0;
      } else {
        D.carOrder.forEach(function (c) {
          (D.colors[c] || []).forEach(function (x) { if (x.name === color && x.premium) cur = x.premium; });
        });
      }
      D.globalColors[color] = cur;
      D.carOrder.forEach(function (c) {
        (D.colors[c] || []).forEach(function (x) { if (x.name === color) x.premium = cur; });
      });
    } else {
      delete D.globalColors[color];
    }
    renderTab('color');
  }

  /* ---------- 渲染：颜色/加价（按车系，多车系颜色可设全局） ---------- */
  function renderColor() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block"><h3>' + car + '（可选颜色 / 加价）</h3>';
      h += '<div style="display:grid;grid-template-columns:1fr .7fr 80px 30px;gap:8px;margin-bottom:6px">' +
           '<span class="mg-label">颜色</span><span class="mg-label">加价(元)</span><span class="mg-label">全局</span><span class="mg-label">删除</span></div>';
      (D.colors[car] || []).forEach(function (c, i) {
        var multi = countCarOf(c.name) > 1;
        var isGlobal = D.globalColors[c.name] !== undefined;
        var disp = isGlobal ? D.globalColors[c.name] : c.premium;
        var g = multi
          ? '<span class="mg-label"><input type="checkbox" data-global data-color="' + c.name + '"' + (isGlobal ? ' checked' : '') + '> 全局</span>'
          : '<span></span>';
        h += '<div class="mg-row" style="grid-template-columns:1fr .7fr 80px 30px">';
        h += '<input data-write=\'{"type":"color","car":"' + car + '","idx":' + i + '}\' value="' + c.name + '">';
        h += '<input type="number" data-premium-color="' + c.name + '" data-write=\'{"type":"colorPremium","car":"' + car + '","idx":' + i + '}\' value="' + disp + '">';
        h += g;
        h += '<button class="del-sm" data-del=\'{"type":"color","car":"' + car + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"color","car":"' + car + '"}\'>+ 添加颜色</button>';
      h += '</div>';
    });
    return h;
  }

  /* ---------- 渲染：内饰（同名可全局统一加价） ---------- */
  function renderInterior() {
    var h = '';
    D.carOrder.forEach(function (car) {
      h += '<div class="mg-block"><h3>' + car + '</h3>';
      h += '<div style="display:grid;grid-template-columns:1fr .7fr 80px 30px;gap:8px;margin-bottom:6px">' +
           '<span class="mg-label">内饰名称</span><span class="mg-label">加价(元)</span><span class="mg-label">全局</span><span class="mg-label">删除</span></div>';
      (D.interiors[car] || []).forEach(function (c, i) {
        var multi = countIntOf(c.name) > 1;
        var isGlobal = D.globalInteriors[c.name] !== undefined;
        var disp = isGlobal ? D.globalInteriors[c.name] : c.premium;
        var g = multi
          ? '<span class="mg-label"><input type="checkbox" data-global-interior data-int="' + c.name + '"' + (isGlobal ? ' checked' : '') + '> 全局</span>'
          : '<span></span>';
        h += '<div class="mg-row" style="grid-template-columns:1fr .7fr 80px 30px">';
        h += '<input data-write=\'{"type":"interiorName","car":"' + car + '","idx":' + i + '}\' value="' + c.name + '">';
        h += '<input type="number" data-int-buy="' + c.name + '" data-write=\'{"type":"interiorPremium","car":"' + car + '","idx":' + i + '}\' value="' + disp + '">';
        h += g;
        h += '<button class="del-sm" data-del=\'{"type":"interior","car":"' + car + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"interior","car":"' + car + '"}\'>+ 添加内饰</button>';
      h += '</div>';
    });
    return h;
  }

  function countIntOf(name) {
    var n = 0;
    D.carOrder.forEach(function (c) {
      (D.interiors[c] || []).forEach(function (x) { if (x.name === name) n++; });
    });
    return n;
  }
  function toggleGlobalInterior(name, checked) {
    if (checked) {
      var cur = 0;
      var inp = document.querySelector('#tabContent input[data-int-buy="' + name + '"]');
      if (inp && inp.value !== '' && !isNaN(parseFloat(inp.value))) {
        cur = parseFloat(inp.value) || 0;
      } else {
        D.carOrder.forEach(function (c) {
          (D.interiors[c] || []).forEach(function (x) { if (x.name === name && x.premium) cur = x.premium; });
        });
      }
      D.globalInteriors[name] = cur;
      D.carOrder.forEach(function (c) {
        (D.interiors[c] || []).forEach(function (x) { if (x.name === name) x.premium = cur; });
      });
    } else {
      delete D.globalInteriors[name];
    }
    renderTab('interior');
  }

  /* ---------- 渲染：保养（可全局统一销售/成本价） ---------- */
  function renderMt() {
    var gm = D.globalMt || { sell: 0, cost: 0 };
    var useG = D.globalMt ? ' checked' : '';
    var h = '<div class="mg-block"><h3>保养价格（全局）</h3>';
    h += '<div class="mg-row" style="grid-template-columns:auto 1fr 1fr;grid-template-rows:auto">';
    h += '<span class="mg-label" style="padding-top:8px"><input type="checkbox" id="mtGlobalUse"' + useG + '> 全局应用</span>';
    h += '<input type="number" id="mtGlobalSell" value="' + gm.sell + '" placeholder="全局销售价">';
    h += '<input type="number" id="mtGlobalCost" value="' + gm.cost + '" placeholder="全局成本价">';
    h += '</div></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">' +
         '<span class="mg-label">车系</span><span style="display:flex;gap:8px"><span style="flex:1">销售价</span><span style="flex:1">成本价</span></span></div>';
    D.carOrder.forEach(function (car) {
      var m = D.maintain[car] || { sell: 0, cost: 0 };
      var s = useG ? gm.sell : m.sell;
      var c2 = useG ? gm.cost : m.cost;
      h += '<div class="mg-row" style="grid-template-columns:1fr 1fr;grid-template-rows:auto">';
      h += '<div style="font-weight:600">' + car + '</div>';
      h += '<div style="display:flex;gap:8px">';
      h += '<input type="number" data-write=\'{"type":"mtSell","car":"' + car + '"}\' value="' + s + '"' + (useG ? ' readonly style="background:#f4f5f7"' : '') + '>';
      h += '<input type="number" data-write=\'{"type":"mtCost","car":"' + car + '"}\' value="' + c2 + '"' + (useG ? ' readonly style="background:#f4f5f7"' : '') + '>';
      h += '</div></div>';
    });
    return h;
  }

  function toggleGlobalMt(checked) {
    if (checked) {
      var sell = 0, cost = 0;
      D.carOrder.forEach(function (c) {
        var m = D.maintain[c] || {};
        if (m.sell !== undefined) sell = m.sell;
        if (m.cost !== undefined) cost = m.cost;
      });
      D.globalMt = { sell: sell, cost: cost };
      applyGlobalMt();
    } else {
      D.globalMt = null;
    }
    renderTab('mt');
  }
  function applyGlobalMt() {
    if (!D.globalMt) return;
    D.carOrder.forEach(function (c) {
      if (D.maintain[c]) { D.maintain[c].sell = D.globalMt.sell; D.maintain[c].cost = D.globalMt.cost; }
    });
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

  /* ---------- 渲染：下拉选项 ---------- */
  function renderDropdown() {
    var h = '';
    ['按揭', '客户来源', '车辆来源'].forEach(function (field) {
      var arr = D.dropdowns[field] || [];
      h += '<div class="mg-block"><h3>' + field + '（下拉选项）</h3>';
      h += '<div style="display:grid;grid-template-columns:1fr 30px;gap:8px;margin-bottom:6px">' +
           '<span class="mg-label">选项</span><span></span></div>';
      arr.forEach(function (v, i) {
        h += '<div class="mg-row" style="grid-template-columns:1fr 30px">';
        h += '<input data-write=\'{"type":"ddOption","field":"' + field + '","idx":' + i + '}\' value="' + v + '">';
        h += '<button class="del-sm" data-del=\'{"type":"ddOption","field":"' + field + '","idx":' + i + '}\'>x</button>';
        h += '</div>';
      });
      h += '<button class="mg-add" data-add=\'{"type":"ddOption","field":"' + field + '"}\'>+ 添加选项</button>';
      h += '</div>';
    });
    return h;
  }

  /* ---------- 渲染：GitHub ---------- */
  function renderGithub() {
    return '<div class="mg-block"><h3>GitHub 保存配置</h3>' +
      '<p class="mg-label" style="margin-bottom:10px">填入访问令牌 TOKEN 即可把修改保存到网页（目标仓库已固定，TOKEN 仅保存在本浏览器）。</p>' +
      '<div class="field"><label>目标仓库（固定）</label><input value="JJH980620/order-price-web（main · data.js）" readonly style="background:#f4f5f7;color:#555"></div>' +
      '<div class="field" style="margin-top:10px"><label>访问令牌 TOKEN（repo 写权限，不写入代码）</label><input id="ghToken" type="password" placeholder="ghp_xxx"></div>' +
      '<button class="btn" id="testConn" style="margin-top:12px">测试连接</button></div>';
  }
  function fillGithubForm() {
    var cfg = loadCfg();
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
        w.type === 'colorPremium' || w.type === 'interiorPremium') {
      val = parseFloat(val) || 0;
    }
    switch (w.type) {
      case 'carName': renameCar(w.car, val); break;
      case 'model': D.vehicles[w.car][w.idx].model = val; break;
      case 'guide': D.vehicles[w.car][w.idx].guide = val; break;
      case 'cost': D.vehicles[w.car][w.idx].cost = val; break;
      case 'jpName': D.jingpin[w.car][w.idx].name = val; break;
      case 'jpBuy': {
        var pname = D.jingpin[w.car][w.idx].name;
        if (D.globalJps[pname] !== undefined) {
          D.globalJps[pname] = val;
          document.querySelectorAll('#tabContent input[data-jp-buy="' + pname + '"]').forEach(function (inp) { inp.value = val; });
        } else {
          D.jingpin[w.car][w.idx].buy = val;
        }
        break;
      }
      case 'color': D.colors[w.car][w.idx].name = val; break;
      case 'colorPremium': {
        var cname = D.colors[w.car][w.idx].name;
        if (D.globalColors[cname] !== undefined) {
          D.globalColors[cname] = val;
          document.querySelectorAll('#tabContent input[data-premium-color="' + cname + '"]').forEach(function (inp) { inp.value = val; });
        } else {
          D.colors[w.car][w.idx].premium = val;
        }
        break;
      }
      case 'interiorName': D.interiors[w.car][w.idx].name = val; break;
      case 'interiorPremium': {
        var iname = D.interiors[w.car][w.idx].name;
        if (D.globalInteriors[iname] !== undefined) {
          D.globalInteriors[iname] = val;
          document.querySelectorAll('#tabContent input[data-int-buy="' + iname + '"]').forEach(function (inp) { inp.value = val; });
        } else {
          D.interiors[w.car][w.idx].premium = val;
        }
        break;
      }
      case 'mtSell': D.maintain[w.car].sell = val; break;
      case 'mtCost': D.maintain[w.car].cost = val; break;
      case 'bankName': D.banks[w.idx].bank = val; break;
      case 'bankRate': D.banks[w.idx].rate = val; break;
      case 'insBonus': D.loan[w.car].insBonus = val; break;
      case 'limit': D.loan[w.car].limit = val; break;
      case 'ddOption': D.dropdowns[w.field][w.idx] = val; break;
    }
  }
  function addEdit(w) {
    switch (w.type) {
      case 'car': addCar(); break;
      case 'model': D.vehicles[w.car].push({ model: '新车型', guide: 0, cost: 0 }); break;
      case 'jp': D.jingpin[w.car].push({ name: '新精品', buy: 0 }); break;
      case 'color': D.colors[w.car].push({ name: '新颜色', premium: 0 }); break;
      case 'interior': D.interiors[w.car].push({ name: '新内饰', premium: 0 }); break;
      case 'bank': D.banks.push({ bank: '新银行', rate: 0 }); break;
      case 'ddOption': D.dropdowns[w.field].push('新选项'); break;
    }
    renderTab(currentTab);
  }
  function delEdit(w) {
    if (w.type === 'car') {
      if (!confirm('确定删除车系「' + w.car + '」及其所有数据？')) return;
      delCar(w.car);
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
    } else if (w.type === 'ddOption') {
      D.dropdowns[w.field].splice(w.idx, 1);
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
    root.querySelectorAll('input[data-global]').forEach(function (cb) {
      cb.addEventListener('change', function () { toggleGlobal(cb.dataset.color, cb.checked); });
    });
    root.querySelectorAll('input[data-global-jp]').forEach(function (cb) {
      cb.addEventListener('change', function () { toggleGlobalJp(cb.dataset.jp, cb.checked); });
    });
    root.querySelectorAll('input[data-global-interior]').forEach(function (cb) {
      cb.addEventListener('change', function () { toggleGlobalInterior(cb.dataset.int, cb.checked); });
    });
    var mgUse = $('mtGlobalUse'), mgSell = $('mtGlobalSell'), mgCost = $('mtGlobalCost');
    if (mgUse) mgUse.addEventListener('change', function () { toggleGlobalMt(mgUse.checked); });
    if (mgSell) mgSell.addEventListener('change', function () { if (D.globalMt) { D.globalMt.sell = parseFloat(mgSell.value) || 0; applyGlobalMt(); renderTab('mt'); } });
    if (mgCost) mgCost.addEventListener('change', function () { if (D.globalMt) { D.globalMt.cost = parseFloat(mgCost.value) || 0; applyGlobalMt(); renderTab('mt'); } });
    root.querySelectorAll('input[data-calc]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var arr = D.calc[cb.dataset.group] = D.calc[cb.dataset.group] || [];
        var idx = arr.indexOf(cb.dataset.key);
        if (cb.checked && idx < 0) arr.push(cb.dataset.key);
        if (!cb.checked && idx >= 0) arr.splice(idx, 1);
      });
    });
    if ($('testConn')) $('testConn').addEventListener('click', testConnection);
    bindCarDrag();
  }

  /* ---------- 车系/车型 拖拽交换 ---------- */
  function bindCarDrag() {
    var root = $('tabContent');
    var blocks = root.querySelectorAll('.mg-block[data-drag-car]');
    if (!blocks.length) return;

    function swapDom(a, b) {
      if (!a || !b || a === b) return;
      var parent = a.parentNode;
      var tmp = document.createElement('div');
      parent.insertBefore(tmp, a);
      parent.insertBefore(a, b);
      parent.insertBefore(b, tmp);
      parent.removeChild(tmp);
    }
    function clearOver() {
      root.querySelectorAll('.mg-block, .mg-row').forEach(function (e) { e.classList.remove('drag-over', 'drag-src'); });
    }
    function reindexModelRows(car) {
      var rows = [];
      root.querySelectorAll('.mg-row').forEach(function (r) {
        if (r.dataset.dragCar === car) rows.push(r);
      });
      rows.forEach(function (r, ni) {
        r.dataset.dragIdx = ni;
        r.querySelectorAll('[data-write]').forEach(function (inp) {
          var w = JSON.parse(inp.dataset.write);
          if (w.car === car && typeof w.idx === 'number') { w.idx = ni; inp.dataset.write = JSON.stringify(w); }
        });
      });
    }

    // 车系块
    blocks.forEach(function (block) {
      block.addEventListener('dragover', function (e) {
        if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'application/x-car') >= 0) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          block.classList.add('drag-over');
        }
      });
      block.addEventListener('dragleave', function () { block.classList.remove('drag-over'); });
      block.addEventListener('drop', function (e) {
        e.preventDefault(); block.classList.remove('drag-over');
        var srcCar = e.dataTransfer.getData('application/x-car');
        var dstCar = block.dataset.dragCar;
        if (!srcCar || srcCar === dstCar) return;
        var ia = D.carOrder.indexOf(srcCar), ib = D.carOrder.indexOf(dstCar);
        if (ia < 0 || ib < 0) return;
        D.carOrder[ia] = dstCar; D.carOrder[ib] = srcCar;
        var elA = null;
        blocks.forEach(function (b) { if (b.dataset.dragCar === srcCar) elA = b; });
        swapDom(elA, block);
      });
      block.addEventListener('dragend', clearOver);
      var handle = block.querySelector('.drag-handle');
      if (handle) {
        handle.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('application/x-car', block.dataset.dragCar);
          e.dataTransfer.effectAllowed = 'move';
          block.classList.add('drag-src');
        });
      }
    });

    // 车型行
    root.querySelectorAll('.mg-row').forEach(function (row) {
      row.addEventListener('dragover', function (e) {
        if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'application/x-model') >= 0) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          row.classList.add('drag-over');
        }
      });
      row.addEventListener('dragleave', function () { row.classList.remove('drag-over'); });
      row.addEventListener('drop', function (e) {
        e.preventDefault(); row.classList.remove('drag-over');
        var payload = e.dataTransfer.getData('application/x-model');
        if (!payload) return;
        var src = JSON.parse(payload);
        var dstCar = row.dataset.dragCar, dstIdx = parseInt(row.dataset.dragIdx);
        if (!D.vehicles[src.car] || src.car !== dstCar || src.idx === dstIdx) return;
        var arr = D.vehicles[src.car];
        if (src.idx < 0 || src.idx >= arr.length || dstIdx < 0 || dstIdx >= arr.length) return;
        var t = arr[src.idx]; arr[src.idx] = arr[dstIdx]; arr[dstIdx] = t;
        var el1 = null;
        root.querySelectorAll('.mg-row').forEach(function (r) {
          if (r.dataset.dragCar === src.car && parseInt(r.dataset.dragIdx) === src.idx) el1 = r;
        });
        swapDom(el1, row);
        reindexModelRows(src.car);
      });
      row.addEventListener('dragend', clearOver);
      var handle = row.querySelector('.drag-handle');
      if (handle) {
        handle.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('application/x-model', JSON.stringify({ car: row.dataset.dragCar, idx: parseInt(row.dataset.dragIdx) }));
          e.dataTransfer.effectAllowed = 'move';
          row.classList.add('drag-src');
        });
      }
    });
  }

  /* ---------- 部署状态自动检测 ---------- */
  function pollDeploy(cfg, saveTime) {
    var st = $('saveStatus');
    var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/pages/builds/latest';
    var headers = { Authorization: 'token ' + cfg.token };
    fetch(url, { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (b) {
        var t = Date.parse(b.updated_at || b.created_at || '') || 0;
        if (b.status === 'errored') {
          st.textContent = '部署失败：' + ((b.error && b.error.message) ? b.error.message : '未知错误');
          st.className = 'status err';
          return;
        }
        if (b.status === 'built' && t >= saveTime) {
          st.textContent = '已更新完成 ✓ 刷新报价页即可看到新数据';
          st.className = 'status ok';
          return;
        }
        st.textContent = '正在部署更新... ' + (b.status === 'building' ? '构建中' : '排队中');
        st.className = 'status';
        setTimeout(function () { pollDeploy(cfg, saveTime); }, 10000);
      })
      .catch(function () {
        st.textContent = '已保存，但无法自动检测部署状态（网络问题）。稍后刷新报价页确认更新';
        st.className = 'status';
      });
  }

  /* ---------- 写版本标记文件（供报价页检测更新） ---------- */
  function commitFiles(cfg, files) {
    var headers = { Authorization: 'token ' + cfg.token, 'Content-Type': 'application/json' };
    var base = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo;
    return fetch(base + '/git/refs/heads/' + cfg.branch, { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (ref) {
        if (!ref.object || !ref.object.sha) throw new Error('无法读取分支');
        var headSha = ref.object.sha;
        var treeBase = ref.object.tree_sha || headSha;
        var blobs = Object.keys(files).map(function (path) {
          return fetch(base + '/git/blobs', {
            method: 'POST', headers: headers,
            body: JSON.stringify({ content: files[path], encoding: 'utf-8' })
          }).then(function (r) { return r.json(); }).then(function (b) {
            if (!b.sha) throw new Error('创建内容失败');
            return { path: path, mode: '100644', type: 'blob', sha: b.sha };
          });
        });
        return Promise.all(blobs).then(function (items) {
          return fetch(base + '/git/trees', {
            method: 'POST', headers: headers,
            body: JSON.stringify({ base_tree: treeBase, tree: items })
          }).then(function (r) { return r.json(); }).then(function (t) {
            if (!t.sha) throw new Error('创建目录失败');
            return { treeSha: t.sha, headSha: headSha };
          });
        });
      })
      .then(function (data) {
        return fetch(base + '/git/commits', {
          method: 'POST', headers: headers,
          body: JSON.stringify({ message: '更新订单价格数据', tree: data.treeSha, parents: [data.headSha] })
        }).then(function (r) { return r.json(); }).then(function (c) {
          if (!c.sha) throw new Error('创建提交失败');
          return c.sha;
        });
      })
      .then(function (commitSha) {
        return fetch(base + '/git/refs/heads/' + cfg.branch, {
          method: 'PATCH', headers: headers,
          body: JSON.stringify({ sha: commitSha, force: false })
        }).then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || '提交失败'); });
        });
      });
  }

  /* ---------- 渲染：计算配置 ---------- */
  function renderCalc() {
    var labels = { cash: '现金优惠', replace: '置换补贴', insurance: '保险补贴', ecom: '电商补贴', base: '基地补贴', specialDisc: '特殊折让', specialRebate: '特殊车型折让', tier3: '三级毛利' };
    function group(title, list, keys) {
      var arr = D.calc[list] = D.calc[list] || [];
      var h = '<div class="mg-block"><h3>' + title + '</h3><div style="display:flex;flex-wrap:wrap;gap:12px 20px;padding:4px 0">';
      keys.forEach(function (k) {
        h += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">' +
             '<input type="checkbox" data-calc data-group="' + list + '" data-key="' + k + '"' + (arr.indexOf(k) >= 0 ? ' checked' : '') + '> ' + labels[k] + '</label>';
      });
      h += '</div></div>';
      return h;
    }
    var h = '<p class="mg-label" style="margin-bottom:10px;color:#666">自定义各指标的计算构成：勾选「计入」的项即可调整计算逻辑，保存后全局生效。</p>';
    h += group('实际开票价 = 指导价 −（勾选计入扣减）', 'priceDeduct', ['cash', 'replace', 'insurance', 'ecom', 'base', 'specialDisc']);
    h += group('毛利 = 开票价 − 成本 +（勾选计入）', 'grossAdd', ['replace', 'insurance', 'ecom', 'base', 'specialDisc', 'specialRebate']);
    h += group('单车毛利 = 开票价 − 成本 +（勾选计入）', 'unitProfitAdd', ['tier3', 'replace', 'insurance', 'ecom', 'base', 'specialDisc', 'specialRebate']);
    return h;
  }

  /* ---------- 生成输出 ---------- */
  function buildOutput() {
    var out = {
      vehicles: {}, carOrder: D.carOrder.slice(), jingpin: {},
      colors: {}, interiors: {}, maintain: {}, banks: D.banks.slice(), loan: {},
      globalColors: D.globalColors, globalJps: D.globalJps, globalInteriors: D.globalInteriors, globalMt: D.globalMt, dropdowns: D.dropdowns,
      calc: D.calc
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
    cfg.owner = cfg.owner || 'JJH980620';
    cfg.repo = cfg.repo || 'order-price-web';
    cfg.branch = cfg.branch || 'main';
    cfg.path = cfg.path || 'data.js';
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
      st.textContent = '网络错误，无法连接 GitHub（国内网络可能需代理/加速）'; st.className = 'status err';
    });
  }
  function saveToGithub() {
    var cfg = readCfg();
    if (!cfg.token) {
      switchTab('github');
      var st = $('saveStatus');
      st.textContent = '请先填写 TOKEN，再点击「保存到 GitHub」';
      st.className = 'status err';
      return;
    }
    saveCfg(cfg);
    var content = makeDataJs();
    var version = Date.now();
    var st = $('saveStatus');
    st.textContent = '正在写入 GitHub...'; st.className = 'status';
    var files = {};
    files[cfg.path] = content;
    files['data.version.json'] = JSON.stringify({ v: version });
    commitFiles(cfg, files)
      .then(function () {
        st.textContent = '已保存 ✓ 正在部署更新...'; st.className = 'status ok';
        pollDeploy(cfg, version);
      })
      .catch(function (e) {
        st.textContent = '保存失败：' + (e && e.message ? e.message : '网络错误（无法访问 GitHub，国内网络可能需代理/加速）');
        st.className = 'status err';
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
