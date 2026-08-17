# BodyForm 体型模拟器

基于 React、TypeScript、React Three Fiber 和 Three.js 的前端 MVP。

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 当前实现

- 女性 / 男性模型切换
- 身高、体重滑块与 BMI 展示
- 可展开的胸围、腰围、臀围、臂围、腿围视觉微调
- 当前体型与目标体型的独立录入、预览及一键复制
- 正、左、右、背及自由视角
- 本地持久化、重置、PNG 导出
- 响应式控制面板与免责声明

当前仓库未提供具备骨骼和 Shape Key 的商用 GLB 人体资产，因此 3D 画布使用了参数化占位人体，验证完整的交互链路。接入正式资产时，应按 [`技术方案.md`](./技术方案.md) 的骨骼和 Morph Target 命名规范，在 `src/components/BodyModel.tsx` 中替换占位实现。
