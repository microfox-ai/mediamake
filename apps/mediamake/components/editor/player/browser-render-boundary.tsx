'use client';

import React from 'react';

/**
 * Captures the real error behind a failed client-side render.
 *
 * @remotion/web-renderer installs its own `onUncaughtError` and only inspects it
 * inside `waitForRenderReady()`. When the composition throws on a later frame,
 * React tears the root down and the render loop's next `collectAssets.current`
 * access fails first, masking the actual cause.
 */
export type RenderErrorHolder = {
  error: Error | null;
  componentStack: string | null;
};

class CaptureBoundary extends React.Component<
  {
    holder: RenderErrorHolder;
    onError: () => void;
    children: React.ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (!this.props.holder.error) {
      this.props.holder.error = error;
      this.props.holder.componentStack = info?.componentStack ?? null;
    }
    this.props.onError();
  }

  render() {
    // The caller checks the holder and throws, so no blank frame is encoded.
    return this.state.failed ? null : this.props.children;
  }
}

/** Wraps a composition so render errors land in `holder`; `onError` aborts. */
export function withRenderErrorCapture<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  holder: RenderErrorHolder,
  onError: () => void
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <CaptureBoundary holder={holder} onError={onError}>
      <Component {...props} />
    </CaptureBoundary>
  );
  Wrapped.displayName = `withRenderErrorCapture(${
    Component.displayName || Component.name || 'Composition'
  })`;
  return Wrapped;
}

/** Builds a message that names the real failure instead of the masked symptom. */
export function describeRenderError(
  thrown: unknown,
  holder: RenderErrorHolder
): string {
  const thrownMessage =
    thrown instanceof Error ? thrown.message : String(thrown ?? 'Render failed');

  if (!holder.error) return thrownMessage;

  const stackHint = holder.componentStack
    ?.split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' < ');

  return stackHint
    ? `${holder.error.message} (in ${stackHint})`
    : holder.error.message;
}
