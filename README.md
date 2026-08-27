# BodyForm · 3D Body Shape Visualizer

An interactive 3D body-shape visualization tool driven by height, weight, and optional circumference adjustments. No photo upload is required: users can explore an estimated silhouette in the browser from multiple angles and compare their current and target profiles.

**Online demos:**
- [Try the free 3D Body Shape Visualizer](https://body-simulator.com/)
- [Check your body type with the Body Shape Calculator](https://body-simulator.com/body-shape-calculator/)

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
- **Body Shape Calculator:** A dedicated `/body-shape-calculator/` page classifies body proportions from shoulder, bust, waist, and hip measurements.
- **Five proportion-based shapes:** The calculator explains Hourglass, Pear/Triangle, Inverted Triangle, Apple/Round, and Rectangle/Straight patterns with illustrated examples and “How to tell” guidance.
- **Male shape guide:** The calculator also documents Trapezoid, Inverted Triangle, Rectangle, Oval, and Triangle male body-shape patterns.
- **Shareable calculator results:** Calculator inputs update the URL with gender, height, shoulder, bust, waist, and hip parameters so a result can be shared or sent to the full simulator.

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

### Body Shape Calculator

1. Open the [Body Shape Calculator](https://body-simulator.com/body-shape-calculator/).
2. Enter your gender, height, shoulder circumference, bust, waist, and hip measurements.
3. Switch between centimetres and inches as needed.
4. Read the calculated body-shape category and its proportion-based explanation.
5. Explore the 3D preview, measurement markers, shape guides, measurement instructions, and FAQ.
6. Select **See Full 3D Body Simulator** to continue on the home page; the calculator opens the simulator in a reset state so its saved controls are not accidentally reused.

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
├── images/       # Female and male body-shape guide illustrations
└── models/       # GLB human models loaded at runtime
body-shape-calculator/
└── index.html    # Pre-rendered SEO entry point for the calculator page
```

## 3D Model Assets

The application loads human models from `public/models/`. The default files are:

```text
female-adult-v1.glb
male-adult-v1.glb
```

To use custom models, follow the dimensions, skeleton, and Morph Target conventions in the [model integration guide](./public/models/README.md). For the complete deformation and asset-integration design.

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
