# 样式文件

本目录包含全局样式和 CSS 变量。

## 文件说明

- `variables.css` - CSS 变量定义（颜色、间距、字体等）
- `main.css` - 全局样式和重置样式

## 样式组织

```
styles/
├── variables.css   # CSS 变量
├── main.css        # 全局样式
└── themes/         # 主题样式（可选）
```

## 开发指南

- 使用 CSS 变量实现主题切换
- 遵循 BEM 命名规范（可选）
- 组件样式使用 scoped
- 避免过深的选择器嵌套
