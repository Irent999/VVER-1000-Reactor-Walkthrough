/**
 * ============================================================================
 * БЕЗОПАСНОЕ РАЗРЕШЕНИЕ ОТНОСИТЕЛЬНЫХ ПУТЕЙ И БАЗОВЫХ URL АССЕТОВ
 * ============================================================================
 *
 * Гарантирует валидный второй аргумент (window.location.href) при вызове
 * `new URL(...)` и безопасный фолбэк на строковый путь при `base: './'`
 * или пустом `import.meta.env.BASE_URL`, предотвращая ошибку
 * `TypeError: Failed to construct 'URL': Invalid base URL`.
 */

function normalizeRelativeBase(rawBase?: string): string {
  const candidate = (rawBase ?? import.meta.env.BASE_URL ?? './').trim();
  if (!candidate || candidate === '.') {
    return './';
  }
  return candidate.endsWith('/') ? candidate : `${candidate}/`;
}

function getSafeDocumentBaseUrl(): string | null {
  if (typeof window === 'undefined' || !window.location?.href) {
    return null;
  }
  try {
    return new URL('./', window.location.href).href;
  } catch {
    return null;
  }
}

/**
 * Возвращает валидный абсолютный базовый URL каталога приложения (если доступен window.location.href)
 * или нормализованный относительный префикс при отсутствии окружения браузера.
 */
export function resolveAssetBaseUrl(baseOverride?: string): string {
  const normalizedBase = normalizeRelativeBase(baseOverride);
  const docBase = getSafeDocumentBaseUrl();
  if (!docBase) {
    return normalizedBase;
  }
  try {
    return new URL(normalizedBase, docBase).href;
  } catch {
    return normalizedBase;
  }
}

/**
 * Безопасно разрешает путь к ассету (модель, декодер, профиль) относительно базового URL.
 */
export function resolveAssetUrl(assetPath: string, baseOverride?: string): string {
  const cleanPath = assetPath.replace(/^\/+/, '');
  const normalizedBase = normalizeRelativeBase(baseOverride);
  const resolvedBase = resolveAssetBaseUrl(baseOverride);

  try {
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(resolvedBase)) {
      return new URL(cleanPath, resolvedBase).href;
    }
  } catch {
    // Безопасный фолбэк на относительный строковый путь
  }

  return `${normalizedBase}${cleanPath}`;
}
