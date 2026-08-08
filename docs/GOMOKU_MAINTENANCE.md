# 维护手册

## 架构

前端是无构建步骤的原生 HTML、CSS 和 JavaScript，托管于 GitHub Pages。

联机后端使用 Supabase：

- Auth：匿名登录，每台浏览器获得独立玩家身份
- Postgres：`public.gomoku_rooms` 保存房间与整局状态
- RPC：所有创建房间、加入、落子、悔棋和重新开局操作
- RLS：仅房间中的黑白双方可以读取房间
- Realtime：监听 `gomoku_rooms` 的更新并同步双方页面

浏览器使用的 Supabase URL 和 publishable key 位于 `gomoku/game.js` 顶部。Publishable key 可以公开；不要把 secret key 或 service role key放进仓库。

## 主要修改位置

| 需求 | 文件 |
| --- | --- |
| 修改标题、按钮、提示文案 | `gomoku/index.html`、`gomoku/game.js` |
| 修改配色、布局、手机适配 | `gomoku/style.css` |
| 修改棋盘绘制与本地玩法 | `gomoku/game.js` |
| 修改联机交互与 Realtime | `gomoku/game.js` |
| 修改服务端规则、权限或数据结构 | `supabase/gomoku.sql` |

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

不要在前端直接更新 `gomoku_rooms`。所有写入必须经过 RPC，确保服务端校验生效。

## 规则说明

- 黑方先行，先连成五子者胜。
- 联机悔棋只能由最后落子的一方申请。
- 对方同意后只撤回最后一步，并轮到该方重新落子。
- 对方拒绝后棋局保持不变。
- 一局结束后重新开始：
  - 有胜负时，失败者成为下一局黑方。
  - 和棋时交换黑白。
  - 未结束时重新开始，不交换黑白。

## 修改数据库

1. 修改 `supabase/gomoku.sql`。
2. 打开 Supabase 项目 `Gomoku` 的 SQL Editor。
3. 新建空白查询，粘贴并运行完整 SQL。
4. 确认结果为 `Success. No rows returned`。
5. 用两个不同匿名身份回归联机功能。

脚本设计为可重复执行。新增列时仍应使用 `add column if not exists`，修改函数时使用 `create or replace function`。

## 回归清单

每次修改后至少确认：

1. 大厅可进入本地双人，落子、悔棋和胜负正常。
2. 玩家 A 可创建房间，玩家 B 可用房间码或邀请链接加入。
3. 双方只能在自己的轮次落子，重复位置会被拒绝。
4. 玩家只能读取自己参与的房间。
5. 悔棋请求可拒绝；同意后只撤回最后一步。
6. 胜负实时同步；下一局失败者执黑。
7. 手机宽度下棋盘、按钮和悔棋申请面板可操作。
8. 浏览器控制台没有错误。

## 发布与缓存

推送 `master` 后 GitHub Pages 自动发布。若 CSS 或 JavaScript 修改后浏览器仍显示旧版本，可以给资源 URL 增加版本参数，例如：

```html
<link rel="stylesheet" href="./style.css?v=3">
<script src="./game.js?v=3"></script>
```

线上检查地址：https://samxlin.github.io/gomoku/

## 已知注意事项

- Supabase 免费项目长时间无访问可能暂停，恢复后联机功能才可用。
- 匿名登录已开启。公开访问量明显增加时，应考虑启用 CAPTCHA 和房间清理策略。
- 当前没有自动删除旧房间；需要时可增加定时清理任务。
- 当前“重新开始”任一玩家均可触发，不需要对方确认。

