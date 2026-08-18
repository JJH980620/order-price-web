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

  /* ================= 打印 ================= */
  function buildPrint() {
    var h = '<h1 style="text-align:center;font-size:22px;margin:0 0 4px">嘉兴方程豹 · 订单价格申请单</h1>';
    h += '<p style="text-align:center;color:#555;margin:0 0 18px">' + new Date().toLocaleDateString('zh-CN') + '</p>';
    function row(k, v) {
      return '<tr><td style="padding:7px 12px;border:1px solid #ccc;background:#f4f4f4;width:140px">' + k + '</td>' +
        '<td style="padding:7px 12px;border:1px solid #ccc;text-align:right">' + v + '</td></tr>';
    }
    var t = '<table style="width:100%;border-collapse:collapse;font-size:14px">';
    t += row('订单名称', $('orderName').value || '-');
    t += row('订单时间', $('orderDate').value || '-');
    t += row('客户来源', $('customerSource').value || '-');
    t += row('车系', $('car').value || '-');
    t += row('配置 / 车型', $('model').value || '-');
    t += row('颜色', $('color').value || '-');
    t += row('内饰', $('interior').value || '-');
    t += row('按揭', $('mortgage').value || '-');
    t += row('手机号码', $('phone').value || '-');
    t += row('交车时间', $('delivery').value || '-');
    t += row('销售顾问', $('salesman').value || '-');
    t += row('车辆来源', $('vehicleSource').value || '-');
    t += row('厂方指导价', fmt($('guidePrice').textContent));
    t += row('成本价', fmt($('costPrice').textContent));
    t += row('现金优惠', fmt($('cashDiscount').value));
    t += row('置换补贴', fmt($('subsidyReplace').value));
    t += row('保险补贴', fmt($('subsidyInsurance').value));
    t += row('电商补贴', fmt($('subsidyEcom').value));
    t += row('基地补贴', fmt($('subsidyBase').value));
    t += row('特殊折让', fmt($('specialDiscount').value));
    t += row('实际开票价', fmt($('actualPrice').textContent));
    t += row('单车毛利', fmt($('unitProfit').textContent));
    t += row('单车毛利率', $('unitMargin').textContent);
    t += row('三级毛利', fmt($('sumTier3').textContent));
    t += row('毛利', fmt($('sumGross').textContent));
    t += row('整车毛利', fmt($('sumTotal').textContent));
    t += row('限价', fmt($('sumLimit').textContent));
    t += row('是否超限价', $('sumOverV').textContent);
    t += '</table>';
    $('printArea').innerHTML = h + t;
  }

  /* ================= 导出图片（固定版式，手机/电脑一致） ================= */
  function esc(s) {
    return String(s == null ? '-' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function exRow(k, v, muted) {
    return '<tr><td class="k">' + k + '</td><td class="v' + (muted ? ' ex-muted' : '') + '">' + v + '</td></tr>';
  }
  function buildExport() {
    $('exDate').textContent = '日期：' + new Date().toLocaleDateString('zh-CN');
    var h = '';
    h += '<div class="ex-sec">订单信息</div><table class="ex-table">';
    h += exRow('订单名称', esc($('orderName').value));
    h += exRow('订单时间', esc($('orderDate').value));
    h += exRow('客户来源', esc($('customerSource').value));
    h += exRow('车系 / 车型', esc($('car').value) + ' / ' + esc($('model').value));
    h += exRow('颜色 / 内饰', esc($('color').value) + ' / ' + esc($('interior').value));
    h += exRow('按揭', esc($('mortgage').value));
    h += exRow('手机号码', esc($('phone').value));
    h += exRow('交车时间', esc($('delivery').value));
    h += exRow('销售顾问', esc($('salesman').value));
    h += exRow('车辆来源', esc($('vehicleSource').value));
    h += '</table>';
    h += '<div class="ex-sec">价格与毛利</div><table class="ex-table">';
    h += exRow('厂方指导价（含颜色加价）', fmt($('guidePrice').textContent));
    h += exRow('成本价', fmt($('costPrice').textContent));
    h += exRow('现金优惠', fmt($('cashDiscount').value));
    h += exRow('置换补贴', fmt($('subsidyReplace').value));
    h += exRow('保险补贴', fmt($('subsidyInsurance').value));
    h += exRow('电商补贴', fmt($('subsidyEcom').value));
    h += exRow('基地补贴', fmt($('subsidyBase').value));
    h += exRow('特殊折让', fmt($('specialDiscount').value));
    h += exRow('实际开票价', fmt($('actualPrice').textContent));
    h += exRow('单车毛利', fmt($('unitProfit').textContent));
    h += exRow('单车毛利率', $('unitMargin').textContent);
    h += '</table>';
    h += '<div class="ex-sec">汇总</div><table class="ex-table">';
    h += exRow('三级毛利', fmt($('sumTier3').textContent));
    h += exRow('毛利', fmt($('sumGross').textContent));
    h += exRow('整车毛利', fmt($('sumTotal').textContent));
    h += exRow('限价', fmt($('sumLimit').textContent));
    h += exRow('毛利达成', fmt($('sumAchieve').textContent));
    h += exRow('是否超限价', $('sumOverV').textContent);
    h += '</table>';
    $('exportArea').innerHTML = $('exportArea').querySelector('.ex-title').outerHTML + '<div class="ex-sub" id="exDate2"></div>' + h;
    $('exDate2').textContent = '日期：' + new Date().toLocaleDateString('zh-CN');
  }
  function exportImage() {
    if (typeof html2canvas === 'undefined') {
      alert('图片导出组件加载失败，请检查网络后重试');
      return;
    }
    buildExport();
    var el = $('exportArea');
    html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false }).then(function (canvas) {
      var link = document.createElement('a');
      link.download = '订单价格申请单_' + new Date().getTime() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(function () {
      alert('导出失败，请重试');
    });
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
  }

  /* ================= 启动 ================= */
  setupAll();
  bindStatic();
  recalc();
})();
