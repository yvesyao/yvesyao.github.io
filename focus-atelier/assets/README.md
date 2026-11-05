# 油画风格素材

2026-11-05。使用内置 imagegen 工具生成，未使用 API / CLI 生图。图片模拟油画笔触，并非实体油画的拍摄记录。构图来自本项目原有 SVG；三套配色保留现有配色关系，色值作为生成参考，不声称逐像素准确。

| 文件 | 用途 | 网页尺寸 |
| --- | --- | --- |
| atelier-paper.webp | 纸上晴日主画面 | 1000 × 1078 |
| atelier-earth.webp | 陶土午后主画面 | 1000 × 1078 |
| atelier-sea.webp | 海边来信主画面 | 1000 × 1078 |
| brush-texture.webp | 三张预览卡和调色按钮的表面纹理 | 700 × 700 |
| icons.svg | 自绘线条图标，无 emoji 字体依赖 | SVG |

主画面按主题加载。纹理通过 CSS multiply 叠加，保留卡片原有文字与布局。训练中的数字、文字墨色和目标图形保持清晰纯色。图像生成后仅用 cwebp 缩放和编码（主画面 quality 84，纹理 quality 82，method 6），无额外调色或绘制。保存路径均为本 README 同目录。

## 提示词

### 纸上晴日

输入：修改前首页原有 SVG 的截图。

```text
Use case: style-transfer. This reference is the existing original illustration for an adult attention-practice website. Repaint exactly this composition as a sophisticated, genuinely tactile OIL PAINTING on linen, photographed straight-on. Preserve the cobalt-blue arch and its broad base, orange-red sun in the upper right, mustard-yellow left leaf, muted sage-green right leaves, small terracotta pot and one yellow flower centered in the arch, warm ivory background. Preserve the overall clean color relationships: cobalt #284cba, vermilion #d85b3d, ochre #dfb33e, sage #486858, ivory #f1e8cd. Colors must remain rich and distinct. Replace every flat vector fill with visible confident directional hog-bristle brush strokes, irregular hand-painted contours, scumbled dry-brush gaps, layered pigment, subtle impasto ridges and natural linen weave. The texture must feel intrinsic to painted color, not a uniform noise filter. Keep shapes simple and artful, like a contemporary gallery still life, not photorealistic objects. Full bleed artwork only, portrait aspect about 500:540, no UI, no framing, no margins, no lettering, no signature, no emoji, no new objects. Preserve positions and proportions while making the star-shaped yellow flower more naturally brush-painted and less icon-like. Soft side lighting revealing fine paint relief, matte finish, not glossy, not plastic, not 3D render.
```

### 陶土午后

输入：已生成的纸上晴日图片。只修改配色。

```text
Use case: style-transfer. Edit target: this oil-painting-style website illustration. Change ONLY the palette to a subdued warm earth palette. Recolor the blue arch and base to warm cocoa/umber #72544d, orange sun and terracotta pot to burnt sienna #b86f4c, golden leaf and flower to dusty ochre #c2aa68, green leaves and stem to olive sage #68735a, ivory ground to pale warm linen #e7dac4. Preserve EXACT composition, object count, silhouette positions, portrait aspect, irregular paint edges, rich directional bristle marks, layered pigment and matte impasto relief. Keep an artful sophisticated gallery painting feel, natural pigment variation within each target hue. No text, no frame, no UI, no emoji, no new objects. Full bleed artwork.
```

### 海边来信

输入：已生成的纸上晴日图片。只修改配色。

```text
Use case: style-transfer. Edit target: this oil-painting-style website illustration. Change ONLY the palette to a quiet coastal palette. Recolor the blue arch and base to deep petrol teal #285c69, orange sun and terracotta pot to muted rust coral #c45d43, golden leaf and flower to soft straw ochre #d5b85c, green leaves and stem to sea sage #678e79, ivory ground to pale cool ivory #e9e9d7. Preserve EXACT composition, object count, silhouette positions, portrait aspect, irregular paint edges, rich directional bristle marks, layered pigment and matte impasto relief. Keep an artful sophisticated gallery painting feel, natural pigment variation within each target hue. No text, no frame, no UI, no emoji, no new objects. Full bleed artwork.
```

### 笔刷纹理

无参考图，直接生成。

```text
Use case: stylized-concept. Asset type: subtle paint-material texture for adult artful website game-preview cards. Create a seamless-feeling full bleed square MACRO photograph of a single field of warm WHITE oil paint brushed thinly and thickly onto off-white linen. Monochrome off-white only, mostly bright #f5f3ee with fine light gray shadows from physical pigment ridges. Broad, confident overlapping hog-bristle strokes with varied diagonal and curved directions, scumbled gaps revealing linen, a few delicate impasto ridges. Tactile and painterly, organic not noisy. Even illumination with gentle raking light, no dramatic shadow or vignette. No objects, shapes, words, letters, frame, gradients, logos, border, or other colors. The texture will be used with CSS multiply over existing flat colors, so avoid dark areas and strong contrast.
```
