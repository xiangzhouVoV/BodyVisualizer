# BodyForm · 3D Body Shape Visualizer

An interactive 3D body-shape visualization tool driven by height, weight, and optional circumference adjustments. No photo upload is required: users can explore an estimated silhouette in the browser from multiple angles and compare their current and target profiles.

**Live demo:** [body-simulator.com](https://body-simulator.com/)

> This project provides a parametric visual reference only. It is not a substitute for medical diagnosis, body-composition testing, or professional health advice.

## Features

- **Live 3D preview:** Update the model instantly as inputs change; drag to rotate and scroll to zoom.
- **Male and female models:** Switch between separate male and female base models.
- **Core measurements:** Adjust height (140–200 cm) and weight (35–130 kg), with a live BMI reference.
- **Local proportion controls:** Fine-tune bust, waist, hip, arm, and leg proportions.
- **Current and target profiles:** Enter and preview two profiles independently, then copy current data into the target profile in one click.
- **Multiple views:** Front, left, right, back, and free camera views are available.
- **Fat-trend layer:** An illustrative BMI-based volume overlay to make parameter changes easier to understand.
- **Local persistence:** Parameters are stored in the browser and can be reset at any time.
- **Responsive and search-friendly:** The interface adapts to desktop and mobile screens and includes crawlable explanatory content and FAQs.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Three.js](https://threejs.org/) + [React Three Fiber](https://r3f.docs.pmnd.rs/)
- [Zustand](https://zustand.docs.pmnd.rs/) for state management and local persistence
- GLTF / GLB human-model assets

## Getting Started

### Requirements

- Node.js 20 or later
- npm 10 or later

### Install and run

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

### Production build

```bash
npm run build
npm run preview
```

## How to Use

1. Choose a male or female model.
2. Enter height and weight in either the **Current Shape** or **Target Shape** profile.
3. Open **Measurement Adjustments** to refine bust, waist, hip, arm, and leg proportions.
4. Use the view buttons, or drag and zoom directly on the 3D canvas.
5. Toggle the fat-trend layer to view an illustrative representation of volume changes.

## Project Structure

```text
src/
├── app/          # Application entry point and overall layout
├── components/   # Controls, 3D canvas, models, and view components
├── lib/          # BMI, deformation parameters, and GLB adapter logic
├── stores/       # Zustand state and local persistence
├── styles/       # Global styles
└── types/        # Shared TypeScript types
public/
└── models/       # GLB human models loaded at runtime
```

## 3D Model Assets

The application loads human models from `public/models/`. The default files are:

```text
female-adult-v1.glb
male-adult-v1.glb
```

To use custom models, follow the dimensions, skeleton, and Morph Target conventions in the [model integration guide](./public/models/README.md). For the complete deformation and asset-integration design, see the [technical specification](./技术方案.md).

## Implementation Notes

- BMI is calculated from height and weight, then mapped to continuous whole-body volume trend parameters.
- Circumference controls are combined with localized deformation for the bust, waist, hips, and limbs.
- Models are normalized to their base height; the camera moves smoothly when the selected view changes.
- User settings are saved under the `body-visualizer-profile` key in browser localStorage. Body measurements and photos are not sent to a server by this application.

## Important Notes

- The displayed result is an algorithmic illustration. Real proportions vary with muscle mass, bone structure, posture, and fat distribution.
- BMI and the fat-trend layer are general references only; neither represents actual body-fat percentage or health status.
- The project does not collect photos, camera footage, or facial information.

## Related Documentation

- [GLB model delivery guide](./public/models/README.md)

---

# BodyForm · 3D 体型模拟器

一个基于身高、体重与局部围度的交互式 3D 体型可视化工具。用户无需上传照片，即可在浏览器中实时查看不同参数下的身体轮廓，并从多个视角观察当前体型或目标体型。

**在线体验：** [body-simulator.com](https://body-simulator.com/)

> 本项目提供的是参数化视觉参考，不能替代医学诊断、人体成分检测或专业健康建议。

## 功能概览

- **实时 3D 预览**：修改数据后即时更新模型，可拖拽旋转、滚轮缩放。
- **男女模型**：支持男性和女性基础模型切换。
- **基础身体数据**：可调节身高（140–200 cm）和体重（35–130 kg），并实时展示 BMI 参考值。
- **局部围度微调**：可分别调整胸、腰、臀、臂、腿部围度，观察局部比例变化。
- **当前 / 目标体型**：分别录入两组数据，并可一键将当前数据复制为目标数据。
- **多视角查看**：提供正面、左侧、右侧、背面和自由视角。
- **脂肪趋势图层**：基于 BMI 的视觉化趋势叠层，用于帮助理解体积变化。
- **本地保存**：通过浏览器本地存储保留用户上次使用的参数，支持一键重置。
- **响应式界面与 SEO**：适配桌面和移动端，并提供可被搜索引擎读取的说明内容与 FAQ。

## 技术栈

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Three.js](https://threejs.org/) + [React Three Fiber](https://r3f.docs.pmnd.rs/)
- [Zustand](https://zustand.docs.pmnd.rs/)（状态管理与本地持久化）
- GLTF / GLB（人体模型资源）

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本

### 安装与运行

```bash
npm install
npm run dev
```

启动后，在终端显示的本地地址打开应用。

### 生产构建

```bash
npm run build
npm run preview
```

## 使用方式

1. 选择男性或女性模型。
2. 在「当前体型」或「目标体型」中填写身高和体重。
3. 按需要展开「围度微调」，调整胸、腰、臀、手臂和腿部比例。
4. 使用视角按钮，或直接拖拽、缩放 3D 画布查看模型。
5. 打开脂肪趋势图层，以视觉参考的方式观察参数变化。

## 项目结构

```text
src/
├── app/          # 页面入口与整体布局
├── components/   # 控制面板、3D 画布、模型与视角组件
├── lib/          # BMI、形变参数与 GLB 适配逻辑
├── stores/       # Zustand 状态及本地持久化
├── styles/       # 全局样式
└── types/        # 共享类型定义
public/
└── models/       # 运行时加载的 GLB 人体模型
```

## 3D 模型资源

应用会从 `public/models/` 加载人体模型。现有默认文件为：

```text
female-adult-v1.glb
male-adult-v1.glb
```

如需替换为自有模型，请遵循 [模型接入说明](./public/models/README.md) 中的尺寸、骨骼和 Morph Target（形态键）约定。更完整的接入与形变设计见 [技术方案](./技术方案.md)。

## 核心实现说明

- BMI 由身高和体重计算，用于生成连续的全身体积趋势参数。
- 围度控制会叠加到胸、腰、臀、四肢等局部形变上。
- 3D 模型按基础身高归一化；切换视角时，相机会平滑移动到对应位置。
- 用户配置以 `body-visualizer-profile` 为键写入浏览器 localStorage，不会上传照片或身体数据到服务器。

## 注意事项

- 体型结果为算法生成的示意效果，真实人体比例会受到肌肉量、骨架、姿势、脂肪分布等多种因素影响。
- BMI 与脂肪趋势仅用于一般参考，不能代表真实体脂率或健康状况。
- 本项目不采集照片、摄像头画面或面部信息。

## 相关文档

- [GLB 模型交付规范](./public/models/README.md)
