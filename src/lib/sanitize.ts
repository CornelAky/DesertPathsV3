const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';

  return text.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';

  const trimmed = url.trim();

  if (trimmed.toLowerCase().startsWith('javascript:') ||
      trimmed.toLowerCase().startsWith('data:') ||
      trimmed.toLowerCase().startsWith('vbscript:')) {
    return '';
  }

  return trimmed;
}

export function sanitizeNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;

  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return num;
}

export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';

  const trimmed = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return '';
  }

  return trimmed;
}

export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';

  const cleaned = phone.replace(/[^\d\s\-\+\(\)]/g, '');

  return cleaned.trim();
}

export function sanitizeMultiline(text: string | null | undefined, maxLines: number = 100): string {
  if (!text) return '';

  const sanitized = sanitizeText(text);
  const lines = sanitized.split('\n');

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n');
  }

  return sanitized;
}

export function sanitizeFileName(fileName: string | null | undefined): string {
  if (!fileName) return '';

  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function validateAndSanitizeInput(
  value: string | null | undefined,
  type: 'text' | 'email' | 'phone' | 'url' | 'numeric' | 'multiline' = 'text',
  options?: { maxLength?: number; maxLines?: number }
): string | number | null {
  let sanitized: string | number | null;

  switch (type) {
    case 'email':
      sanitized = sanitizeEmail(value);
      break;
    case 'phone':
      sanitized = sanitizePhone(value);
      break;
    case 'url':
      sanitized = sanitizeUrl(value);
      break;
    case 'numeric':
      sanitized = sanitizeNumeric(value);
      break;
    case 'multiline':
      sanitized = sanitizeMultiline(value, options?.maxLines);
      break;
    case 'text':
    default:
      sanitized = sanitizeText(value);
      break;
  }

  if (typeof sanitized === 'string' && options?.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }

  return sanitized;
}
