// Characters that take the scene light (R3KNRF, 2026-11-11). Optional: new Player(..., { lit: true }).
// From the reference study (lighting.md 9.2 cardShade, ported to our unlit character cards):
//   - the card is tinted by the colour of the scene light (warm by day, orange at sunset, blue at night);
//   - the side away from the light is a little darker and cooler (lavender), the side toward it a little brighter;
//   - heads ~12 % darker on the far side, torsos ~17 %; faces stay light (reference heads V ~.97, never grey).
// The world sets CARD_LIGHT once per frame (applyLight in core/lights.ts does it). Old videos (no lit) are unchanged.
import * as THREE from "three";

export const CARD_LIGHT = {
  uCardTint: { value: new THREE.Vector3(1, 1, 1) },         // light colour on the characters (multiplier)
  uCardSide: { value: new THREE.Vector3(0.92, 0.9, 0.97) }, // tint of the side away from the light
  uCardGrad: { value: 0.12 },                               // how much darker that side is (head; torso x1.4)
  uSunX: { value: 0.6 },                                    // where the light comes from on screen: -1 left .. 0 front .. +1 right
};

// Where the head and the body are on a card texture (uv, v = 1 at the top) and how wide they are (half width in uv).
export type CardZone = { headV: number; headHW: number; bodyHW: number };
export const ZONE_CARD: CardZone = { headV: 0.54, headHW: 0.26, bodyHW: 0.2 };   // library 600x1000 cards (neck at row 460)
export const ZONE_HEAD: CardZone = { headV: -1, headHW: 0.26, bodyHW: 0.26 };    // head-only layers (head, hat, mouths)
export const ZONE_FACE: CardZone = { headV: -1, headHW: 0.42, bodyHW: 0.42 };    // the drawn-face layer (a square around the head)

const SHADE = /* glsl */ `
{
  vec3 cardK = uCardTint;
  #if defined( USE_MAP ) && defined( CARD_ZONED )
  {
    float head = step( CARD_HEAD_V, vMapUv.y );
    float hw = mix( CARD_BODY_HW, CARD_HEAD_HW, head );
    float uu = clamp( ( vMapUv.x - 0.5 ) / hw, -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 );   // -1..1 screen left..right
    float tt = uu * uSunX;                                                                       // +1 = edge toward the light
    float g = uCardGrad * mix( 1.4, 1.0, head ) * min( 1.0, abs( uSunX ) * 2.5 );
    float dark = smoothstep( -0.15, 0.9, -tt );
    cardK *= ( 1.0 - g * dark ) * mix( vec3( 1.0 ), uCardSide, dark * 0.6 ) * ( 1.0 + 0.04 * smoothstep( 0.0, 0.9, tt ) );
  }
  #endif
  outgoingLight *= cardK;
}
#include <envmap_fragment>
`;

/** Make a character material (MeshBasicMaterial) take the scene light. zone = null: colour tint only (arms, legs, shoes). */
export function litCard<T extends THREE.MeshBasicMaterial>(m: T, zone: CardZone | null = ZONE_CARD): T {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    Object.assign(sh.uniforms, CARD_LIGHT);
    let defs = "uniform vec3 uCardTint; uniform vec3 uCardSide; uniform float uCardGrad; uniform float uSunX;\n";
    if (zone) defs += `#define CARD_ZONED\n#define CARD_HEAD_V ${zone.headV.toFixed(3)}\n#define CARD_HEAD_HW ${zone.headHW.toFixed(3)}\n#define CARD_BODY_HW ${zone.bodyHW.toFixed(3)}\n`;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + defs).replace("#include <envmap_fragment>", SHADE);
  };
  const key = zone ? `litCard_${zone.headV}_${zone.headHW}_${zone.bodyHW}` : "litCard_flat";
  m.customProgramCacheKey = () => key;
  m.needsUpdate = true;
  return m;
}
