# 3D 模型接入目录

将正式模型放在本目录，前端会自动优先加载：

```text
female-adult-v1.glb
male-adult-v1.glb
```

模型不存在或加载失败时，应用会继续使用前端参数化占位人体。

## GLB 规范

- 基准身高：女性 `165cm`，男性 `175cm`
- 脚底：`Y = 0`，单位：米，基础姿势：A-Pose
- 网格：`Body`（可选 `Clothes`），并使用 `SkinnedMesh`
- 骨骼：`Spine`、`Spine1`、`LeftThigh`、`RightThigh`、`LeftCalf`、`RightCalf`、`LeftUpperArm`、`RightUpperArm`、`LeftForeArm`、`RightForeArm`
- Morph Targets：`body_fat`、`belly_large`、`chest_large`、`waist_large`、`hip_large`、`thigh_large`、`calf_large`、`arm_large`
- 可选身高修正 Morph Targets：`height_torso_fix`、`height_leg_fix`、`height_arm_fix`

前端会忽略缺失的骨骼或 Morph Target，因此可分阶段交付资产。
