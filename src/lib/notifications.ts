// Helper for Native OS Desktop Notifications and Service Worker Notifications

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    registerWebPush().catch(() => {});
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      registerWebPush().catch(() => {});
    }
    return permission;
  } catch {
    return Notification.permission;
  }
}

export async function registerWebPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
  } catch (err) {
    console.warn('Web push subscription failed:', err);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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
