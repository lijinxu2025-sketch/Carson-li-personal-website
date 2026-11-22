# April Zhu 网站复刻

这是 `https://april-zhu.com/` 的本地静态工程复刻。除首页外，工程还包含 About、Pendle、Boros、AlphaGeo，以及 Rebirth、Interface、Digital Eternity、Breathe、Loners in COVID 独立页面。首页保留了长滚动叙事、首屏序列帧动画、旗舰项目、横向设计方法区、AI 与工具视频卡片、咨询作品弹窗、建筑与艺术作品区及联系区。

## 本地启动

1. 双击 `启动网站.bat`。
2. 启动器会在后台开启本地服务器，并自动打开浏览器。
3. 使用结束后，可以双击 `停止网站.bat` 关闭后台服务器。

如需使用终端，也可以运行 `npm start`，再访问 `http://127.0.0.1:4173`。

也可以使用任意静态文件服务器打开本目录。

## 工程结构

- `index.html`：页面结构与咨询作品内容
- `style.css`：完整视觉与响应式样式
- `script.js`：首屏滚动动画、导航、滚动与媒体交互
- `approach-iso.js`：设计方法区的等距插画动画
- `roll-buttons.js`：按钮滚动文字效果
- `assets/`：全部本地图片、视频与 121 帧首屏序列资源
- `about/`：About 页面及其本地运行资源
- `pendle/`、`boros/`、`alphageo/`：旗舰案例页
- `rebirth/`、`interface/`、`digital-eternity/`、`breathe/`、`loners-in-covid/`：建筑与艺术案例页
- `server.js`：零依赖本地预览服务器
- `启动网站.bat`：一键启动服务器并自动打开网站
- `停止网站.bat`：关闭一键启动器创建的后台服务器

> 页面中的外部链接、邮箱和社交账号仍指向原站对应目标。
