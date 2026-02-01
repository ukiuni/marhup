/**
 * Animation XML generation for PPTX
 */

import type { AnimationConfig } from '../types/index.js';

export interface SlideObjectAnimation {
  objectIndex: number;
  animation: AnimationConfig;
}

/**
 * Create timing XML for slide animations
 */
export function createTimingXml(animations: SlideObjectAnimation[]): string {
  if (animations.length === 0) return '';

  let xml = '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>';

  // Add animations
  animations.forEach((anim, index) => {
    const animId = index + 2; // Start from 2
    xml += createAnimationXml(anim, animId);
  });

  xml += '</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>';

  return xml;
}

/**
 * Create XML for a single animation
 */
function createAnimationXml(slideAnim: SlideObjectAnimation, animId: number): string {
  const { animation, objectIndex } = slideAnim;
  const { trigger = 'onClick', duration = 1000, delay = 0 } = animation;

  let xml = `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${animId}" dur="${duration}ms" fill="hold">`;

  // Trigger
  if (trigger === 'onClick') {
    xml += `<p:stCondLst><p:cond delay="0"><p:tgtEl><p:spTgt spid="${objectIndex + 1}"/></p:tgtEl></p:cond></p:stCondLst>`;
  } else if (trigger === 'withPrevious') {
    xml += '<p:prevCondLst><p:cond delay="0"/></p:prevCondLst>';
  } else if (trigger === 'afterPrevious') {
    xml += `<p:prevCondLst><p:cond delay="${delay}ms"/></p:prevCondLst>`;
  }

  xml += `<p:childTnLst><p:par><p:cTn id="${animId + 1}" fill="hold"><p:childTnLst>`;

  // Animation effect
  xml += createEffectXml(animation, objectIndex);

  xml += '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:seq>';

  return xml;
}

/**
 * Create effect XML based on animation type
 */
function createEffectXml(animation: AnimationConfig, objectIndex: number): string {
  const { type } = animation;

  // Map animation types to preset IDs (simplified)
  const presetMap: Record<string, number> = {
    'appear': 1,
    'fadein': 10,
    'flyin': 2,
    'zoom': 17,
    'wipe': 26,
    'split': 22,
    'wheel': 21,
    'randombars': 23,
    'growshrink': 31,
    'spin': 35,
    'floatin': 4,
    'shape': 19,
    'bounce': 3,
    'pulse': 33,
    'teeter': 36,
    'blink': 32,
    'flicker': 37,
    'swivel': 38,
    'spring': 39,
  };

  const presetId = presetMap[type] || 1;

  let xml = `<p:animEffect transition="in" prstId="${presetId}">`;
  xml += `<p:cBhvr><p:cTn id="${objectIndex + 10}" dur="1000ms"><p:childTnLst/></p:cTn>`;
  xml += `<p:tgtEl><p:spTgt spid="${objectIndex + 1}"/></p:tgtEl>`;
  xml += '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>';
  xml += '</p:cBhvr></p:animEffect>';

  return xml;
}