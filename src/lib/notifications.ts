// Helper for True OS Desktop Floating Windows and Native Notifications

export async function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  }
}

export async function showDesktopFloatingWindow(
  sender: string,
  text: string,
  onOpenChat: () => void
) {
  if (typeof window === 'undefined') return;

  const initialLetter = (sender[0] || 'U').toUpperCase();

  // 1. Try Document Picture-in-Picture API (Chrome 116+ / Edge 116+ / Modern Browsers)
  if ('documentPictureInPicture' in window) {
    try {
      const dpip = (window as unknown as { documentPictureInPicture: { requestWindow: (opts: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
      const pipWindow = await dpip.requestWindow({
        width: 360,
        height: 110,
      });

      pipWindow.document.body.innerHTML = `
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
          body {
            background: #09090b;
            color: #f4f4f5;
            display: flex;
            align-items: center;
            padding: 14px;
            height: 100vh;
            cursor: pointer;
            user-select: none;
            overflow: hidden;
            border: 1px solid #27272a;
            border-radius: 12px;
          }
          .avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981, #14b8a6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            color: #fff;
            flex-shrink: 0;
            margin-right: 12px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          .content { flex: 1; min-width: 0; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
          .sender { font-size: 13px; font-weight: 600; color: #f4f4f5; }
          .time { font-size: 10px; color: #71717a; }
          .text { font-size: 12px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .close { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #71717a; font-size: 14px; cursor: pointer; padding: 4px; }
          .close:hover { color: #fff; }
        </style>
        <div class="avatar">${initialLetter}</div>
        <div class="content">
          <div class="header">
            <span class="sender">${sender}</span>
            <span class="time">Зараз</span>
          </div>
          <div class="text">${text}</div>
        </div>
        <button class="close" id="closeBtn">✕</button>
      `;

      pipWindow.document.body.onclick = (e: MouseEvent) => {
        if ((e.target as HTMLElement).id === 'closeBtn') {
          pipWindow.close();
          return;
        }
        window.focus();
        onOpenChat();
        pipWindow.close();
      };

      setTimeout(() => {
        try { pipWindow.close(); } catch {}
      }, 6000);
      return;
    } catch (e) {
      console.warn('DocPiP window opening error:', e);
    }
  }

  // 2. Fallback: window.open floating OS popup
  try {
    const width = 360;
    const height = 110;
    const left = window.screen.width - width - 20;
    const top = 40;

    const popup = window.open(
      '',
      'nexus_notif_' + Date.now(),
      `width=${width},height=${height},left=${left},top=${top},resizable=no,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
    );

    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Нове повідомлення</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
              body {
                background: #09090b;
                color: #f4f4f5;
                display: flex;
                align-items: center;
                padding: 14px;
                height: 100vh;
                cursor: pointer;
                user-select: none;
                overflow: hidden;
              }
              .avatar {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: linear-gradient(135deg, #10b981, #14b8a6);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 18px;
                color: #fff;
                flex-shrink: 0;
                margin-right: 12px;
              }
              .content { flex: 1; min-width: 0; }
              .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
              .sender { font-size: 13px; font-weight: 600; color: #f4f4f5; }
              .time { font-size: 10px; color: #71717a; }
              .text { font-size: 12px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .close { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #71717a; font-size: 14px; cursor: pointer; }
              .close:hover { color: #fff; }
            </style>
          </head>
          <body>
            <div class="avatar">${initialLetter}</div>
            <div class="content">
              <div class="header">
                <span class="sender">${sender}</span>
                <span class="time">Зараз</span>
              </div>
              <div class="text">${text}</div>
            </div>
            <button class="close" id="closeBtn">✕</button>
            <script>
              document.body.onclick = function(e) {
                if (e.target.id === 'closeBtn') {
                  window.close();
                  return;
                }
                if (window.opener && !window.opener.closed) {
                  window.opener.focus();
                }
                window.close();
              };
              setTimeout(function() { window.close(); }, 6000);
            </script>
          </body>
        </html>
      `);
      popup.document.close();
      return;
    }
  } catch (e) {}

  // 3. Fallback: Native OS Desktop Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(`Нове повідомлення від ${sender}`, {
        body: text,
        tag: `msg-${Date.now()}`,
      });
      notif.onclick = () => {
        window.focus();
        onOpenChat();
        notif.close();
      };
    } catch (e) {}
  }
}
