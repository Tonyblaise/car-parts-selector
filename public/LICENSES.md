# Third-party licences

## Fonts

- **Inter** by Rasmus Andersson, licensed under the SIL Open Font License 1.1.
  Source: https://github.com/rsms/inter. It is bundled through `@fontsource-variable/inter`.

## 3D assets

| File | Body style | Source | Licence |
|------|------------|--------|---------|
| `models/suv.glb` | SUV | BMW X1 (F48) STL (`bmwx1f48.stl`, exported from Blender 4.0), supplied by the project owner. Converted with `scripts/build-model.mjs` (re-oriented, scaled, reduced from 500k to 150k triangles, Meshopt-compressed). | **TODO: record where the STL came from and its licence before any public release.** |
| `models/saloon.glb` | Saloon | Mercedes-Benz W222 (S-Class) AMG, `MB.W222.AMG.blend`, exported to GLB through ImageToStl.com and supplied by the project owner. Converted with `scripts/build-model.mjs`, keeping object and material names. Textures (`W222_Photo_Tex.zip`) are not used. | **TODO: record the source and licence.** |
| `models/van.glb` | Van | "Van Car 1" (OBJ/FBX/MAX with BMP textures, 2022), supplied by the project owner. Converted from the OBJ with `scripts/build-model.mjs`, keeping its groups and materials. Textures are not used. | **TODO: record the source and licence.** |

All three body styles use these models. The drawn shapes in `src/vehicles/geometry.ts` are
used only if a model fails to load. "BMW", "X1", "Mercedes-Benz" and "S-Class" are trademarks
of their owners. This demo is not affiliated with or endorsed by either.
