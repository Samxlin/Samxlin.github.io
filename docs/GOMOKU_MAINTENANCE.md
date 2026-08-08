# Gomoku 维护手册

线上地址：[https://samxlin.github.io/gomoku/](https://samxlin.github.io/gomoku/)

## 架构与部署边界

Gomoku 是一个无需单独构建的原生 HTML、CSS 和 JavaScript 应用：

- `public/gomoku/index.html`：页面结构与文案
- `public/gomoku/style.css`：配色、布局和移动端适配
- `public/gomoku/game.js`：棋盘、本地玩法和 Supabase 联机逻辑
- `tools/supabase/gomoku.sql`：数据表、RLS、Realtime 和 RPC 的维护脚本

Astro 构建时会把 `public/gomoku/` 原样复制到 `dist/gomoku/`，因此生产路径保持 `/gomoku/`。`tools/` 不属于 Astro 的公开目录，SQL 文件不会出现在 Pages 构建产物中；不要把它移回 `public/`。

联机后端使用 Supabase：

- Auth：匿名登录，每台浏览器获得独立玩家身份
- Postgres：`public.gomoku_rooms` 保存房间与整局状态
- RPC：处理创建房间、加入、落子、悔棋和重新开局
- RLS：限制房间读取权限为参与该房间的黑白双方
- Realtime：监听 `gomoku_rooms` 更新并同步双方页面

浏览器所需的 Supabase URL 和 publishable key 位于 `public/gomoku/game.js` 顶部。Publishable key 本来就是客户端可见信息，但 secret key、service role key、数据库密码和管理令牌绝不能进入仓库。

## 本地运行

在仓库根目录安装依赖并启动 Astro：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

打开开发服务器打印的本地地址并访问 `/gomoku/`。修改 `public/gomoku/` 中的静态文件后刷新页面即可，不需要为游戏增加独立打包器。

生产构建检查：

```powershell
pnpm check
pnpm build
pnpm preview
```

预览服务器启动后再次访问 `/gomoku/`，确认测试的是 `dist/` 中实际会部署的副本。

## 主要修改位置

| 需求 | 文件 |
| --- | --- |
| 修改标题、按钮、提示文案 | `public/gomoku/index.html`、`public/gomoku/game.js` |
| 修改配色、布局、手机适配 | `public/gomoku/style.css` |
| 修改棋盘绘制与本地玩法 | `public/gomoku/game.js` |
| 修改联机交互与 Realtime | `public/gomoku/game.js` |
| 修改服务端规则、权限或数据结构 | `tools/supabase/gomoku.sql` |

游戏文件使用相对资源地址 `./style.css` 和 `./game.js`，以便在 `/gomoku/` 子路径下工作。不要改成站点根路径。

## 联机数据模型

`gomoku_rooms` 的关键字段：

- `code`：六位房间码
- `black_id` / `white_id`：玩家的匿名 Auth UUID
- `moves`：按顺序保存的 `{ row, col, player }` JSON 数组
- `turn`：当前轮次，`1` 为黑方，`2` 为白方
- `winner`：`0` 未结束、`1` 黑胜、`2` 白胜、`3` 和棋
- `undo_requested_by`：待处理悔棋申请的玩家 UUID
- `round`：房间内局数

关键 RPC：

- `create_gomoku_room()`
- `join_gomoku_room(p_code)`
- `play_gomoku_move(p_room_id, p_row, p_col)`
- `request_gomoku_undo(p_room_id)`
- `respond_gomoku_undo(p_room_id, p_accept)`
- `restart_gomoku_room(p_room_id)`

不要在前端直接更新 `gomoku_rooms`。所有写入必须经过 RPC，确保服务端轮次、落点和身份校验生效。

## 规则说明

- 黑方先行，先连成五子者胜。
- 联机悔棋只能由最后落子的一方申请。
- 对方同意后只撤回最后一步，并轮到该方重新落子。
- 对方拒绝后棋局保持不变。
- 一局结束后重新开始：有胜负时失败者成为下一局黑方；和棋时交换黑白；未结束时重新开始不交换黑白。

## 修改数据库

1. 修改 `tools/supabase/gomoku.sql`。
2. 打开 Supabase 项目 `Gomoku` 的 SQL Editor。
3. 新建空白查询，粘贴并运行完整 SQL。
4. 检查执行结果和 Supabase 日志，不要只根据前端表现判断迁移成功。
5. 使用两个不同的匿名身份完整回归联机功能。

脚本设计为可重复执行。新增列仍应使用 `add column if not exists`，修改函数应使用 `create or replace function`。执行 SQL 会直接改变外部生产数据和权限；先复核目标项目、SQL diff 与回滚方案，切勿在不确定的项目中试跑。

## 回归清单

每次修改后至少确认：

1. 大厅正常加载，CSS 和 JavaScript 请求成功。
2. 本地双人可轮流落子，悔棋和胜负判断正常。
3. 玩家 A 可创建房间，玩家 B 可用房间码或邀请链接加入。
4. 双方只能在自己的轮次落子，重复位置会被拒绝。
5. 玩家只能读取自己参与的房间。
6. 悔棋请求可拒绝；同意后只撤回最后一步。
7. 胜负实时同步；下一局失败者执黑。
8. 手机宽度下棋盘、按钮和悔棋申请面板可操作。
9. 浏览器控制台没有关键错误，Supabase 与 Realtime 请求没有异常失败。
10. `pnpm build` 后 `dist/gomoku/` 包含 `index.html`、`style.css` 和 `game.js`。

## 发布与缓存

推送 `master` 会触发 `.github/workflows/deploy.yml`。工作流成功后，检查线上 `/gomoku/`；不要单独上传游戏文件，也不要提交 `dist/`。

若 CSS 或 JavaScript 更新后仍显示旧版本，可在 `public/gomoku/index.html` 中递增资源查询参数，例如：

```html
<link rel="stylesheet" href="./style.css?v=3">
<script src="./game.js?v=3"></script>
```

## 外部依赖与已知风险

- 联机功能依赖外部 Supabase 项目、匿名 Auth、Postgres、RPC 与 Realtime；项目暂停、配额、策略或网络问题不会影响本地双人，但会使联机不可用。
- Supabase 浏览器客户端当前从 jsDelivr 加载。CDN 不可用、网络拦截或 `@2` 浮动版本行为变化都可能阻止联机初始化。后续可考虑固定经过验证的精确版本或将客户端文件纳入受控构建。
- Publishable key 可公开不代表数据库默认安全；RLS 与 RPC 权限必须继续作为真正的安全边界。
- 当前没有自动删除旧房间；公开访问量增加时应考虑房间清理、速率限制和 CAPTCHA。
- 当前“重新开始”任一玩家均可触发，不需要对方确认。
- SQL 已从公开站点移到 `tools/supabase/`，但仍受 Git 历史和仓库可见性影响；它不是秘密存储位置，任何凭据都不能写入其中。
