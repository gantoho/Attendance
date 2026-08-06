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
    const vv = computeVV();
    // 过滤键盘：当键盘弹出时，visualViewport.height 会显著变小
    const keyboardLikely =
      (window as any).visualViewport &&
      (window.innerHeight - (window as any).visualViewport.height) > Math.max(140, window.innerHeight * 0.22);

    // 顶部：若 env 不可用且 vv.top 在合理范围(2-100px)，使用 vv.top
    if (top === 0) {
      if (vv.top >= 2 && vv.top <= 100) top = vv.top;
    }
    // 底部：若 env 不可用且非键盘场景，vv.bottom 在合理范围(2-100px)时使用
    if (bottom === 0 && !keyboardLikely) {
      if (vv.bottom >= 2 && vv.bottom <= 100) bottom = vv.bottom;
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
