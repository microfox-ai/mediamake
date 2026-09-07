import { getCanvasOp } from '../registry';
import {
  CanvasAssets,
  CanvasFrameInfo,
  CanvasOpDefinition,
  CanvasOpNode,
} from '../types';
import { combineSeed, hashString, mulberry32 } from './random';
import { resolveParams } from './params';
import { resolveOpProgress } from './timing';

/**
 * Pipeline executor: walks CanvasOpNode trees, resolves ops from the
 * registry, and draws. Split into an async init pass (heavy precompute,
 * cached, run behind delayRender) and a synchronous per-frame apply pass.
 */

// Schema-parsed params cached per node object (pipeline JSON is stable
// between renders; parsing zod schemas per frame per node would be waste).
const parsedParamsCache = new WeakMap<CanvasOpNode, any>();

const parseNodeParams = (def: CanvasOpDefinition, node: CanvasOpNode): any => {
  const cached = parsedParamsCache.get(node);
  if (cached !== undefined) return cached;

  let parsed = node.params ?? {};
  if (def.schema) {
    const result = (def.schema as any).safeParse(node.params ?? {});
    if (result.success) {
      parsed = result.data;
    } else {
      console.warn(
        `canvas op '${node.op}': invalid params, using raw values`,
        result.error
      );
    }
  }
  parsedParamsCache.set(node, parsed);
  return parsed;
};

const warnedOps = new Set<string>();
const warnMissingOp = (name: string) => {
  if (warnedOps.has(name)) return;
  warnedOps.add(name);
  console.warn(`canvas op '${name}' not found in registry`);
};

/** Reusable offscreen canvases for captureChildren, pooled per pipeline. */
export class ScratchPool {
  private pool: HTMLCanvasElement[] = [];
  private inUse = 0;

  acquire(width: number, height: number): HTMLCanvasElement {
    let canvas = this.pool[this.inUse];
    if (!canvas) {
      canvas = document.createElement('canvas');
      this.pool[this.inUse] = canvas;
    }
    this.inUse++;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const g = canvas.getContext('2d');
    g?.clearRect(0, 0, width, height);
    return canvas;
  }

  release(count: number) {
    this.inUse = Math.max(0, this.inUse - count);
  }
}

export interface PipelineEnv {
  frame: CanvasFrameInfo;
  assets: CanvasAssets;
  seed: number;
  states: Map<string, any>;
  scratch: ScratchPool;
}

/**
 * Run the init pass: every op with an `init` gets its state computed and
 * stored keyed by node path. Await this behind delayRender before drawing.
 */
export const initPipeline = async (
  nodes: CanvasOpNode[],
  env: Omit<PipelineEnv, 'states' | 'scratch'>
): Promise<Map<string, any>> => {
  const states = new Map<string, any>();

  const walk = async (list: CanvasOpNode[], prefix: string) => {
    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      const path = prefix ? `${prefix}.${i}` : `${i}`;
      const def = getCanvasOp(node.op);
      if (!def) {
        warnMissingOp(node.op);
        continue;
      }
      if (def.init) {
        const params = parseNodeParams(def, node);
        const nodeSeed = combineSeed(env.seed, hashString(path));
        try {
          states.set(
            path,
            await def.init({
              params,
              width: env.frame.width,
              height: env.frame.height,
              fps: env.frame.fps,
              durationInFrames: env.frame.durationInFrames,
              assets: env.assets,
              random: mulberry32(nodeSeed),
              seed: nodeSeed,
            })
          );
        } catch (err) {
          console.warn(`canvas op '${node.op}' init failed`, err);
        }
      }
      if (node.children?.length) await walk(node.children, path);
    }
  };

  await walk(nodes, '');
  return states;
};

/** Draw one frame of the pipeline into `g`. Synchronous and pure. */
export const executePipeline = (
  g: CanvasRenderingContext2D,
  nodes: CanvasOpNode[],
  env: PipelineEnv,
  pathPrefix = ''
): void => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = pathPrefix ? `${pathPrefix}.${i}` : `${i}`;
    const def = getCanvasOp(node.op);
    if (!def) {
      warnMissingOp(node.op);
      continue;
    }
    if (def.init && !env.states.has(path)) {
      // Init failed or has not completed; skip rather than draw garbage.
      continue;
    }

    const baseParams = parseNodeParams(def, node);
    const progress = resolveOpProgress(node.timing, env.frame);
    const params = resolveParams(baseParams, node.ranges, progress);
    const nodeSeed = combineSeed(env.seed, hashString(path));

    let capturedCount = 0;
    const renderChildren = () => {
      if (node.children?.length) {
        executePipeline(g, node.children, env, path);
      }
    };
    const captureChildren = (): HTMLCanvasElement => {
      const canvas = env.scratch.acquire(
        env.frame.width,
        env.frame.height
      );
      capturedCount++;
      const cg = canvas.getContext('2d');
      if (cg && node.children?.length) {
        executePipeline(cg, node.children, env, path);
      }
      return canvas;
    };

    g.save();
    try {
      def.apply({
        g,
        params,
        state: env.states.get(path),
        progress,
        frame: env.frame,
        assets: env.assets,
        random: mulberry32(nodeSeed),
        seed: nodeSeed,
        renderChildren,
        captureChildren,
      });
    } catch (err) {
      console.warn(`canvas op '${node.op}' apply failed`, err);
    } finally {
      g.restore();
      env.scratch.release(capturedCount);
    }
  }
};
