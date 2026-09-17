/** Resolve an Images SDK base URL without changing the configured host or region. */
export function resolveImageEndpoint(baseUrl: string, model: string) {
  const url = new URL(baseUrl);
  const path = url.pathname.replace(/\/+$/, '');
  const isImagesApi = /\/v1(?:\/images\/generations)?$/.test(path);
  // Token Plan exposes image models through dedicated DashScope routes.
  // Keep the package host: moving to dashscope.aliyuncs.com changes billing/auth.
  if (/^token-plan\.[a-z0-9-]+\.maas\.aliyuncs\.com$/.test(url.hostname) && isImagesApi) {
    const async = /^qwen-image-3\.0(?:-|$)/.test(model);
    url.pathname = `/api/v1/services/aigc/${async ? 'image-generation' : 'multimodal-generation'}/generation`;
    return { url: url.toString(), protocol: async ? 'dashscope-async' : 'dashscope' } as const;
  }
  if (path === '/api/v1/services/aigc/image-generation/generation') {
    url.pathname = path;
    return { url: url.toString(), protocol: 'dashscope-async' } as const;
  }
  if (isImagesApi) {
    url.pathname = path.endsWith('/images/generations') ? path : `${path}/images/generations`;
  }
  return { url: isImagesApi ? url.toString() : baseUrl, protocol: isImagesApi ? 'images' : 'dashscope' } as const;
}
