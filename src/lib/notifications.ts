// Helper for Native OS Desktop Notifications and Service Worker Notifications

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

export async function showDesktopFloatingWindow(
  sender: string,
  text: string,
  onOpenChat: () => void
) {
  if (typeof window === 'undefined') return;

  // Request permission if default
  if ('Notification' in window && Notification.permission === 'default') {
    requestNotificationPermission().catch(() => {});
  }

  const title = `💬 Нове повідомлення від ${sender}`;

  // 1. Try Service Worker Notification (Works when backgrounded or minimized without user gesture)
  if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body: text,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `msg-${Date.now()}`,
          data: { url: window.location.href },
          requireInteraction: true,
        });
        return;
      }
    } catch (err) {
      console.warn('Service Worker notification failed, falling back to Notification API:', err);
    }
  }

  // 2. Fallback to Native HTML5 Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: text,
        icon: '/icon-192.png',
        tag: `msg-${Date.now()}`,
        requireInteraction: true,
      });

      notif.onclick = (e) => {
        e.preventDefault();
        window.focus();
        onOpenChat();
        notif.close();
      };
      return;
    } catch (err) {
      console.warn('HTML5 Notification failed:', err);
    }
  }
}
