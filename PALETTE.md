# Future Buddy Color Palettes

## Palette 2 - Reflective Iridescent (CURRENT)

*Inspired by Will's artwork - reflective outlines that catch surrounding colors*

### Reference Images
- `assets/inspiration/palette-background.jpg` - Dreamy color flow
- `assets/inspiration/reflective-outline-graffiti.jpg` - Reflective outline technique
- `assets/inspiration/nebula-blend.jpg` - Nebula color blending

### Core Colors

| Name | Hex | Used For |
|------|-----|----------|
| Electric Cyan | `#00F0FF` | Primary glow, cool anchor |
| Hot Magenta | `#FF00FF` | Energy, accent |
| Sunset Pink | `#FF6EC7` | Warm highlights |
| Vivid Purple | `#AA00FF` | Depth, shadows |
| Solar Yellow | `#FFEE00` | Pop highlights |
| Void Black | `#000000` | Base, grounding |

### Icon Recolor Guide

To recolor the Future Buddy icon with this palette:

```
BACKGROUND STAR:
- Current: Blue/Violet gradient
- New: Void Black (#000000) solid OR
       Dark gradient from #1A0033 (deep purple-black) to #000000

ABSTRACT SHAPE (Purple swoosh):
- Current: Purple/Magenta gradient
- New: Keep similar but shift to #AA00FF -> #FF00FF gradient

OUTLINE/STROKE (the reflective border):
- Current: Single color
- New: GRADIENT STROKE cycling through:
  #00F0FF (cyan) -> #FF6EC7 (pink) -> #FFEE00 (yellow) -> #AA00FF (purple) -> #00F0FF
  This creates the "reflective" effect

CENTER BADGE (green circle):
- Current: Green with person icon
- New: Could keep green OR shift to cyan #00F0FF for cohesion

BADGE ICON STROKE:
- Current: Dark stroke
- New: Void Black #000000
```

### CSS Variables
```css
:root {
  /* Palette 2 - Reflective Iridescent */
  --fb-cyan: #00F0FF;
  --fb-magenta: #FF00FF;
  --fb-pink: #FF6EC7;
  --fb-purple: #AA00FF;
  --fb-yellow: #FFEE00;
  --fb-black: #000000;

  /* Gradient for reflective outlines */
  --fb-reflect-gradient: linear-gradient(
    90deg,
    #00F0FF 0%,
    #FF6EC7 25%,
    #FFEE00 50%,
    #AA00FF 75%,
    #00F0FF 100%
  );
}
```

### Design Philosophy
- **Reflective Outlines**: Borders shimmer with multiple colors, like light catching glass
- **Black Grounds Neon**: Deep black makes vibrant colors pop
- **Dreamy Flow**: Colors blend organically, no harsh transitions
- **Iridescent Energy**: UI feels alive, shifting, futuristic

### Theme
Futuristic + Graffiti + Ethereal

---

## Palette 1 - Original (OLD)

| Name | Hex | Used For |
|------|-----|----------|
| Intense Cyan | `#00F0FF` | Icon background (gradient center) |
| Dark Violet | `#220066` | Icon background (gradient edge) |
| Deep Purple | `#8800FF` | Icon color (gradient start) |
| Magenta Purple | `#CC00FF` | Icon color (gradient end) |
| Purple-Black | `#100820` | Icon frame |
| Neon Green | `#71FF00` | Badge text |
| Badge Background | `#179620` | Badge background |
| Border Green | `#00FF4A` | Caption border, UI borders |
| Icon Stroke | `#00FF38` | Icon outline stroke |

### CSS Variables (Old)
```css
:root {
  --fb-cyan: #00F0FF;
  --fb-violet: #220066;
  --fb-purple: #8800FF;
  --fb-magenta: #CC00FF;
  --fb-frame: #100820;
  --fb-badge-text: #71FF00;
  --fb-badge-bg: #179620;
  --fb-border: #00FF4A;
  --fb-icon-stroke: #00FF38;
}
```
