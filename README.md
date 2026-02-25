# JavaScript Ray Tracer

A browser-based 3D rendering engine that creates realistic images by simulating how light travels through a scene. Ray tracing works by shooting virtual "rays" from a camera through each pixel, calculating where they intersect with objects, and determining pixel colors based on lighting and material properties.

![Render Example](specular.png)

## What It Does

This ray tracer renders 3D scenes with:
- **Spheres and planes** positioned in 3D space
- **Realistic lighting** including ambient, diffuse, and specular components
- **Shadows** cast by objects blocking light sources
- **Interactive controls** to toggle lighting effects and adjust reflection depth in real-time

## How to Use

1. **Open the app:** Open `index.html` in a web browser, or use a local server:
   ```bash
   python3 -m http.server 8000
   ```
2. **Load a scene:** Click the scene file input and select `scene-2.json`
3. **Render:** Click "Render scene" to generate the image
4. **Adjust settings:** Toggle the Ambient, Diffuse, and Specular checkboxes to see different lighting effects, or change the Max Depth slider to control reflection bounces

Scenes are defined in JSON files with camera position, objects (spheres/planes with colors and material properties), and light positions. See the included scene file for examples.
