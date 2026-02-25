import type { RenderableComponentData } from "@microfox/remotion";

const COMP_WIDTH = 1920;
const COMP_HEIGHT = 1080;

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultBounds(width = 400, height = 300) {
  return {
    left: Math.round((COMP_WIDTH - width) / 2),
    top: Math.round((COMP_HEIGHT - height) / 2),
    width,
    height,
    zIndex: 1,
  };
}

export function createImageLayer(): RenderableComponentData {
  const id = nextId("added-image");
  const bounds = defaultBounds(400, 300);
  return {
    id,
    componentId: "ImageAtom",
    type: "atom",
    data: {
      src: "",
      fit: "cover",
      style: {},
      boundaries: bounds,
      containerProps: {
        style: {
          position: "absolute",
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        },
      },
    },
    context: {
      timing: { start: 0, duration: 10 },
    },
    effects: [],
  };
}

export function createAudioLayer(): RenderableComponentData {
  const id = nextId("added-audio");
  return {
    id,
    componentId: "AudioAtom",
    type: "atom",
    data: {
      src: "",
      className: "w-full h-auto object-cover",
      fit: "cover",
      volume: 1,
      startFrom: 0,
    },
    context: {
      timing: {},
    },
    effects: [],
  };
}

export function createTextLayer(): RenderableComponentData {
  const id = nextId("added-text");
  const bounds = defaultBounds(400, 80);
  return {
    id,
    componentId: "TextAtom",
    type: "atom",
    data: {
      text: "New text",
      style: {
        fontSize: 24,
        color: "#ffffff",
      },
      font: {
        family: "Inter",
        weights: [],
      },
      boundaries: bounds,
      containerProps: {
        style: {
          position: "absolute",
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        },
      },
    },
    context: {
      timing: { start: 0, duration: 10 },
    },
    effects: [],
  };
}

export function createVideoLayer(): RenderableComponentData {
  const id = nextId("added-video");
  const bounds = defaultBounds(400, 300);
  return {
    id,
    componentId: "VideoAtom",
    type: "atom",
    data: {
      src: "",
      fit: "cover",
      loop: true,
      muted: true,
      volume: 1,
      playbackRate: 1,
      startFrom: 0,
      style: {},
      boundaries: bounds,
      containerProps: {
        style: {
          position: "absolute",
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        },
      },
    },
    context: {
      timing: { start: 0, duration: 10 },
    },
    effects: [],
  };
}

export function createLayoutNode(): RenderableComponentData {
  const id = nextId("added-layout");
  return {
    id,
    componentId: "BaseLayout",
    type: "layout",
    data: {
      containerProps: {
        style: {
          display: "flex",
          flexDirection: "row",
        },
      },
    },
    childrenData: [],
  };
}
