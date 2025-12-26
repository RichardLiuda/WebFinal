# WebFinal - 开发说明

## 目录结构

```
css/
  global.css
html/
  index.html
js/
  layout.js
docs/
  分工.md
  LocalStorage.md
  material-web-docs/
```

## 快速开始

1. 直接打开 `html/index.html` 预览。
2. 该页面使用 Material Web CDN，不需要本地安装依赖。

## 关键引用路径

- HTML 引用样式：`../css/global.css`
- HTML 引用脚本：`../js/layout.js`
- HTML 引用数据层：`../js/LocalStorage.js`

> 注意：`LocalStorage.js` 需放在 `js/` 目录下。成员E负责提供该文件。

## Material Web 使用

- CDN 来源：`https://esm.run/@material/web/`
- 入口已在 `html/index.html` 内写好 importmap 和 typescale。
- 主题通过 CSS tokens 设置（见 `css/global.css` 中的 `--md-sys-*` 变量）。

## 分工参考

- `docs/分工.md`：团队模块分工与协作流程
- `docs/LocalStorage.md`：数据结构与 API 约定

## 协作建议

- 新页面放在 `html/`，样式放在 `css/`，脚本放在 `js/`。
- 组件尽量使用 `md-*` 标签（Material Web），避免自定义样式冲突。