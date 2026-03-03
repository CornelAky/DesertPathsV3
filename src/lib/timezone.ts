import { TIMEZONE } from './constants';

export function formatDateForRiyadh(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleString('en-US', {
    timeZone: TIMEZONE.DEFAULT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateOnlyForRiyadh(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleDateString('en-US', {
    timeZone: TIMEZONE.DEFAULT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTimeForRiyadh(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleTimeString('en-US', {
    timeZone: TIMEZONE.DEFAULT,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRiyadhDate(): Date {
  const now = new Date();

  const riyadhTime = now.toLocaleString('en-US', {
    timeZone: TIMEZONE.DEFAULT,
  });

  return new Date(riyadhTime);
}

export function convertToRiyadhTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return new Date();
  }

  const riyadhTime = dateObj.toLocaleString('en-US', {
    timeZone: TIMEZONE.DEFAULT,
  });

  return new Date(riyadhTime);
}

export function toISOStringRiyadh(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const riyadhDate = convertToRiyadhTime(dateObj);
  return riyadhDate.toISOString();
}

export function formatRelativeTimeRiyadh(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const now = getRiyadhDate();
  const diff = now.getTime() - dateObj.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const today = getRiyadhDate();
  const compareDate = convertToRiyadhTime(dateObj);

  return (
    today.getFullYear() === compareDate.getFullYear() &&
    today.getMonth() === compareDate.getMonth() &&
    today.getDate() === compareDate.getDate()
  );
}

export function isTomorrow(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const tomorrow = getRiyadhDate();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const compareDate = convertToRiyadhTime(dateObj);

  return (
    tomorrow.getFullYear() === compareDate.getFullYear() &&
    tomorrow.getMonth() === compareDate.getMonth() &&
    tomorrow.getDate() === compareDate.getDate()
  );
}

export function formatFriendlyDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  if (isToday(dateObj)) {
    return `Today at ${formatTimeForRiyadh(dateObj)}`;
  }

  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${formatTimeForRiyadh(dateObj)}`;
  }

  return dateObj.toLocaleDateString('en-US', {
    timeZone: TIMEZONE.DEFAULT,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
