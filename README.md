# Sun Chun 作品集

Cloudflare Pages + Functions + KV + R2 架构。
- 前台：`/`
- 后台：`/admin`（密码 `sunchun`）

## 一、本地开发

```bash
cd sun-chun-portfolio
npm install
npx wrangler login        # 第一次用需要登录 Cloudflare 账号
npm run dev
```

默认打开 `http://localhost:8788`。后台路径 `http://localhost:8788/admin`。

本地模式 KV / R2 会用 wrangler 的本地模拟目录 `.wrangler/state`，不会动真实数据。

---

## 二、部署到 Cloudflare Pages（一次性配置）

### 1. 注册并安装 wrangler
- Cloudflare 账号：https://dash.cloudflare.com/sign-up （免费）
- 本地已经在 `devDependencies` 里了，`npm install` 后直接用 `npx wrangler`

### 2. 创建 KV namespace
```bash
npx wrangler kv namespace create DATA
```
命令会输出一段 `id = "xxxxxxxx..."`，**把这段 id 复制到 `wrangler.toml` 里**
替换掉 `REPLACE_WITH_YOUR_KV_ID`。

### 3. 创建 R2 bucket
```bash
npx wrangler r2 bucket create sun-chun-images
```
bucket 名称必须和 `wrangler.toml` 里的 `bucket_name` 一致。

### 4. 初始化 Pages 项目
把整个文件夹推到一个 GitHub 仓库（空仓库即可），然后：

1. 打开 https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. 选刚建的仓库，配置：
   - **Build command**: 留空
   - **Build output directory**: `public`
   - **Root directory**: `/`
3. 点 **Save and Deploy**，第一次会失败（因为还没绑定 KV/R2 和密钥），没关系

### 5. 绑定 KV / R2 / 环境变量
进入刚创建的 Pages 项目 → **Settings** → **Functions**：

**KV namespace bindings**
- Variable name: `DATA`
- KV namespace: 选第 2 步创建的那个

**R2 bucket bindings**
- Variable name: `IMAGES`
- R2 bucket: `sun-chun-images`

**Environment variables** → **Production** → **Encrypt**（务必加密）
- `ADMIN_PASSWORD` = `sunchun`（或你想改的密码）
- `SESSION_SECRET` = 随便生成一串长字符串（32位以上随机字符），用于签名登录 cookie

### 6. 重新部署
回到 **Deployments** → 点最后一次部署的 **Retry deployment**。
几十秒后就能访问 `https://your-project.pages.dev`。

### 7. 绑定 GoDaddy 域名
1. Pages 项目 → **Custom domains** → **Set up a custom domain** → 输入你的域名（如 `sunchun.com`）
2. Cloudflare 会给出一条 CNAME 记录（类似 `sun-chun-portfolio.pages.dev`）
3. 登录 GoDaddy → **My Products** → 域名 → **DNS** → **Add**
   - Type: `CNAME`
   - Name: `@`（根域）或 `www`
   - Value: Cloudflare 给的 CNAME 目标
   - TTL: 1 Hour
4. 根域名不支持 CNAME 的话，把 `www` 加 CNAME，再加一条 `@` 的 A 记录指向 `192.0.2.1` 让 Cloudflare 代理（Pages 会给具体值）
5. 等 5-10 分钟 DNS 生效，Cloudflare 会自动签 HTTPS 证书

---

## 三、日常使用

- 打开 `https://你的域名/admin`
- 输入密码 `sunchun`
- 增减项目、拖拽排序、批量上传图片、编辑 info 文字
- 点右上角「保存修改」写入 KV
- 前台刷新即可看到

## 四、改密码

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name sun-chun-portfolio
```
按提示输入新密码，然后在 Pages 控制台 **Retry deployment** 让它生效。

## 五、目录结构

```
public/            # 静态文件（前台 + 后台 HTML/CSS/JS/字体）
functions/api/     # serverless 接口
  login.js         # 登录
  logout.js
  me.js            # 检查登录状态
  projects.js      # 读/写数据
  upload.js        # 上传图片到 R2
  image/[key].js   # 读取 R2 图片
functions/_shared.js  # cookie 签名 / 数据读写
wrangler.toml      # Cloudflare 配置
```

## 常见问题

**Q: 上传图片 500 错误**
A: R2 binding 没配好。去 Pages Settings → Functions → R2 bucket bindings 检查。

**Q: 本地 `npm run dev` 起不来**
A: 先 `npx wrangler login` 登录一次。

**Q: KV 数据没了**
A: 本地开发的数据在 `.wrangler/state/` 里，和生产完全隔离。生产数据在 Cloudflare 控制台 → Workers & Pages → KV → 可以直接看 key `site` 的内容。
