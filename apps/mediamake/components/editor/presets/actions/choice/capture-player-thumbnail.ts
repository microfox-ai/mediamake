"use client";

import type { PlayerRef } from "@remotion/player";
import { usePlayerRefStore } from "@/components/editor_main/stores/player-ref-store";

const THUMBNAIL_WIDTH = 320;

type PlayerWithContainer = PlayerRef & {
  getContainerNode?: () => HTMLElement | null;
};

function canvasToJpeg(source: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    source.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the thumbnail"))),
      "image/jpeg",
      quality,
    );
  });
}

function scaleCanvas(source: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  if (source.width <= maxWidth) return source;
  const scale = maxWidth / source.width;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(source.width * scale));
  out.height = Math.max(1, Math.round(source.height * scale));
  const ctx = out.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

function resolvePlayerContainer(): HTMLElement | null {
  const player = usePlayerRefStore.getState().playerRef.current as PlayerWithContainer | null;
  const fromRef = player?.getContainerNode?.();
  if (fromRef) return fromRef;
  return document.querySelector("[data-editor-player]");
}

function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

async function snapshotPlayerDom(container: HTMLElement): Promise<HTMLCanvasElement | null> {
  const rect = container.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;

  const scale = Math.min(1, THUMBNAIL_WIDTH / rect.width);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(rect.width * scale));
  out.height = Math.max(1, Math.round(rect.height * scale));
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  const bg = getComputedStyle(container).backgroundColor;
  ctx.fillStyle = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" ? bg : "#000";
  ctx.fillRect(0, 0, out.width, out.height);

  const layers = Array.from(container.querySelectorAll("canvas, video, img, svg"));
  let drew = false;
  for (const el of layers) {
    const box = el.getBoundingClientRect();
    const dx = (box.left - rect.left) * scale;
    const dy = (box.top - rect.top) * scale;
    const dw = box.width * scale;
    const dh = box.height * scale;
    if (dw < 1 || dh < 1) continue;
    try {
      if (el instanceof HTMLCanvasElement && el.width > 0 && el.height > 0) {
        ctx.drawImage(el, dx, dy, dw, dh);
        drew = true;
      } else if (el instanceof HTMLVideoElement && el.readyState >= 2) {
        ctx.drawImage(el, dx, dy, dw, dh);
        drew = true;
      } else if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) {
        ctx.drawImage(el, dx, dy, dw, dh);
        drew = true;
      } else if (el instanceof SVGSVGElement) {
        const image = await svgToImage(el);
        if (image) {
          ctx.drawImage(image, dx, dy, dw, dh);
          drew = true;
        }
      }
    } catch {
      // Cross-origin media taints the canvas; skip that layer.
    }
  }
  return drew ? out : null;
}

/**
 * Snapshot the visible editor player at its current frame.
 * Uses the live canvas when Remotion has one; otherwise composites video, images and SVG.
 */
export async function capturePlayerThumbnail(): Promise<Blob | null> {
  const container = resolvePlayerContainer();
  if (!container) return null;
  const composite = await snapshotPlayerDom(container);
  if (!composite) return null;
  return canvasToJpeg(scaleCanvas(composite, THUMBNAIL_WIDTH));
}
