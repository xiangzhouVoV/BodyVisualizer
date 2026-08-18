# Body Shape Visualizer — SEO 优化提示词

## 角色
你是一个 SEO 专家。当前项目是一个功能已完成的「Body Shape Visualizer」工具站（Next.js 14 + TypeScript + Tailwind CSS + React Three Fiber），工具交互已经跑通。
现在你的任务：**不动功能代码，只做 SEO 层的注入与优化**。

## 背景数据（以下数据来自实测，禁止修改文案方向）
- 关键词：`body shape visualizer`
- KD（关键词难度）：23.2 / 100（容易），新站可打
- 谷歌月搜索量：约 740，趋势可能上升
- SERP 格局：前十名仅 1 个站点为此词定制了页面，其余全是大站内页或论坛帖顺路占位——一张聚焦首页就能入场

## 一、TDK + H1（必须精确，一个字不差）

在页面源码中设置以下内容，**不要自由发挥、不要缩略、不要"优化文案"**：

- **Title**: `Body Shape Visualizer - See Your Body Type in 3D`
- **Meta Description**: `Free body shape visualizer: enter your height, weight and measurements to see your body type in 3D. Compare body shapes and understand your silhouette instantly.`
- **H1**（页面有且仅有一个 H1）: `Body Shape Visualizer`
- H1 放在页面主体最上方（工具区之前），用 `<h1>` 标签，不是 div 模拟

## 二、正文区（工具下方，800-1000 词，严格按大纲写）

在 3D 工具区下方新增一个正文区 `<section>`，按以下结构和内容写：

### 写作铁律
- 总字数 800-1000 词
- 核心词 `body shape visualizer` 出现 24-40 次（密度 3%-5%），**自然融入，禁止生硬堆砌**
- 以下词族变体各出现 2-4 次，分散在全文：`3D body visualizer` / `body visualizer female` / `body visualizer male` / `BMI visualizer` / `body visualizer cm and kg`
- 语调用日常解释性英语，不要学术论文腔、不要 AI 生成感

### 段落结构（每段用 H2 标题）

**H2: What Is a Body Shape Visualizer?**（约 120 词）
一句话定义：输入身体测量值即可看到自己体型的在线 3D 工具。对比 BMI 计算器——它不仅给一个数字，而是让你直观看到身体轮廓。首句出现 `body shape visualizer`，自然带出 `3D body visualizer`。

**H2: How It Works — No Photo Needed**（约 150 词）
直击搜索者核心疑虑：不需要上传照片，不需要摄像头。只需要身高体重（必填）+ 三围（可选，工具自动补全合理值）。3D 模型由人体测量学统计模型实时驱动变形。
本段融入：`body visualizer cm and kg`、`body visualizer measurements`。

**H2: Body Types You Can See**（约 130 词）
介绍 5 种主流体型，每种 2-3 句话日常描述（用 "if your shoulders and hips are roughly the same width…" 这类语气，不要医学定义）：
- Hourglass（沙漏）
- Pear（梨形）
- Rectangle（矩形）
- Apple（苹果形）
- Inverted triangle（倒三角）
本段融入：`body visualizer female`、`body visualizer male`——提及工具按性别切换模型，男女体型模式不同。

**H2: BMI and Beyond**（约 120 词）
工具同时显示 BMI 数值与四色分类（underweight/normal/overweight/obese）。强调差异点：BMI 只看身高体重，体型可视化额外引入围度维度。两个人 BMI 完全相同但体型可能截然不同——这就是你需要体型可视化而非单纯 BMI 计算器的原因。
本段集中出现：`BMI visualizer`。

**H2: Why 3D Instead of 2D?**（约 100 词）
对比 2D 静态体型图：角度固定、无法旋转、看不出真实比例。3D 可视化可 360° 旋转缩放，从每个角度看清身体轮廓。用途场景：健身追踪体型变化、服装选购参考（知道真实体型再买衣服）、健康监测。

**H2: How to Use — Step by Step**（约 100 词）
写成 Quick Start Guide 格式（可被谷歌选入 Featured Snippet）：
1. Select your gender (male or female)
2. Enter your height and weight
3. Optionally adjust chest, waist, and hip measurements
4. Choose your preferred units (metric or imperial)
5. Rotate, zoom, and explore your 3D body shape

**H2: Who Is This For?**（约 80 词）
健身爱好者（追踪体型变化比称体重更有意义）、减重/增肌人群、对自身体型好奇的人、穿搭参考、健康管理者。

## 三、FAQ 区（正文下方，10 条，accordion 折叠）

在正文下方新增 FAQ 区，用 `<section>` + `<details>/<summary>`（或等效 accordion 组件），**每条问题与答案必须真实渲染在 HTML 中**：

1. **What is a body shape visualizer?** → 一句话定义 + 链接回正文第一段
2. **Do I need to upload a photo?** → 不需要，只需输入测量值
3. **Can I see my body type in 3D?** → 是的，360° 旋转缩放
4. **What measurements do I need to enter?** → 身高体重必填，三围可选自动补全
5. **How accurate is the 3D body shape model?** → 基于人体测量学统计模型，提供合理近似；不是医学诊断工具
6. **Can I compare my body shape with someone else?** → 可以分别输入数据进行对比（或提及 Pro 版规划）
7. **Is the body shape visualizer free?** → 是的，完全免费使用
8. **Does it support both metric and imperial units?** → 支持 cm/kg 和 in/lb 一键切换
9. **Can I export or save my result?** → 即将推出导出功能
10. **How is this different from a BMI calculator?** → BMI 只看数字，本工具让你看到真实体型轮廓

## 四、结构化数据（JSON-LD，三组，放在 `<head>` 中）

### 4.1 SoftwareApplication
``` json
{
"@context": "https://schema.org",
"@type": "SoftwareApplication",
"name": "Body Shape Visualizer",
"applicationCategory": "HealthApplication",
"operatingSystem": "Web",
"url": "https://你的域名/",
"offers": {
"@type": "Offer",
"price": "0",
"priceCurrency": "USD"
},
"aggregateRating": {
"@type": "AggregateRating",
"ratingValue": "4.8",
"ratingCount": "120"
}
}
```

### 4.2 FAQPage
将上方 10 条 FAQ 同步写入 JSON-LD FAQPage 结构中（`mainEntity` 数组，每个 item 为 `@type: Question` + `acceptedAnswer: @type: Answer`）。

### 4.3 WebSite
``` json
{
"@context": "https://schema.org",
"@type": "WebSite",
"name": "Body Shape Visualizer",
"url": "https://你的域名/"
} 
```

## 五、技术 SEO 验收（逐项执行）

1. **SSR 验证**：在浏览器中查看页面源代码（右键 → View Page Source），确认 H1、正文全文、FAQ 内容、三组 JSON-LD 全部在 HTML 源码中可见。如果工具区是 React Three Fiber 的 Canvas 组件（仅客户端渲染），确认它不影响 H1/正文/FAQ 的服务端输出。

2. **语义化标签**：使用 `<header>` / `<main>` / `<section>` / `<article>` / `<h1>` / `<h2>` / `<p>` / `<details>` / `<summary>`，禁止全 div 堆砌。

3. **图片 alt**：页面中所有 `<img>` 标签补充描述性 alt 文字。3D Canvas 区域用相邻的 visually-hidden 描述文本（`aria-label` 或 `<span class="sr-only">`）解决无障碍问题。

4. **移动端响应**：工具区和正文在移动端正常显示，无横向滚动条，按钮/滑条可触控操作。

5. **性能**：首屏内容（H1 + 正文前两段）在 LCP 内完成渲染；Three.js / React Three Fiber 相关 JS 按需懒加载，不阻塞首屏渲染。

6. **robots.txt + sitemap.xml**：生成标准的 robots.txt（允许所有爬虫，指向 sitemap）和 sitemap.xml（包含首页 URL）。

## 六、禁止事项

- ❌ 不要改任何已有功能的交互逻辑
- ❌ 不要让正文读起来像「关键词堆砌」——自然英语语感优先
- ❌ 不要在 H1 / Title 中加多余修饰词（如 "Best / Free / Online / 2026" 等）
- ❌ 不要把 3D Canvas 包裹在需要 JS 才能显示正文的容器里（确保无 JS 时正文仍可见）
- ❌ 不要删除或移动已有的工具区 UI