document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.bk-tabs button');
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('is-active'));
    tab.classList.add('is-active');
  }));

  const header = document.querySelector('header');
  const menuButton = header?.querySelector('.icons li:nth-child(2) a');
  const mobile = window.matchMedia('(max-width: 1024px)');

  menuButton?.addEventListener('click', (event) => {
    if (!mobile.matches) return;
    event.preventDefault();
    const isOpen = header.classList.toggle('is-menu-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  mobile.addEventListener('change', (event) => {
    if (event.matches) return;
    header?.classList.remove('is-menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });

  const shorts = document.querySelector('.bk-videos');
  const bookScroller = document.querySelector('.bk-youtube-list');
  const verticalControl = document.querySelector('.bk-scroll-vertical');
  const horizontalControl = document.querySelector('.bk-scroll-horizontal');

  const syncControl = (scroller, control, axis, forwardLabel, returnLabel) => {
    if (!scroller || !control) return;
    const position = axis === 'y' ? scroller.scrollTop : scroller.scrollLeft;
    const viewport = axis === 'y' ? scroller.clientHeight : scroller.clientWidth;
    const total = axis === 'y' ? scroller.scrollHeight : scroller.scrollWidth;
    const hasOverflow = total > viewport + 2;
    const atEnd = hasOverflow && position + viewport >= total - 4;
    control.classList.toggle('is-disabled', !hasOverflow);
    control.classList.toggle('is-return', atEnd);
    control.setAttribute('aria-label', atEnd ? returnLabel : forwardLabel);
  };

  const syncAllControls = () => {
    syncControl(bookScroller, verticalControl, 'y', '도서 목록 아래로 이동', '도서 목록 맨 위로 이동');
    syncControl(shorts, horizontalControl, 'x', '쇼츠 목록 오른쪽으로 이동', '쇼츠 목록 처음으로 이동');
  };

  verticalControl?.addEventListener('click', () => {
    const atEnd = verticalControl.classList.contains('is-return');
    bookScroller?.scrollTo({
      top: atEnd ? 0 : bookScroller.scrollTop + bookScroller.clientHeight * .78,
      behavior: 'smooth',
    });
  });

  horizontalControl?.addEventListener('click', () => {
    const atEnd = horizontalControl.classList.contains('is-return');
    shorts?.scrollTo({
      left: atEnd ? 0 : shorts.scrollLeft + shorts.clientWidth * .78,
      behavior: 'smooth',
    });
  });

  bookScroller?.addEventListener('scroll', syncAllControls, { passive: true });
  shorts?.addEventListener('scroll', syncAllControls, { passive: true });
  window.addEventListener('resize', syncAllControls);
  window.addEventListener('load', syncAllControls, { once: true });
  requestAnimationFrame(syncAllControls);
});
