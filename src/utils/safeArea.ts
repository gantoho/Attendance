export function startSafeAreaWatcher() {
  const readEnv = (name: string): number => {
    const el = document.createElement('div');
    el.style.paddingTop = `env(${name})`;
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    const v = parseFloat(getComputedStyle(el).paddingTop || '0') || 0;
    el.remove();
    return v;
  };
  const computeVV = () => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return { top: 0, bottom: 0 };
    const top = Math.max(0, vv.offsetTop);
    const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    return { top, bottom };
  };
  const apply = () => {
    let top = 0;
    let bottom = 0;
    const envTop = readEnv('safe-area-inset-top');
    const envBottom = readEnv('safe-area-inset-bottom');
    if (envTop > 0) top = envTop;
    if (envBottom > 0) bottom = envBottom;
    if (top === 0 || bottom === 0) {
      const vv = computeVV();
      if (top === 0 && vv.top > 0) top = vv.top;
      if (bottom === 0 && vv.bottom > 0) bottom = vv.bottom;
    }
    document.documentElement.style.setProperty('--safe-area-top', `${Math.round(top)}px`);
    document.documentElement.style.setProperty('--safe-area-bottom', `${Math.round(bottom)}px`);
  };
  apply();
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  const onResize = () => apply();
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
  if (vv) {
    vv.addEventListener('resize', onResize, { passive: true } as any);
    vv.addEventListener('scroll', onResize, { passive: true } as any);
  }
}
