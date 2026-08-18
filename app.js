/* ===== 订单价格申请 · 计算逻辑 ===== */
(function () {
  'use strict';
  var D = window.ORDER_DATA;
  var $ = function (id) { return document.getElementById(id); };

  var fmt = function (n) {
    if (typeof n === 'string') n = n.replace(/,/g, '');
    var x = Number(n);
    if (n === null || n === undefined || isNaN(x)) return '-';
    return x.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  var fmtIn = function (el) {
    var v = el && el.value;
    if (v === null || v === undefined || String(v).trim() === '') return '-';
    return fmt(v);
  };
  var num = function (el) {
    var v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  };
  var opt = function (v, t) {
    var o = document.createElement('option');
    o.value = v; o.textContent = t === undefined ? v : t;
    return o;
  };
  var setOptions = function (sel, arr, ph) {
    sel.innerHTML = '';
    if (ph) sel.appendChild(opt('', ph));
    (arr || []).forEach(function (v) {
      if (v) sel.appendChild(opt(v, v));
    });
  };
  var mkField = function (cls, tag, label) {
    var d = document.createElement('div');
    d.className = cls;
    var e = document.createElement(tag || 'input');
    if (tag !== 'select') e.type = 'number';
    if (label) {
      var sp = document.createElement('span');
      sp.className = 'mob-label';
      sp.textContent = label;
      d.appendChild(sp);
    }
    d.appendChild(e);
    return { box: d, el: e };
  };
  var makeCalc = function (label) {
    var d = document.createElement('div');
    d.className = 'calc-out';
    var sp = document.createElement('span');
    sp.className = 'mob-label';
    sp.textContent = label || '';
    d.appendChild(sp);
    return d;
  };

  /* ================= 创建动态行 ================= */
  function createLoanRow() {
    var row = document.createElement('div');
    row.className = 'dyn-row';
    row.style.gridTemplateColumns = '1.4fr .8fr 1fr 1fr 1fr 1fr 34px';
    var bank = mkField('field', 'select', '银行');
    setOptions(bank.el, D.banks.map(function (b) { return b.bank; }), '请选择');
    D.banks.forEach(function (b) {
      var o = bank.el.querySelector('option[value="' + b.bank + '"]');
      if (o) o.textContent = b.bank + '（' + (b.rate * 100).toFixed(3) + '%）';
    });
    var rate = mkField('field', null, '返息率'), amt = mkField('field', null, '贷款金额'), reb = mkField('field', null, '返佣');
    var ra = makeCalc('返息金额'), pf = makeCalc('毛利');
    row.appendChild(bank.box); row.appendChild(rate.box); row.appendChild(amt.box);
    row.appendChild(reb.box); row.appendChild(ra); row.appendChild(pf);
    bank.el.dataset.role = 'loan-bank';
    rate.el.dataset.role = 'loan-rate';
    amt.el.dataset.role = 'loan-amount';
    reb.el.dataset.role = 'loan-rebate';
    ra.dataset.role = 'loan-rebateamt';
    pf.dataset.role = 'loan-profit';
    bank.el.addEventListener('change', function () {
      var o = bank.el.selectedOptions[0];
      var b = D.banks.find(function (x) { return x.bank === o.value; });
      rate.el.value = b ? b.rate : 0;
      recalc();
    });
    [rate.el, amt.el, reb.el].forEach(function (e) { e.addEventListener('input', recalc); });
    return row;
  }

  function createJpRow() {
    var row = document.createElement('div');
    row.className = 'dyn-row';
    row.style.gridTemplateColumns = '1.4fr .9fr 1fr 1fr 34px';
    var name = mkField('field', 'select', '项目');
    var val = mkField('field', null, '产值');
    var cost = makeCalc('成本(自动)'), pf = makeCalc('毛利');
    row.appendChild(name.box); row.appendChild(val.box); row.appendChild(cost); row.appendChild(pf);
    name.el.dataset.role = 'jp-name';
    val.el.dataset.role = 'jp-value';
    cost.dataset.role = 'jp-cost';
    pf.dataset.role = 'jp-profit';
    name.el.addEventListener('change', recalc);
    val.el.addEventListener('input', recalc);
    return row;
  }

  function createOptRow() {
    var row = document.createElement('div');
    row.className = 'dyn-row';
    row.style.gridTemplateColumns = '1fr 1fr 1fr 34px';
    var v = mkField('field', null, '产值'), c = mkField('field', null, '成本');
    var pf = makeCalc('毛利');
    row.appendChild(v.box); row.appendChild(c.box); row.appendChild(pf);
    v.el.dataset.role = 'opt-value'; c.el.dataset.role = 'opt-cost'; pf.dataset.role = 'opt-profit';
    [v.el, c.el].forEach(function (e) { e.addEventListener('input', recalc); });
    return row;
  }

  function createMtRow() {
    var row = document.createElement('div');
    row.className = 'dyn-row';
    row.style.gridTemplateColumns = '.7fr 1fr .9fr 1fr 34px';
    var n = mkField('field', null, '次数'), v = mkField('field', null, '产值'), u = mkField('field', null, '单价成本');
    var pf = makeCalc('毛利');
    row.appendChild(n.box); row.appendChild(v.box); row.appendChild(u.box); row.appendChild(pf);
    n.el.dataset.role = 'mt-count'; v.el.dataset.role = 'mt-value';
    u.el.dataset.role = 'mt-ucost'; pf.dataset.role = 'mt-profit';
    [n.el, v.el, u.el].forEach(function (e) { e.addEventListener('input', recalc); });
    return row;
  }

  function createCouponRow() {
    var row = document.createElement('div');
    row.className = 'dyn-row';
    row.style.gridTemplateColumns = '1fr 1fr 1fr 34px';
    var v = mkField('field', null, '产值'), c = mkField('field', null, '成本');
    var pf = makeCalc('毛利');
    row.appendChild(v.box); row.appendChild(c.box); row.appendChild(pf);
    v.el.dataset.role = 'cp-value'; c.el.dataset.role = 'cp-cost'; pf.dataset.role = 'cp-profit';
    [v.el, c.el].forEach(function (e) { e.addEventListener('input', recalc); });
    return row;
  }

  function createInsRow() {
    var row = document.createElement('div');
    row.className = 'dyn-row';
    row.style.gridTemplateColumns = '1fr 1fr 34px';
    var b = mkField('field', null, '预估返佣');
    var pf = makeCalc('毛利');
    row.appendChild(b.box); row.appendChild(pf);
    b.el.dataset.role = 'ins-bonus'; pf.dataset.role = 'ins-profit';
    b.el.addEventListener('input', recalc);
    return row;
  }

  function createRegRow() {
    var row = document.createElement('div');
    row.className = 'dyn-row';
    row.style.gridTemplateColumns = '1fr 1fr 1fr 34px';
    var c = mkField('field', null, '收费'), k = mkField('field', null, '成本');
    var pf = makeCalc('毛利');
    row.appendChild(c.box); row.appendChild(k.box); row.appendChild(pf);
    c.el.dataset.role = 'reg-charge'; k.el.dataset.role = 'reg-cost'; pf.dataset.role = 'reg-profit';
    [c.el, k.el].forEach(function (e) { e.addEventListener('input', recalc); });
    return row;
  }

  /* ================= 行默认值 ================= */
  function applyCarDefaults(row, car) {
    if (row.querySelector('[data-role="mt-ucost"]') && D.maintain[car]) {
      row.querySelector('[data-role="mt-ucost"]').value = D.maintain[car].cost;
    }
    if (row.querySelector('[data-role="ins-bonus"]') && D.loan[car]) {
      row.querySelector('[data-role="ins-bonus"]').value = D.loan[car].insBonus;
    }
    if (row.querySelector('[data-role="jp-name"]')) {
      setOptions(row.querySelector('[data-role="jp-name"]'),
        (D.jingpin[car] || []).map(function (p) { return p.name; }), '选择项目');
    }
  }

  /* ================= 通用添加/删除 ================= */
  function attachDel(row, containerId) {
    var del = document.createElement('button');
    del.className = 'del';
    del.textContent = 'x';
    del.title = '删除';
    row.appendChild(del);
    del.addEventListener('click', function () {
      if (document.querySelectorAll('#' + containerId + ' .dyn-row').length <= 1) return;
      row.remove();
      recalc();
    });
  }

  function setupModule(containerId, addId, createFn, initial, defaults) {
    var box = $(containerId);
    box.innerHTML = '';
    for (var i = 0; i < initial; i++) {
      var row = createFn();
      attachDel(row, containerId);
      box.appendChild(row);
      defaults(row);
    }
    $(addId).addEventListener('click', function () {
      var row = createFn();
      attachDel(row, containerId);
      box.appendChild(row);
      defaults(row);
      recalc();
    });
  }

  /* ================= 初始化 ================= */
  function initDropdowns() {
    setOptions($('customerSource'), D.dropdowns['客户来源'] || [], '请选择');
    setOptions($('mortgage'), D.dropdowns['按揭'] || [], '请选择');
    setOptions($('vehicleSource'), D.dropdowns['车辆来源'] || [], '请选择');
  }
  function initCars() {
    setOptions($('car'), D.carOrder, '请选择车系');
  }
  function carDefaults(row) { applyCarDefaults(row, $('car').value); }

  function setupAll() {
    initCars();
    initDropdowns();
    setupModule('loanRows', 'addLoanBtn', createLoanRow, 1, function () {});
    setupModule('jingpinRows', 'addJpBtn', createJpRow, 1, carDefaults);
    setupModule('optRows', 'addOptBtn', createOptRow, 1, function () {});
    setupModule('mtRows', 'addMtBtn', createMtRow, 1, carDefaults);
    setupModule('couponRows', 'addCouponBtn', createCouponRow, 1, function () {});
    setupModule('insRows', 'addInsBtn', createInsRow, 1, carDefaults);
    setupModule('regRows', 'addRegBtn', createRegRow, 1, function (r) {
      if (r) {
        r.querySelector('[data-role="reg-charge"]').value = 220;
        r.querySelector('[data-role="reg-cost"]').value = 220;
      }
    });
  }

  /* ================= 车系联动 ================= */
  function onCarChange() {
    var car = $('car').value;
    var ms = $('model'), cs = $('color'), is_ = $('interior');
    if (!car) {
      setOptions(ms, [], '请先选择车系');
      setOptions(cs, [], '请先选择车系');
      setOptions(is_, [], '请先选择车系');
      $('colorHint').textContent = '';
      return;
    }
    setOptions(ms, D.vehicles[car].map(function (m) { return m.model; }), '请选择车型');
    setOptions(cs, (D.colors[car] || []).map(function (c) { return c.name; }), '请选择颜色');
    setOptions(is_, D.interiors[car] || [], '请选择内饰');
    document.querySelectorAll('#jingpinRows .dyn-row').forEach(function (r) {
      setOptions(r.querySelector('[data-role="jp-name"]'),
        (D.jingpin[car] || []).map(function (p) { return p.name; }), '选择项目');
    });
    if (D.maintain[car]) {
      document.querySelectorAll('#mtRows [data-role="mt-ucost"]').forEach(function (e) { e.value = D.maintain[car].cost; });
    }
    if (D.loan[car]) {
      document.querySelectorAll('#insRows [data-role="ins-bonus"]').forEach(function (e) { e.value = D.loan[car].insBonus; });
    }
    recalc();
  }

  /* ================= 核心计算 ================= */
  function recalc() {
    var car = $('car').value, model = $('model').value, color = $('color').value;
    var guide = 0, cost = 0, colorPremium = 0;
    if (car && model) {
      var mv = null;
      (D.vehicles[car] || []).forEach(function (m) { if (m.model === model) mv = m; });
      if (mv) { guide = mv.guide; cost = mv.cost; }
    }
    if (car && color) {
      if (D.globalColors && D.globalColors[color] !== undefined) {
        colorPremium = D.globalColors[color];
      } else {
        var cArr = D.colors[car] || [];
        for (var i = 0; i < cArr.length; i++) {
          if (cArr[i].name === color) { colorPremium = cArr[i].premium; break; }
        }
      }
    }
    guide = guide + colorPremium;
    $('colorHint').textContent = colorPremium > 0 ? '该颜色加价 ' + fmt(colorPremium) + ' 元' : '';

    var cashDiscount = num($('cashDiscount')), subsidyReplace = num($('subsidyReplace'));
    var subsidyInsurance = num($('subsidyInsurance')), subsidyEcom = num($('subsidyEcom'));
    var subsidyBase = num($('subsidyBase')), specialDiscount = num($('specialDiscount'));
    var specialRebate = num($('specialRebate'));

    var actualPrice = guide - (cashDiscount + subsidyReplace + subsidyInsurance + subsidyEcom + subsidyBase + specialDiscount);

    var loanProfit = 0;
    document.querySelectorAll('#loanRows .dyn-row').forEach(function (r) {
      var amt = num(r.querySelector('[data-role="loan-amount"]'));
      var rate = num(r.querySelector('[data-role="loan-rate"]'));
      var reb = num(r.querySelector('[data-role="loan-rebate"]'));
      var ra = amt * rate;
      var p = ra - reb;
      r.querySelector('[data-role="loan-rebateamt"]').textContent = fmt(ra);
      r.querySelector('[data-role="loan-profit"]').textContent = fmt(p);
      loanProfit += p;
    });
    var jpProfit = 0;
    document.querySelectorAll('#jingpinRows .dyn-row').forEach(function (r) {
      var sel = r.querySelector('[data-role="jp-name"]');
      var val = num(r.querySelector('[data-role="jp-value"]'));
      var cst = 0;
      if (car && sel.value) {
        (D.jingpin[car] || []).forEach(function (p) { if (p.name === sel.value) cst = p.buy; });
      }
      var p = val - cst;
      r.querySelector('[data-role="jp-cost"]').textContent = cst ? fmt(cst) : '-';
      r.querySelector('[data-role="jp-profit"]').textContent = fmt(p);
      jpProfit += p;
    });
    var optProfit = 0;
    document.querySelectorAll('#optRows .dyn-row').forEach(function (r) {
      var p = num(r.querySelector('[data-role="opt-value"]')) - num(r.querySelector('[data-role="opt-cost"]'));
      r.querySelector('[data-role="opt-profit"]').textContent = fmt(p);
      optProfit += p;
    });
    var mtProfit = 0;
    document.querySelectorAll('#mtRows .dyn-row').forEach(function (r) {
      var p = num(r.querySelector('[data-role="mt-value"]')) - num(r.querySelector('[data-role="mt-ucost"]')) * num(r.querySelector('[data-role="mt-count"]'));
      r.querySelector('[data-role="mt-profit"]').textContent = fmt(p);
      mtProfit += p;
    });
    var couponProfit = 0;
    document.querySelectorAll('#couponRows .dyn-row').forEach(function (r) {
      var p = num(r.querySelector('[data-role="cp-value"]')) - num(r.querySelector('[data-role="cp-cost"]'));
      r.querySelector('[data-role="cp-profit"]').textContent = fmt(p);
      couponProfit += p;
    });
    var insProfit = 0;
    document.querySelectorAll('#insRows .dyn-row').forEach(function (r) {
      var p = num(r.querySelector('[data-role="ins-bonus"]'));
      r.querySelector('[data-role="ins-profit"]').textContent = fmt(p);
      insProfit += p;
    });
    var regProfit = 0;
    document.querySelectorAll('#regRows .dyn-row').forEach(function (r) {
      var p = num(r.querySelector('[data-role="reg-charge"]')) - num(r.querySelector('[data-role="reg-cost"]'));
      r.querySelector('[data-role="reg-profit"]').textContent = fmt(p);
      regProfit += p;
    });

    var tier3 = loanProfit + jpProfit + optProfit + mtProfit + couponProfit + insProfit + regProfit;
    var gross = actualPrice - cost + (subsidyReplace + subsidyInsurance + subsidyEcom + subsidyBase + specialDiscount + specialRebate);
    var unitProfit = actualPrice - cost + (tier3 + subsidyReplace + subsidyInsurance + subsidyEcom + subsidyBase + specialDiscount);
    var unitMargin = actualPrice !== 0 ? (unitProfit / actualPrice) : 0;
    var total = gross + tier3;
    var limit = (car && D.loan[car]) ? D.loan[car].limit : 0;
    var over = total - limit;

    $('guidePrice').textContent = guide ? fmt(guide) : '-';
    $('costPrice').textContent = cost ? fmt(cost) : '-';
    $('actualPrice').textContent = fmt(actualPrice);
    $('unitProfit').textContent = fmt(unitProfit);
    $('unitMargin').textContent = actualPrice ? (unitMargin * 100).toFixed(2) + '%' : '-';

    $('sumTier3').textContent = fmt(tier3);
    $('sumGross').textContent = fmt(gross);
    $('sumTotal').textContent = fmt(total);
    $('sumLimit').textContent = limit ? fmt(limit) : '-';
    $('sumAchieve').textContent = fmt(total);
    var overEl = $('sumOver');
    if (limit === 0) { overEl.className = 'summary-item'; $('sumOverV').textContent = '-'; }
    else if (over > 0) { overEl.className = 'summary-item warn'; $('sumOverV').textContent = '超限 +' + fmt(over); }
    else { overEl.className = 'summary-item ok'; $('sumOverV').textContent = '未超限'; }
  }

  /* ================= 导出/打印模板（共用美观版式，接近页面） ================= */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function kv(k, v) {
    return '<div class="ex-i"><span class="ex-k">' + k + '</span><span class="ex-v">' + (v === '' ? '-' : esc(v)) + '</span></div>';
  }
  function gatherModule(sel, label, cols) {
    var rows = document.querySelectorAll(sel + ' .dyn-row');
    var visible = [];
    rows.forEach(function (r) {
      var cells = [], has = false;
      cols.forEach(function (c) {
        var el = r.querySelector('[data-role="' + c.role + '"]');
        var t;
        if (c.calc) {
          t = el.textContent;
        } else {
          t = (el && el.value != null) ? String(el.value) : '';
        }
        if (!c.calc && t !== '') has = true;
        cells.push(c.calc ? (t === '-' ? '-' : t) : (t || '-'));
      });
      if (has) visible.push(cells);
    });
    if (!visible.length) return '';
    var h = '<div class="ex-mb"><div class="ex-mt">' + label + '</div><table class="ex-tbl"><tr>';
    cols.forEach(function (c) { h += '<th>' + c.head + '</th>'; });
    h += '</tr>';
    visible.forEach(function (cells) {
      h += '<tr>';
      cells.forEach(function (c) { h += '<td>' + c + '</td>'; });
      h += '</tr>';
    });
    h += '</table></div>';
    return h;
  }

  function buildExport() {
    var date = today();
    var h = '<div class="ex-wrap">';
    h += '<div class="ex-head"><div class="ex-brand"><span class="ex-dot"></span>嘉兴方程豹 · 订单价格申请单</div><div class="ex-date">' + date + '</div></div>';
    h += '<div class="ex-summary">';
    h += '<div class="ex-s"><span class="ex-sk">三级毛利</span><span class="ex-sv">' + fmt($('sumTier3').textContent) + '</span></div>';
    h += '<div class="ex-s"><span class="ex-sk">毛利</span><span class="ex-sv">' + fmt($('sumGross').textContent) + '</span></div>';
    h += '<div class="ex-s"><span class="ex-sk">整车毛利</span><span class="ex-sv">' + fmt($('sumTotal').textContent) + '</span></div>';
    h += '<div class="ex-s"><span class="ex-sk">限价</span><span class="ex-sv">' + fmt($('sumLimit').textContent) + '</span></div>';
    h += '<div class="ex-s"><span class="ex-sk">毛利达成</span><span class="ex-sv">' + fmt($('sumAchieve').textContent) + '</span></div>';
    h += '<div class="ex-s"><span class="ex-sk">是否超限价</span><span class="ex-sv">' + esc($('sumOverV').textContent) + '</span></div>';
    h += '</div>';
    h += '<div class="ex-sec">订单信息</div><div class="ex-grid">';
    h += kv('订单名称', $('orderName').value);
    h += kv('订单时间', $('orderDate').value);
    h += kv('客户来源', $('customerSource').value);
    h += kv('车系 / 车型', ($('car').value || '') + ' / ' + ($('model').value || ''));
    h += kv('颜色 / 内饰', ($('color').value || '') + ' / ' + ($('interior').value || ''));
    h += kv('按揭', $('mortgage').value);
    h += kv('手机号码', $('phone').value);
    h += kv('交车时间', $('delivery').value);
    h += kv('销售顾问', $('salesman').value);
    h += kv('车辆来源', $('vehicleSource').value);
    h += '</div>';
    h += '<div class="ex-sec">价格与毛利</div><div class="ex-price">';
    h += '<div class="ex-p"><span class="ex-pk">厂方指导价<br>（含颜色加价）</span><span class="ex-pv">' + fmt($('guidePrice').textContent) + '</span></div>';
    h += '<div class="ex-p"><span class="ex-pk">成本价</span><span class="ex-pv">' + fmt($('costPrice').textContent) + '</span></div>';
    h += '<div class="ex-p ex-hl"><span class="ex-pk">实际开票价</span><span class="ex-pv">' + fmt($('actualPrice').textContent) + '</span></div>';
    h += '<div class="ex-p ex-hl"><span class="ex-pk">单车毛利</span><span class="ex-pv">' + fmt($('unitProfit').textContent) + '</span></div>';
    h += '<div class="ex-p"><span class="ex-pk">单车毛利率</span><span class="ex-pv">' + esc($('unitMargin').textContent) + '</span></div>';
    h += '</div>';
    h += '<div class="ex-grid">';
    h += kv('现金优惠', fmtIn($('cashDiscount')));
    h += kv('置换补贴', fmtIn($('subsidyReplace')));
    h += kv('保险补贴', fmtIn($('subsidyInsurance')));
    h += kv('电商补贴', fmtIn($('subsidyEcom')));
    h += kv('基地补贴', fmtIn($('subsidyBase')));
    h += kv('特殊折让', fmtIn($('specialDiscount')));
    h += kv('特殊车型折让 / 返利', fmtIn($('specialRebate')));
    h += '</div>';
    h += '<div class="ex-sec">三级毛利构成</div><div class="ex-tier3">';
    h += gatherModule('#loanRows', '贷款', [{ role: 'loan-bank', head: '银行' }, { role: 'loan-rate', head: '返息率' }, { role: 'loan-amount', head: '贷款金额' }, { role: 'loan-rebate', head: '返佣' }, { role: 'loan-rebateamt', head: '返息金额', calc: 1 }, { role: 'loan-profit', head: '毛利', calc: 1 }]);
    h += gatherModule('#jingpinRows', '精品', [{ role: 'jp-name', head: '项目' }, { role: 'jp-value', head: '产值' }, { role: 'jp-cost', head: '成本', calc: 1 }, { role: 'jp-profit', head: '毛利', calc: 1 }]);
    h += gatherModule('#optRows', '选装', [{ role: 'opt-value', head: '产值' }, { role: 'opt-cost', head: '成本' }, { role: 'opt-profit', head: '毛利', calc: 1 }]);
    h += gatherModule('#mtRows', '保养', [{ role: 'mt-count', head: '次数' }, { role: 'mt-value', head: '产值' }, { role: 'mt-ucost', head: '单价成本' }, { role: 'mt-profit', head: '毛利', calc: 1 }]);
    h += gatherModule('#couponRows', '卡券', [{ role: 'cp-value', head: '产值' }, { role: 'cp-cost', head: '成本' }, { role: 'cp-profit', head: '毛利', calc: 1 }]);
    h += gatherModule('#insRows', '保险', [{ role: 'ins-bonus', head: '预估返佣' }, { role: 'ins-profit', head: '毛利', calc: 1 }]);
    h += gatherModule('#regRows', '上牌', [{ role: 'reg-charge', head: '收费' }, { role: 'reg-cost', head: '成本' }, { role: 'reg-profit', head: '毛利', calc: 1 }]);
    h += '</div>';
    h += '</div>';
    $('exportArea').innerHTML = h;
  }

  function buildPrint() {
    buildExport();
    $('printArea').innerHTML = $('exportArea').innerHTML;
  }

  /* ================= 导出图片（预览 + 确认导出） ================= */
  var pendingDataUrl = null;
  function showModal(on) {
    $('previewModal').style.display = on ? 'flex' : 'none';
  }
  function exportImage() {
    if (typeof html2canvas === 'undefined') {
      alert('图片导出组件加载失败，请检查网络后重试');
      return;
    }
    buildExport();
    var el = $('exportArea');
    html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false }).then(function (canvas) {
      pendingDataUrl = canvas.toDataURL('image/png');
      $('previewImg').src = pendingDataUrl;
      showModal(true);
    }).catch(function () {
      alert('导出失败，请重试');
    });
  }
  function confirmExport() {
    if (!pendingDataUrl) return;
    var a = document.createElement('a');
    a.download = '订单价格申请单_' + new Date().getTime() + '.png';
    a.href = pendingDataUrl;
    a.click();
    showModal(false);
  }

  /* ================= 事件 ================= */
  function bindStatic() {
    ['car', 'model', 'color', 'interior',
     'cashDiscount', 'subsidyReplace', 'subsidyInsurance', 'subsidyEcom', 'subsidyBase',
     'specialDiscount', 'specialRebate'].forEach(function (id) {
      var el = $(id);
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', recalc);
    });
    $('car').addEventListener('change', onCarChange);
    $('resetBtn').addEventListener('click', function () {
      if (confirm('确定要清空所有已填内容吗？')) location.reload();
    });
    $('adminBtn').addEventListener('click', function () { location.href = 'admin.html'; });
    $('imgBtn').addEventListener('click', exportImage);
    $('printBtn').addEventListener('click', function () { buildPrint(); window.print(); });
    $('previewClose').addEventListener('click', function () { showModal(false); });
    $('previewCancel').addEventListener('click', function () { showModal(false); });
    $('previewConfirm').addEventListener('click', confirmExport);
    $('previewModal').addEventListener('click', function (e) { if (e.target === this) showModal(false); });
  }

  /* ================= 启动 ================= */
  setupAll();
  bindStatic();
  recalc();
})();
