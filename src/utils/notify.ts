import React from 'react';
import { createRoot } from 'react-dom/client';
import { Alert } from '@heroui/react';

function ensureContainer(): HTMLElement {
  let c = document.getElementById('heroui-alert-container') as HTMLElement | null;
  if (!c) {
    c = document.createElement('div');
    c.id = 'heroui-alert-container';
    Object.assign(c.style, {
      position: 'fixed',
      top: 'calc(16px + var(--safe-area-top, 0px))',
      right: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: '9999',
      maxWidth: '360px',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(c);
  }
  return c;
}

function show(type: 'success' | 'error' | 'warning', msg: string, duration: number) {
  try {
    const container = ensureContainer();
    const wrap = document.createElement('div');
    // allow hover over alert for close button, but don't block the page
    wrap.style.pointerEvents = 'auto';
    container.appendChild(wrap);
    const root = createRoot(wrap);

    const color = type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger';
    const unmount = () => {
      try {
        root.unmount();
        wrap.remove();
      } catch {}
    };
    const content = `${type === 'success' ? '成功' : type === 'warning' ? '提示' : '错误'}：${msg}`;
    try {
      root.render(
        React.createElement(
          Alert as any,
          { color: color as any, radius: 'lg', className: 'shadow-sm' },
          content
        )
      );
    } catch {
      // 如果 Alert 结构差异导致渲染失败，降级为原生容器
      const fallback = document.createElement('div');
      fallback.textContent = content;
      Object.assign(fallback.style, {
        padding: '10px 12px',
        borderRadius: '12px',
        background: color === 'success' ? '#34C759' : color === 'warning' ? '#FF9500' : '#FF3B30',
        color: '#fff',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      } as CSSStyleDeclaration);
      wrap.appendChild(fallback);
    }
    window.setTimeout(unmount, duration);
  } catch {
    alert(msg);
  }
}

export const notify = {
  success: (msg: string) => show('success', msg, 2400),
  warning: (msg: string) => show('warning', msg, 3000),
  error: (msg: string) => show('error', msg, 3600),
};
