# Technical

## 1. 技术栈

- React 18 + TypeScript + Vite + Less，`base: './'`。
- React DOM、CSS mask 与位图唇印负责画面；无持续 Canvas/WebGL 主循环。
- AlterU 平台能力：UUID 存档、公共存档聚合、用户资料、事件通知、LLM 墓志铭和独立媒体服务。
- 永久游戏 UUID：`7a5b620c-b394-4a66-a55a-4739370d3783`。

## 2. 目录结构

- `src/KissWall/KissWall.tsx`：stele、wall、detail 三屏路由及主 HUD。
- `src/KissWall/hooks/useKissWall.ts`：吻会话、媒体/墓志铭并发、自动绽开、保存与 kiss-back 通知。
- `src/KissWall/hooks/useWall.ts`：聚合公共作品、点赞和留言。
- `src/KissWall/components/DarkCanvas.tsx`：触碰坐标、暗幕遮罩、唇印和揭晓。
- `src/KissWall/components/WallView.tsx`：公共墙与个人作品列表。
- `src/KissWall/components/SteleDetail.tsx`：作品详情、作者、反应、留言与 kiss-back。
- `src/KissWall/utils/prompt.ts`：八种主题、触碰信号和黑白标本 prompt。
- `src/KissWall/utils/audio.ts`：预分配 WebAudio kiss/UI 音效与触觉反馈。
- `src/shared/runtime/media.ts`：AlterU 媒体任务、尺寸拟合、轮询和结构化错误。
- `src/shared/runtime/useGenImage.ts`：512×768 text/edit 选择、幂等请求和一次受控重试。
- `src/shared/save/useGameSave.ts`：UUID 隔离的本地/平台存档。

## 3. 核心模块

- 状态：`useKissWall` 管理主题、吻列表、首触、生成、墓志铭、绽开、父作品和本地存档镜像；refs 防止重复启动生成与重复持久化。
- 输入：`DarkCanvas` 将 pointer 坐标归一化为 `0–1`；真实吻立即写入状态，演示吻带 `isDemo` 且不进入生成或保存。
- 媒体：无父图时调用 `mode: text`；kiss-back 以父肖像为唯一 `reference_urls` 调用 `mode: edit`；尺寸固定 512×768，永久 UUID 作为 `session_id`。网络歧义复用 `request_id`，明确可重试错误尊重延迟并只创建一次新请求。
- 完成：真实吻数达到 12 且媒体结束后，700 ms 定时器触发绽开；成功结果写入最多 10 件历史，失败只显示恢复状态。
- 社交：公共墙由各用户最新存档合并；详情可打开作者资料、点赞、留言和 kiss-back，跨用户动作经平台事件通知。
- 音频：首次手势创建 AudioContext 与噪声 buffer；每次 kiss 合成噪声点击与正弦 formant，实时声部最多 8。
- 多语言：`i18n/index.ts` 提供多语言文案；LLM 墓志铭失败时使用本地英文回退句。

## 4. 扩展点

- 调整完成门槛、演示节奏、历史上限或通知：编辑 `hooks/useKissWall.ts`。
- 调整主题、构图、黑白约束和 kiss-back 保真：编辑 `utils/prompt.ts`。
- 调整媒体尺寸、模式和重试：编辑 `shared/runtime/useGenImage.ts`；协议位于 `shared/runtime/media.ts`。
- 调整唇印：替换 `public/lip-*.png` 并同步 `assets/lips.tsx`；保持透明背景和相近边界。
- 调整画布遮罩与揭晓：编辑 `components/DarkCanvas.tsx` 和 `KissWall.less`。
- 调整公共墙、留言与资料入口：编辑 `hooks/useWall.ts`、`WallView.tsx` 与 `SteleDetail.tsx`。
- 调整文案与语言：编辑 `i18n/index.ts`。
