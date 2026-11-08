# 油画风格素材

## 配乐《纸上微光》 / Paperlight

2026-11-08 为本项目编写音符、编配与合成脚本，未使用外部录音、采样库或现成歌曲。`paperlight.mp3` 是数字合成的柔和键音与持续和声，并非真人钢琴录音。`render-music.py` 保留完整可复现来源，需要 Python、NumPy 和 ffmpeg（仅制作工具，网页无这些依赖）。运行 `python render-music.py` 可重新生成同目录音频。

80 BPM、4/4 拍、32 小节（96 秒）立体声循环；Dmaj9 / Gmaj7 / Bm7 / A6sus2 的第一段，在第二段变换音型并引入 Em9。低音与和声缓慢移动，短句之间留空；没有人声、鼓点、突然加速、突兀转场或作答音效。柔化键音起音、控制高次谐波、轻量左右声像与交叉延迟让声音保持温暖，保留轻微节奏以回应“过于安静、容易困”的体验反馈。这是配乐取舍，不是促醒或提升注意力的疗效结论。

混音循环包含前一段释放与混响尾音，不插入首尾静音；编码为 32 kHz / 96 kbps MP3，约 1.15 MB。测得编码后整体响度约 −18.2 LUFS、真峰值约 −8.2 dBFS、响度范围约 3.3 LU。默认网页音量 40%，实际增益 0.28；规则和休息时再降至 55%。音频在第一次开始练习或试听时才下载，Web Audio 只维持一个循环声源，暂停保留播放位置。无第三方音乐请求。

## 视觉素材

2026-11-05。使用内置 imagegen 工具生成，未使用 API / CLI 生图。图片模拟油画笔触，并非实体油画的拍摄记录。构图来自本项目原有 SVG；三套配色保留现有配色关系，色值作为生成参考，不声称逐像素准确。

| 文件 | 用途 | 网页尺寸 |
| --- | --- | --- |
| atelier-paper.webp | 纸上晴日主画面 | 1000 × 1078 |
| atelier-earth.webp | 陶土午后主画面 | 1000 × 1078 |
| atelier-sea.webp | 海边来信主画面 | 1000 × 1078 |
| brush-texture.webp | 预览卡、调色按钮、序光棋盘和暂停页的表面纹理 | 700 × 700 |
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
