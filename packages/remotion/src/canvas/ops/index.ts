/**
 * Canvas op standard library. Importing this module registers every
 * built-in op. Op families:
 *
 *  sources    draw:image · draw:text · draw:shape · draw:gradient
 *  structure  group (transform/opacity/blend container)
 *  reveals    clip:reveal (wipe/radial, straight/organic/burn edges)
 *             mask:content-aware (color/luminance-ordered pixel reveal)
 *  systems    particles (formation morphing: images, text, scatter)
 *  treatment  glitch (rgb-shift/slice/blocks/static/scan)
 *  post       post:glow · post:vignette · post:grain · post:scanlines · embers
 */
import './draw';
import './clip';
import './mask';
import './particles';
import './glitch';
import './post';
