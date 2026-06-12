# Gomoku

部署在个人 GitHub Pages 上的五子棋小游戏，支持本地双人和 Supabase 实时联机。

- 线上地址：https://samxlin.github.io/gomoku/
- GitHub 仓库：https://github.com/Samxlin/Samxlin.github.io
- Supabase 项目：`Gomoku`（project ref：`qemejzzxmjohrfdxfftv`）
- 部署分支：`master`

## 快速开始

```powershell
cd D:\Gomoku
python -m http.server 8765 --bind 127.0.0.1
```

打开：http://127.0.0.1:8765/gomoku/

项目没有构建步骤，修改静态文件后刷新浏览器即可。

## 目录

```text
gomoku/
  index.html       页面结构和文案
  style.css        页面样式与手机端适配
  game.js          棋盘、本地模式、Supabase 联机逻辑
supabase/
  gomoku.sql       数据表、RLS、Realtime 和 RPC 函数
docs/
  MAINTENANCE.md   架构、规则、数据库更新和测试说明
```

仓库根目录的其他文件是原有个人博客，不要为了修改小游戏而改动它们。

## 当前功能

- 15 × 15 五子棋棋盘
- 本地双人轮流落子
- 创建和加入六位房间码
- 邀请链接与实时同步
- 服务端校验轮次、占位和胜负
- 联机悔棋：刚落子的一方申请，对方同意后仅撤回最后一步
- 下一局由上一局失败者执黑；和棋时交换黑白
- 手机端触摸操作与响应式布局

## 发布

提交并推送 `master` 后，GitHub Pages 会自动更新：

```powershell
git add gomoku supabase docs README.md .gitignore
git commit -m "Describe change"
git push origin master
```

通常需要等待约 30 至 90 秒。详细维护流程见 [docs/MAINTENANCE.md](docs/MAINTENANCE.md)。

