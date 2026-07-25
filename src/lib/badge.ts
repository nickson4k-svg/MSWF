/**
 * App Badge and Favicon Unread Counter Manager
 * Supports Native PWA App Badge API, Dynamic Document Title, and Canvas Favicon Badges
 */

let currentUnreadCount = 0;
let originalTitle = 'ALa Chat';
let originalFaviconHref = '/icon-192.png';
let isInitialized = false;

function initBadgeSystem() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;
  originalTitle = document.title || 'ALa Chat';

  const linkEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (linkEl && linkEl.href) {
    originalFaviconHref = linkEl.href;
  }

  // Clear badge when window gets focus if desired or reset title
  window.addEventListener('focus', () => {
    // Optionally reset if tab is focused in chat room
  });
}

function updateDynamicFavicon(count: number) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let linkEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (!linkEl) {
    linkEl = document.createElement('link');
    linkEl.rel = 'icon';
    document.head.appendChild(linkEl);
  }

  if (count <= 0) {
    linkEl.href = originalFaviconHref;
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = originalFaviconHref;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw base icon
    ctx.drawImage(img, 0, 0, 64, 64);

    // Badge circle background (Discord/iOS Red)
    const badgeText = count > 99 ? '99+' : count.toString();
    const badgeWidth = badgeText.length > 2 ? 34 : 26;
    const x = 64 - badgeWidth / 2 - 2;
    const y = 16;
    const radius = 13;

    ctx.beginPath();
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // White border around badge circle
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, x, y + 1);

    linkEl.href = canvas.toDataURL('image/png');
  };
}

/**
 * Set exact unread count on App Badge and Document Title
 */
export function setUnreadBadgeCount(count: number) {
  if (typeof window === 'undefined') return;
  initBadgeSystem();

  currentUnreadCount = Math.max(0, count);

  // 1. Native PWA App Badge API
  if ('setAppBadge' in navigator) {
    if (currentUnreadCount > 0) {
      navigator.setAppBadge(currentUnreadCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  // 2. Document Title Badge
  if (currentUnreadCount > 0) {
    document.title = `(${currentUnreadCount}) ${originalTitle}`;
  } else {
    document.title = originalTitle;
  }

  // 3. Dynamic Favicon Badge
  updateDynamicFavicon(currentUnreadCount);
}

/**
 * Increment unread badge count by 1
 */
export function incrementUnreadBadge() {
  setUnreadBadgeCount(currentUnreadCount + 1);
}

/**
 * Clear unread badge completely
 */
export function clearUnreadBadge() {
  setUnreadBadgeCount(0);
}

/**
 * Get current unread count
 */
export function getUnreadBadgeCount() {
  return currentUnreadCount;
}
