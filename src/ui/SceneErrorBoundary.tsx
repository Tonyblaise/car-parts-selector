import { Component, type ReactNode } from 'react';
import { NoWebGLFallback } from './NoWebGLFallback';

interface State {
  failed: boolean;
}

/** If the 3D scene throws, fall back to the list-only experience (FR-023, research R6). */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.warn('3D view failed; using the list only.', error);
  }

  override render() {
    return this.state.failed ? <NoWebGLFallback /> : this.props.children;
  }
}
