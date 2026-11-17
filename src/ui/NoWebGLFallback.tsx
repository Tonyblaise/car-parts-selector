export const NO_WEBGL_MESSAGE = '3D view is not available here. Use the list.';

export function NoWebGLFallback({ message = NO_WEBGL_MESSAGE }: { message?: string }) {
  return (
    <p role="status" className="viewer-message">
      {message}
    </p>
  );
}
