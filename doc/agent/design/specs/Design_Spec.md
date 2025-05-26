# 设计规范说明文档 (Design Specification) - Karmada-Dashboard 用户体验优化

## 1. 文档概述

### 1.1 文档目的

本文档为 Karmada-Dashboard 用户体验优化项目提供全面的设计规范指导，确保所有UI/UX设计的一致性、可访问性和用户友好性。基于PRD文档中的设计指导和技术架构要求制定。

### 1.2 适用范围

- UI/UX 设计师
- 前端开发工程师
- 产品经理
- 测试工程师

### 1.3 设计目标

- 提升 Karmada-Dashboard 的现代化视觉效果和用户体验
- 保持与 Ant Design 设计语言的兼容性
- 确保 Web 平台的最佳用户体验
- 实现国际化支持和可访问性标准

## 2. 设计原则与理念

### 2.1 核心设计原则

#### 2.1.1 现代化与专业性并重
- **视觉现代化**: 在保持专业性的基础上，追求更具吸引力的现代化界面设计
- **色彩丰富**: 大胆且合理地运用更丰富的色彩搭配，营造专业且有活力的界面氛围
- **动效平滑**: 适当引入平滑的过渡动画和细致的交互特效，提升操作流畅感

#### 2.1.2 信息优先与用户友好
- **信息层次**: 清晰的视觉层次，突出重要信息
- **用户引导**: 为复杂功能提供必要的引导和帮助
- **反馈及时**: 每个用户操作都有明确、即时的系统反馈

#### 2.1.3 一致性与可预测性
- **交互一致**: 遵循 Ant Design 交互规范，保持操作逻辑一致
- **视觉统一**: 统一的颜色、字体、图标、间距等设计元素
- **行为可预测**: 相同的交互应产生相同的结果

### 2.2 目标平台设计方针

根据PRD 2.4节要求，本项目主要针对 **Web 平台**：

- **浏览器适配**: 支持最新版本的 Chrome、Firefox、Edge、Safari
- **响应式设计**: 适配 1920x1080、1366x768、2560x1440 等主流分辨率
- **Web 特性优化**: 充分利用 Web 平台特性，如快捷键、链接分享、浏览器历史等

## 3. 视觉设计规范

### 3.1 色彩系统

#### 3.1.1 主色调方案

```css
/* 主色调 - 蓝紫渐变系 */
:root {
  /* 主色 */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;   /* 主品牌色 */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  --primary-900: #1e3a8a;

  /* 次色 - 紫色 */
  --secondary-50: #faf5ff;
  --secondary-100: #f3e8ff;
  --secondary-200: #e9d5ff;
  --secondary-300: #d8b4fe;
  --secondary-400: #c084fc;
  --secondary-500: #a855f7;  /* 次品牌色 */
  --secondary-600: #9333ea;
  --secondary-700: #7c3aed;
  --secondary-800: #6b21a8;
  --secondary-900: #581c87;
}
```

#### 3.1.2 功能色彩

```css
:root {
  /* 成功色 */
  --success-50: #ecfdf5;
  --success-500: #10b981;
  --success-600: #059669;

  /* 警告色 */
  --warning-50: #fffbeb;
  --warning-500: #f59e0b;
  --warning-600: #d97706;

  /* 错误色 */
  --error-50: #fef2f2;
  --error-500: #ef4444;
  --error-600: #dc2626;

  /* 信息色 */
  --info-50: #f0f9ff;
  --info-500: #06b6d4;
  --info-600: #0891b2;
}
```

#### 3.1.3 中性色系

```css
:root {
  /* 中性色 */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;

  /* 纯色 */
  --white: #ffffff;
  --black: #000000;
}
```

#### 3.1.4 渐变色方案

```css
:root {
  /* 主要渐变 */
  --gradient-primary: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --gradient-secondary: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
  
  /* 背景渐变 */
  --gradient-bg-light: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  --gradient-bg-card: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
}
```

### 3.2 字体系统

#### 3.2.1 字体族

```css
:root {
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 
                       'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', 
                       Helvetica, Arial, sans-serif;
  --font-family-mono: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 
                       'source-code-pro', monospace;
}
```

#### 3.2.2 字体尺寸与行高

```css
:root {
  /* 字体大小 */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* 行高 */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

#### 3.2.3 字体权重

```css
:root {
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### 3.3 间距系统

#### 3.3.1 基础间距单位

```css
:root {
  --spacing-0: 0;
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  --spacing-20: 5rem;     /* 80px */
}
```

#### 3.3.2 组件间距规范

- **组件内边距**: 16px (--spacing-4)
- **组件间距**: 24px (--spacing-6)
- **区块间距**: 32px (--spacing-8)
- **页面边距**: 24px (--spacing-6)

### 3.4 阴影与圆角

#### 3.4.1 阴影系统

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* 特效阴影 */
  --shadow-primary: 0 4px 12px rgba(79, 70, 229, 0.3);
  --shadow-success: 0 4px 12px rgba(16, 185, 129, 0.3);
  --shadow-warning: 0 4px 12px rgba(245, 158, 11, 0.3);
  --shadow-error: 0 4px 12px rgba(239, 68, 68, 0.3);
}
```

#### 3.4.2 圆角系统

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.125rem;   /* 2px */
  --radius-md: 0.375rem;   /* 6px */
  --radius-lg: 0.5rem;     /* 8px */
  --radius-xl: 0.75rem;    /* 12px */
  --radius-2xl: 1rem;      /* 16px */
  --radius-full: 9999px;
}
```

## 4. 组件设计规范

### 4.1 按钮规范

#### 4.1.1 主要按钮

```css
.btn-primary {
  background: var(--gradient-primary);
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--spacing-3) var(--spacing-5);
  color: var(--white);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: var(--shadow-md);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

#### 4.1.2 次要按钮

```css
.btn-secondary {
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-lg);
  padding: var(--spacing-3) var(--spacing-5);
  color: var(--gray-700);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--primary-500);
  color: var(--primary-600);
}
```

#### 4.1.3 按钮尺寸

- **大号按钮**: 高度 44px，水平内边距 24px
- **标准按钮**: 高度 36px，水平内边距 20px  
- **小号按钮**: 高度 28px，水平内边距 16px

### 4.2 表单组件规范

#### 4.2.1 输入框

```css
.form-input {
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-lg);
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  transition: all 0.2s ease;
  background: var(--white);
  width: 100%;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-input:invalid {
  border-color: var(--error-500);
}

.form-input::placeholder {
  color: var(--gray-400);
}
```

#### 4.2.2 标签

```css
.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-700);
  margin-bottom: var(--spacing-2);
}

.form-label.required::after {
  content: " *";
  color: var(--error-500);
}
```

#### 4.2.3 错误提示

```css
.form-error {
  display: flex;
  align-items: center;
  margin-top: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--error-600);
}

.form-error::before {
  content: "⚠";
  margin-right: var(--spacing-1);
}
```

### 4.3 卡片组件规范

#### 4.3.1 基础卡片

```css
.card {
  background: var(--white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-200);
  transition: all 0.3s ease;
  overflow: hidden;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.card-header {
  padding: var(--spacing-6);
  border-bottom: 1px solid var(--gray-100);
}

.card-body {
  padding: var(--spacing-6);
}

.card-footer {
  padding: var(--spacing-6);
  border-top: 1px solid var(--gray-100);
  background: var(--gray-50);
}
```

#### 4.3.2 状态卡片

```css
.card-success {
  border-left: 4px solid var(--success-500);
  background: linear-gradient(135deg, var(--white) 0%, var(--success-50) 100%);
}

.card-warning {
  border-left: 4px solid var(--warning-500);
  background: linear-gradient(135deg, var(--white) 0%, var(--warning-50) 100%);
}

.card-error {
  border-left: 4px solid var(--error-500);
  background: linear-gradient(135deg, var(--white) 0%, var(--error-50) 100%);
}
```

### 4.4 导航组件规范

#### 4.4.1 侧边栏

```css
.sidebar {
  background: var(--white);
  border-right: 1px solid var(--gray-200);
  width: 240px;
  position: fixed;
  height: 100vh;
  z-index: 10;
  box-shadow: var(--shadow-sm);
}

.sidebar-header {
  padding: var(--spacing-6);
  border-bottom: 1px solid var(--gray-100);
}

.sidebar-nav {
  padding: var(--spacing-4) 0;
}
```

#### 4.4.2 导航项

```css
.nav-item {
  padding: var(--spacing-3) var(--spacing-5);
  margin: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
  cursor: pointer;
  color: var(--gray-700);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.nav-item:hover {
  background: var(--primary-50);
  color: var(--primary-700);
}

.nav-item.active {
  background: var(--primary-100);
  color: var(--primary-700);
  font-weight: var(--font-semibold);
}

.nav-item i {
  margin-right: var(--spacing-3);
  width: 16px;
  text-align: center;
}
```

## 5. 布局设计规范

### 5.1 页面布局结构

```
┌─────────────────────────────────────┐
│              Header (64px)          │
├─────────┬───────────────────────────┤
│         │                           │
│ Sidebar │        Main Content       │
│ (240px) │                           │
│         │                           │
│         │                           │
└─────────┴───────────────────────────┘
```

### 5.2 响应式断点

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

### 5.3 网格系统

- **12列网格系统**
- **间距**: 24px
- **最大宽度**: 1200px
- **居中对齐**

## 6. 数据可视化规范

### 6.1 图表颜色方案

```css
:root {
  --chart-colors: [
    '#4f46e5',  /* 主色 */
    '#7c3aed',  /* 次色 */
    '#06b6d4',  /* 信息色 */
    '#10b981',  /* 成功色 */
    '#f59e0b',  /* 警告色 */
    '#ef4444',  /* 错误色 */
    '#8b5cf6',  /* 紫色 */
    '#ec4899'   /* 粉色 */
  ];
}
```

### 6.2 图表设计原则

- **清晰易读**: 确保图表标签、数值清晰可见
- **色彩语义**: 使用有意义的颜色（绿色表示健康，红色表示异常）
- **交互友好**: 提供悬停、点击等交互效果
- **响应式**: 图表能适应不同屏幕尺寸

### 6.3 状态指示器

#### 6.3.1 健康状态颜色

```css
.status-healthy { color: var(--success-500); }
.status-warning { color: var(--warning-500); }
.status-error { color: var(--error-500); }
.status-unknown { color: var(--gray-400); }
```

#### 6.3.2 进度条

```css
.progress-bar {
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  height: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-fill.success { background: var(--gradient-success); }
.progress-fill.warning { background: var(--warning-500); }
.progress-fill.error { background: var(--error-500); }
```

## 7. 动画与交互规范

### 7.1 动画时长

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}
```

### 7.2 缓动函数

```css
:root {
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 7.3 常用动画效果

#### 7.3.1 悬停效果

```css
.hover-lift {
  transition: transform var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

#### 7.3.2 淡入动画

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}
```

#### 7.3.3 加载动画

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}
```

## 8. 国际化设计考虑

### 8.1 文本长度适应

- **按钮**: 预留 1.5-2 倍英文长度空间
- **标签**: 预留 1.3-1.5 倍英文长度空间
- **错误信息**: 预留 2-2.5 倍英文长度空间

### 8.2 RTL 支持预留

```css
[dir="rtl"] .sidebar {
  left: auto;
  right: 0;
  border-right: none;
  border-left: 1px solid var(--gray-200);
}

[dir="rtl"] .main-content {
  margin-left: 0;
  margin-right: 240px;
}
```

### 8.3 字体fallback

确保中文、英文、阿拉伯文等不同语言的字体正确显示。

## 9. 可访问性规范

### 9.1 颜色对比度

- **正常文本**: 至少 4.5:1
- **大号文本**: 至少 3:1
- **非文本元素**: 至少 3:1

### 9.2 焦点指示

```css
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

.btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3);
}
```

### 9.3 屏幕阅读器支持

- 使用语义化HTML标签
- 提供 `aria-label` 和 `aria-describedby`
- 确保键盘可访问性

## 10. 性能优化设计

### 10.1 图片优化

- 使用 WebP 格式
- 提供多种尺寸版本
- 实现懒加载

### 10.2 CSS优化

- 避免深层嵌套
- 使用CSS变量减少重复
- 合理使用CSS modules

### 10.3 JavaScript交互

- 使用防抖和节流
- 避免强制同步布局
- 优化大列表渲染

## 11. 实现指南

### 11.1 技术栈集成

#### 11.1.1 Ant Design集成

```javascript
// 自定义主题配置
const theme = {
  token: {
    colorPrimary: '#4f46e5',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 8,
    fontSize: 14,
  },
};
```

#### 11.1.2 Tailwind CSS配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // ... 其他颜色
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC'],
      },
    },
  },
};
```

### 11.2 组件开发规范

#### 11.2.1 组件结构

```typescript
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const Component: React.FC<ComponentProps> = ({
  className,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...props
}) => {
  const classNames = cn(
    'base-classes',
    variant === 'primary' && 'primary-classes',
    size === 'lg' && 'large-classes',
    disabled && 'disabled-classes',
    className
  );

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};
```

### 11.3 样式组织

```
styles/
├── globals.css           # 全局样式
├── variables.css         # CSS变量定义
├── components/          
│   ├── button.css       # 按钮组件样式
│   ├── card.css         # 卡片组件样式
│   └── form.css         # 表单组件样式
├── layouts/
│   ├── sidebar.css      # 侧边栏布局
│   └── header.css       # 头部布局
└── utilities/
    ├── animations.css   # 动画工具类
    └── helpers.css      # 辅助工具类
```

## 12. 质量保证

### 12.1 设计审查检查清单

- [ ] 色彩对比度符合WCAG标准
- [ ] 所有交互状态已定义（hover、focus、active、disabled）
- [ ] 错误状态和成功状态已设计
- [ ] 加载状态已考虑
- [ ] 移动端适配已验证
- [ ] 国际化文本长度已考虑
- [ ] 键盘导航可用

### 12.2 开发实现检查

- [ ] 组件prop类型正确定义
- [ ] 样式类名遵循命名规范
- [ ] 动画性能已优化
- [ ] 无障碍属性已添加
- [ ] 浏览器兼容性已测试

## 13. 维护与更新

### 13.1 版本管理

- 设计系统版本与产品版本保持同步
- 重大变更需要向下兼容性考虑
- 及时更新设计token和组件文档

### 13.2 反馈收集

- 定期收集用户使用反馈
- 监控组件使用情况和性能数据
- 根据业务需求演进设计系统

---

*本文档版本: v1.0 | 最后更新: 2024年 | 基于 Karmada-Dashboard PRD v1.0* 