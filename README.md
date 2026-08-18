# 嘉兴方程豹 · 订单价格申请

纯前端订单价格测算工具：把 Excel 里的「订单价格申请表」做成网页，车系、车型、颜色、内饰、贷款银行均为联动下拉，实时自动计算指导价、开票价、各级毛利与超限判断。手机和电脑均可访问，每个访问者独立会话、不保存任何数据，只做计算。

附带**数据管理模块**：登录后可在网页上增删改车系、车型、精品、颜色、内饰、银行、保养、限价等数据，改完一键写回 GitHub 仓库，所有访问者全局生效。

## 数据来源

数据由 `extract.py` 从《订单价格申请表6.4.xlsx》自动提取生成 `data.js`，包含：

- 1月政策一览表：车系 × 车型 → 指导价 / 成本价
- 装潢保养价格表：各车系精品采购价、保养成本、车身颜色、内饰
- 贷款-保险：各车系限价、保险返佣、各银行返息率

## 本地运行

纯静态网页，无需安装依赖，任选一种方式：

```bash
# 方式一：Python 内置服务器
python -m http.server 8080

# 方式二：Node
npx serve .
```

浏览器打开 `http://localhost:8080` 即可。也可直接双击 `index.html` 使用（除打印外功能均可用）。

> 提示：直接双击打开时浏览器可能限制本地脚本，若下拉不生效请改用本地服务器方式。

## 功能

**报价页（index.html）**
- 车系 → 车型二级联动；颜色、内饰、精品、银行自动带出
- 实时计算：指导价（含颜色加价）、成本价、实际开票价、单车毛利/毛利率、三级毛利、毛利、整车毛利、限价、是否超限价
- 三级毛利构成：贷款、精品、选装、保养、卡券、保险、上牌**均可动态添加/删除多行**
- 打印 / 导出报价单

**数据管理（admin.html）**
- 登录密码：`980620`（进入页面输入，登录后本浏览器记住）
- 可增删改：车系 / 车型（指导价、成本价）、精品（名称、采购价）、颜色与颜色加价、内饰、保养价格、贷款银行返息率、车系限价与保险返佣
- 保存：把修改后的数据写回 GitHub 仓库的 `data.js`，全站生效

> 安全提示：密码为前端校验，保存在页面代码中可被查看，适用于内部工具，不适用于强安全场景。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（如 `order-price-web`）
2. 将本目录下 `index.html`、`style.css`、`app.js`、`admin.html`、`admin.js`、`data.js` 推送到仓库：
   ```bash
   git init
   git add index.html style.css app.js admin.html admin.js data.js
   git commit -m "订单价格申请"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/order-price-web.git
   git push -u origin main
   ```
3. 进入仓库 `Settings` → `Pages` → `Branch` 选择 `main`，保存
4. 等待 1-2 分钟，即可通过 `https://<你的用户名>.github.io/order-price-web/` 访问

### 配置数据保存（GitHub 令牌）

在管理页「GitHub 配置」Tab 填写：

- **owner**：你的 GitHub 用户名
- **repo**：仓库名（如 `order-price-web`）
- **branch**：`main`
- **TOKEN**：一个具有 `repo` 权限的 Personal Access Token（[创建入口](https://github.com/settings/tokens)）

TOKEN 只保存在当前浏览器的 localStorage，不会写入代码仓库。填写后可点「测试连接」验证，之后每次「保存到 GitHub」会把改后的数据写回 `data.js`，GitHub Pages 约 1-2 分钟后更新，全站生效。

## 目录结构

```
├── index.html    # 报价页面
├── admin.html    # 数据管理页面
├── style.css     # 样式（响应式，适配手机/电脑）
├── app.js        # 报价页联动与计算逻辑
├── admin.js      # 管理页编辑与 GitHub 保存逻辑
├── data.js       # 内置数据源（自动生成，可被管理页在线更新）
└── extract.py    # 从 Excel 提取数据的脚本（初始导入用）
```

## 修改价格数据

两种方式：
1. **在线**：进入 `admin.html`，密码 `980620`，修改后「保存到 GitHub」
2. **离线**：用新 Excel 覆盖《订单价格申请表6.4.xlsx》→ 运行 `python extract.py` → 重新部署 `data.js`

## 技术栈

原生 HTML + CSS + JavaScript，零依赖，适配移动端与桌面端。
