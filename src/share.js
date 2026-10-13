const FILE_NAME = 'kava-podyaka.png';

export function makeFile(blob) {
  return new File([blob], FILE_NAME, { type: 'image/png' });
}

/** Web Share з файлами: лише в secure context (HTTPS або localhost) і не в усіх браузерах. */
export function canShareFile(file) {
  try {
    return (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

/** Викликати синхронно з обробника кліку. Повертає 'shared' | 'cancelled', інші помилки кидає. */
export async function shareFile(file) {
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'; // гість закрив меню, це не помилка
    throw err;
  }
}

/** Fallback: звичайне завантаження PNG. */
export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
