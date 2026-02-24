document.addEventListener('DOMContentLoaded', () => {
  // 헤더: 아래로 스크롤하면 숨기고, 위로 스크롤하면 다시 보이기
  const initHeaderAutoHide = () => {
  const header = document.querySelector('header');
  if (!header) return;

  const HIDE_CLASS = 'is-hidden';
  const DELTA = 20; // 이 픽셀 이상 움직일 때만 반응(잔떨림 방지)

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;

    // 메뉴 열려있으면 자동 숨김 로직 중지
    if (header.classList.contains('is-menu-open')) {
      header.classList.remove(HIDE_CLASS);
      lastY = y;
      ticking = false;
      return;
    }

    // 최상단이면 무조건 보이게
    if (y <= 0) {
      header.classList.remove(HIDE_CLASS);
      lastY = y;
      ticking = false;
      return;
    }

    const diff = y - lastY;

    // 너무 작은 움직임은 무시
    if (Math.abs(diff) < DELTA) {
      ticking = false;
      return;
    }

    // diff > 0 : 아래로 스크롤 -> 숨김
    // diff < 0 : 위로 스크롤 -> 표시
    if (diff > 0) header.classList.add(HIDE_CLASS);
    else header.classList.remove(HIDE_CLASS);

    lastY = y;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
};

// 헤더 햄버거 메뉴(태블릿/모바일): 클릭 시 서브메뉴 패널 내려오기
const initHeaderMenu = () => {
  const header = document.querySelector('header');
  if (!header) return;

  const nav = header.querySelector('nav');
  const burger = header.querySelector('.icons ul li:nth-child(2) a'); // 2번째 아이콘을 햄버거로 사용
  if (!nav || !burger) return;

  const mq = window.matchMedia('(max-width: 1024px)');
  const isResponsive = () => mq.matches;

  const openMenu = () => {
    header.classList.add('is-menu-open');
    header.classList.remove('is-hidden'); // 열릴 때 숨김 방지
    burger.setAttribute('aria-expanded', 'true');
  };

  const closeMenu = () => {
    header.classList.remove('is-menu-open');
    burger.setAttribute('aria-expanded', 'false');
  };

  // 초기 aria
  burger.setAttribute('aria-label', '메뉴');
  burger.setAttribute('aria-expanded', 'false');

  burger.addEventListener('click', (e) => {
    // 데스크톱에서는 user 아이콘으로 남겨두고, 반응형에서만 메뉴 토글
    e.preventDefault();
    if (!isResponsive()) return;

    if (header.classList.contains('is-menu-open')) closeMenu();
    else openMenu();
  });

  // 바깥 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!header.classList.contains('is-menu-open')) return;
    const t = e.target;
    if (burger.contains(t) || nav.contains(t)) return;
    closeMenu();
  });

  // ESC로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // 리사이즈로 데스크톱 넘어가면 닫기
  const onChange = () => {
    if (!isResponsive()) closeMenu();
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);

  // 메뉴 내부 링크 클릭하면 닫기
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (isResponsive()) closeMenu();
  });
};

  // 메인비주얼 swiper
  const initMainVisual = () => {
    const mainSwiperEl = document.querySelector('.main_visual .swiper');
    if (!mainSwiperEl || typeof Swiper === 'undefined') return;

    const totalSlides = document.querySelectorAll('.main_visual .swiper-slide').length;
    const progressFill = document.querySelector('.progress_fill');

    const updateProgress = (realIndex) => {
      if (!progressFill || !totalSlides) return;
      progressFill.style.width = ((realIndex + 1) / totalSlides * 100) + '%';
    };

    const mainSlide = new Swiper('.main_visual .swiper', {
      loop: true,
      autoplay: {
        delay: 5500,
        disableOnInteraction: false,
      },
      navigation: {
        nextEl: '.main_visual .pager .right',
        prevEl: '.main_visual .pager .left',
      },
      on: {
        init: function () {
          updateProgress(this.realIndex);
        },
        slideChange: function () {
          updateProgress(this.realIndex);
        },
      },
    });

    // pager 숫자 업데이트
    const numEl = document.querySelector('.main_visual .pager .txt_box .num');
    const totalEl = document.querySelector('.main_visual .pager .txt_box span:last-of-type');
    if (numEl && totalEl) {
      const getTotal = () => mainSlide.slidesEl.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length;
      const setPager = () => {
        numEl.textContent = String(mainSlide.realIndex + 1);
        totalEl.textContent = String(getTotal());
      };
      setPager();
      mainSlide.on('slideChange', setPager);
    }
  };

  const initAOS = () => {
    if (!window.AOS) return;
    AOS.init({
      duration: 650,
      offset: 90,
      once: true,
      easing: 'ease-out',
    });
  };

  // new 섹션
  const initNewSection = () => {
    const section = document.querySelector('section.new');
    if (!section) return;

    const viewport = section.querySelector('.new_viewport');
    const track = section.querySelector('.new_track');
    if (!viewport || !track) return;

    if (track.dataset.loopReady === '1') return;
    track.dataset.loopReady = '1';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const originals = Array.from(track.children);
    const originalCount = originals.length;
    if (originalCount < 2) return;

    const makeClones = () => {
      const frag = document.createDocumentFragment();
      originals.forEach((node) => frag.appendChild(node.cloneNode(true)));
      return frag;
    };
    track.insertBefore(makeClones(), track.firstChild);
    track.appendChild(makeClones());

    // 속도/멈춤 시간
    const speedPxPerSec = 70;
    const pauseMs = 2000;

    let step = 0;
    let loopWidth = 0;
    let baseOffset = 0;

    let progress = 0;
    let nextIndex = 1;
    let nextStop = 0;
    let pausedUntil = performance.now() + pauseMs;
    let lastTime = performance.now();

    let dragging = false;
    let isHoveringCard = false;
    let dragStartX = 0;
    let dragStartProgress = 0;

    const wrap = (v) => {
      if (loopWidth <= 0) return 0;
      v %= loopWidth;
      if (v < 0) v += loopWidth;
      return v;
    };

    const applyTransform = () => {
      track.style.transform = `translate3d(${-(baseOffset + progress)}px, 0, 0)`;
    };

    const calcLayout = () => {
      const midStart = originalCount;
      const mid0 = track.children[midStart];
      const mid1 = track.children[midStart + 1];
      const afterMid0 = track.children[midStart + originalCount];

      if (!mid0 || !mid1 || !afterMid0) return false;

      const trackRect = track.getBoundingClientRect();
      const mid0Rect = mid0.getBoundingClientRect();
      const mid1Rect = mid1.getBoundingClientRect();
      const afterRect = afterMid0.getBoundingClientRect();

      step = mid1Rect.left - mid0Rect.left;
      loopWidth = afterRect.left - mid0Rect.left;
      baseOffset = mid0Rect.left - trackRect.left;

      if (!(step > 0) || !(loopWidth > 0)) {
        step = mid1.offsetLeft - mid0.offsetLeft;
        loopWidth = afterMid0.offsetLeft - mid0.offsetLeft;
        baseOffset = mid0.offsetLeft;
      }

      progress = wrap(progress);

      const currentIndex = Math.round(progress / step) % originalCount;
      nextIndex = (currentIndex + 1) % originalCount;
      nextStop = nextIndex * step;

      applyTransform();
      return true;
    };

    requestAnimationFrame(() => {
      if (!calcLayout()) return;

      progress = 0;
      nextIndex = 1;
      nextStop = step;
      pausedUntil = performance.now() + pauseMs;
      lastTime = performance.now();

      applyTransform();

      if (!prefersReducedMotion) requestAnimationFrame(tick);
    });

    function tick(now) {
      const dt = Math.min(50, now - lastTime); // 탭/창 전환 시 dt 폭발 방지
      lastTime = now;

      if (!dragging && now >= pausedUntil && loopWidth > 0) {
        const prev = progress;

        progress += (speedPxPerSec * dt) / 1000;

        let wrapped = false;
        if (progress >= loopWidth) {
          progress -= loopWidth;
          wrapped = true;
        }

        if (wrapped && nextStop === 0) {
          progress = 0;
          pausedUntil = now + pauseMs;
          nextIndex = 1;
          nextStop = step;
        } else if (!wrapped && nextStop !== 0 && prev < nextStop && progress >= nextStop) {

          progress = nextStop;
          pausedUntil = now + pauseMs;

          nextIndex = (nextIndex + 1) % originalCount;
          nextStop = nextIndex * step;
        }

        applyTransform();
      }

      if (!prefersReducedMotion) requestAnimationFrame(tick);
    }

// 탭/창 전환 후 멈춤 리듬이 깨지는 문제 방지
const resetTiming = () => {
  const now = performance.now();
  lastTime = now;

  if (!document.hidden && !dragging) {
    // 복귀 시 카드 위치 스냅 + 다음 정지점 재계산
    if (step > 0) {
      const snapped = Math.round(progress / step) * step;
      progress = wrap(snapped);
      applyTransform();

      const currentIndex = Math.round(progress / step) % originalCount;
      nextIndex = (currentIndex + 1) % originalCount;
      nextStop = nextIndex * step;
    }
    pausedUntil = isHoveringCard ? Number.POSITIVE_INFINITY : now + pauseMs;
  }
};

document.addEventListener('visibilitychange', resetTiming);
window.addEventListener('blur', resetTiming);
window.addEventListener('focus', resetTiming);

    // 카드 호버
    track.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.new_card');
      if (!card) return;

      isHoveringCard = true;
      card.classList.add('is-hover');

      // 호버 중 자동 스크롤 멈춤
      pausedUntil = Number.POSITIVE_INFINITY;
    });

    track.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.new_card');
      if (!card) return;
      if (card.contains(e.relatedTarget)) return;

      isHoveringCard = false;
      card.classList.remove('is-hover');

      if (!dragging) pausedUntil = performance.now() + 150;
    });

    // 드래그, 스크롤
    viewport.addEventListener('pointerdown', (e) => {
      if (loopWidth <= 0) return;

      dragging = true;
      viewport.classList.add('is-dragging');

      dragStartX = e.clientX;
      dragStartProgress = progress;

      pausedUntil = Number.POSITIVE_INFINITY;

      viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;

      const dx = e.clientX - dragStartX;
      progress = wrap(dragStartProgress - dx);

      applyTransform();
    });

    const endDrag = () => {
      if (!dragging) return;

      dragging = false;
      viewport.classList.remove('is-dragging');

      const now = performance.now();

      const snapped = Math.round(progress / step) * step;
      progress = wrap(snapped);
      applyTransform();

      const currentIndex = Math.round(progress / step) % originalCount;
      nextIndex = (currentIndex + 1) % originalCount;
      nextStop = nextIndex * step;

      pausedUntil = isHoveringCard ? Number.POSITIVE_INFINITY : now + pauseMs;
      lastTime = now;
    };

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', () => {
      calcLayout();
    });
  };

  initNewSection();

  // best 섹션
  const initBestSection = () => {
    const bestSection = document.querySelector('section.best');
    if (!bestSection) return;

    const feature = bestSection.querySelector('.best_feature');
    const featurePhoto = bestSection.querySelector('.best_feature_photo');
    const list = bestSection.querySelector('.best_list');
    const viewport = bestSection.querySelector('.best_viewport');
    const prevBtn = bestSection.querySelector('.best_prev');
    const nextBtn = bestSection.querySelector('.best_next');
    const line = bestSection.querySelector('.best_line');
    const lineFill = bestSection.querySelector('.best_line_fill');

    if (!feature || !featurePhoto || !list || !viewport || !prevBtn || !nextBtn || !line || !lineFill) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const bigTag = feature.querySelector('.best_txtbox .tag');
    const bigRank = feature.querySelector('.best_rank');
    const bigTitle = feature.querySelector('.best_title');
    const bigAuthor = feature.querySelector('.best_author');
    const bigCopy = feature.querySelector('.best_copy');

    if (!bigTag || !bigRank || !bigTitle || !bigAuthor || !bigCopy) return;

    const getText = (el) => (el?.textContent ?? '').trim();

    const getBigData = () => ({
      tag: (feature.dataset.tag ?? getText(bigTag) ?? '').trim(),
      rank: (feature.dataset.rank ?? getText(bigRank) ?? '').trim(),
      title: (feature.dataset.title ?? getText(bigTitle) ?? '').trim(),
      author: (feature.dataset.author ?? getText(bigAuthor) ?? '').trim(),
      copy: (feature.dataset.copy ?? getText(bigCopy) ?? '').trim(),
      cover: (feature.dataset.cover ?? '').trim(),
    });

    const setBigData = (data) => {
      bigTag.textContent = data.tag || '태그';
      bigRank.textContent = data.rank || '';
      bigTitle.textContent = data.title || '제목';
      bigAuthor.textContent = data.author || '작가';
      bigCopy.textContent = data.copy || '내용';

      feature.dataset.tag = data.tag || '';
      feature.dataset.rank = data.rank || '';
      feature.dataset.title = data.title || '';
      feature.dataset.author = data.author || '';
      feature.dataset.copy = data.copy || '';
      feature.dataset.cover = data.cover || '';

      if (data.cover) {
        featurePhoto.style.backgroundImage = `url('${data.cover}')`;
      }
    };

    setBigData(getBigData());

    const getCards = () => Array.from(list.querySelectorAll('.best_card'));

    const getCardData = (li) => {
      const titleEl = li.querySelector('.best_card_title');
      const authorEl = li.querySelector('.best_card_author');
      const photoEl = li.querySelector('.best_card_photo');

      const cover =
        (li.dataset.cover ?? '').trim() ||
        (photoEl?.style.backgroundImage ?? '')
          .replace(/^url\(["']?/, '')
          .replace(/["']?\)$/, '');

      return {
        tag: (li.dataset.tag ?? '').trim() || '태그',
        rank: (li.dataset.rank ?? '').trim() || '',
        title: (li.dataset.title ?? '').trim() || getText(titleEl) || '제목',
        author: (li.dataset.author ?? '').trim() || getText(authorEl) || '작가',
        copy: (li.dataset.copy ?? '').trim() || '내용',
        cover,
      };
    };

    const applySmallData = (li, data) => {
      const titleEl = li.querySelector('.best_card_title');
      const authorEl = li.querySelector('.best_card_author');
      const photoEl = li.querySelector('.best_card_photo');

      if (titleEl) titleEl.textContent = data.title || '제목';
      if (authorEl) authorEl.textContent = data.author || '작가';

      li.dataset.tag = data.tag || '';
      li.dataset.rank = data.rank || '';
      li.dataset.title = data.title || '';
      li.dataset.author = data.author || '';
      li.dataset.copy = data.copy || '';
      li.dataset.cover = data.cover || '';

      if (photoEl && data.cover) {
        photoEl.style.backgroundImage = `url('${data.cover}')`;
      }
    };

    getCards().forEach((li, idx) => {
      const d = getCardData(li);
      if (!d.rank) d.rank = `${idx + 1}위`;
      applySmallData(li, d);
    });

    (() => {
      const big = getBigData();
      const cards = getCards();
      const dup = cards.find((li) => (li.dataset.rank ?? '').trim() === big.rank && (li.dataset.title ?? '').trim() === big.title);
      if (dup) dup.remove();
    })();

    let stepPx = 0;
    const calcStepPx = () => {
      const cards = getCards();
      if (cards.length >= 2) stepPx = cards[1].offsetLeft - cards[0].offsetLeft;
      else if (cards.length === 1) stepPx = cards[0].getBoundingClientRect().width;
      else stepPx = 0;
    };
    calcStepPx();
    window.addEventListener('resize', calcStepPx);

    let activeIndex = 0;
    const getTotalSteps = () => 1 + getCards().length;

    const syncProgress = () => {
      const total = getTotalSteps();
      const trackW = line.clientWidth;
      if (total <= 0 || trackW <= 0) return;

      const slotW = trackW / total;
      lineFill.style.width = `${slotW}px`;
      lineFill.style.transform = `translate3d(${slotW * activeIndex}px,0,0)`;
    };

    syncProgress();
    window.addEventListener('resize', syncProgress);

    const easing = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
    const slideDurationMs = prefersReducedMotion ? 0 : 420;
    const autoplayDelayMs = 3800;
    let autoplayTimer = null;
    let isAnimating = false;

    const stopAutoplay = () => {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const startAutoplay = () => {
      if (prefersReducedMotion) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(() => goNext({ fromButton: false, startOffsetPx: 0 }), autoplayDelayMs);
    };

    const restartAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    const setListTransform = (xPx, withTransition) => {
      if (withTransition) {
        list.style.transition = `transform ${slideDurationMs}ms ${easing}`;
      } else {
        list.style.transition = 'none';
      }
      list.style.transform = `translate3d(${xPx}px,0,0)`;
    };

    const goNext = ({ fromButton = false, startOffsetPx = 0 } = {}) => {
      if (isAnimating) return;
      const first = list.querySelector('.best_card');
      if (!first) return;

      calcStepPx();
      if (!stepPx) return;

      isAnimating = true;

      const currentBig = getBigData();
      const nextBig = getCardData(first);

      if (!prefersReducedMotion) {
        setListTransform(startOffsetPx, false);
        requestAnimationFrame(() => setListTransform(-stepPx, true));
      }

      feature.classList.add('is-changing');

      const finish = () => {
        setListTransform(0, false);

        setBigData(nextBig);

        applySmallData(first, currentBig);
        list.appendChild(first);

        activeIndex = (activeIndex + 1) % getTotalSteps();
        syncProgress();

        requestAnimationFrame(() => feature.classList.remove('is-changing'));
        isAnimating = false;

        if (fromButton) restartAutoplay();
      };

      if (prefersReducedMotion) {
        finish();
        return;
      }

      const onEnd = (e) => {
        if (e.target !== list) return;
        list.removeEventListener('transitionend', onEnd);
        finish();
      };
      list.addEventListener('transitionend', onEnd);

      window.setTimeout(() => {
        if (!isAnimating) return;
        list.removeEventListener('transitionend', onEnd);
        finish();
      }, slideDurationMs + 80);
    };

    const goPrev = ({ fromButton = false, startOffsetPx = 0 } = {}) => {
      if (isAnimating) return;

      const cards = getCards();
      const last = cards[cards.length - 1];
      if (!last) return;

      calcStepPx();
      if (!stepPx) return;

      isAnimating = true;

      const currentBig = getBigData();
      const prevBig = getCardData(last);

      list.insertBefore(last, list.firstChild);
      applySmallData(last, currentBig);

      if (!prefersReducedMotion) {
        setListTransform(startOffsetPx - stepPx, false);
        requestAnimationFrame(() => setListTransform(0, true));
      }

      feature.classList.add('is-changing');

      const finish = () => {
        setListTransform(0, false);

        setBigData(prevBig);

        activeIndex = (activeIndex - 1 + getTotalSteps()) % getTotalSteps();
        syncProgress();

        requestAnimationFrame(() => feature.classList.remove('is-changing'));
        isAnimating = false;

        if (fromButton) restartAutoplay();
      };

      if (prefersReducedMotion) {
        finish();
        return;
      }

      const onEnd = (e) => {
        if (e.target !== list) return;
        list.removeEventListener('transitionend', onEnd);
        finish();
      };
      list.addEventListener('transitionend', onEnd);

      window.setTimeout(() => {
        if (!isAnimating) return;
        list.removeEventListener('transitionend', onEnd);
        finish();
      }, slideDurationMs + 80);
    };

    // 버튼 이벤트
    nextBtn.addEventListener('click', () => goNext({ fromButton: true, startOffsetPx: 0 }));
    prevBtn.addEventListener('click', () => goPrev({ fromButton: true, startOffsetPx: 0 }));

    startAutoplay();

    bestSection.addEventListener('mouseenter', stopAutoplay);
    bestSection.addEventListener('mouseleave', startAutoplay);

    let dragging = false;
    let dragStartX = 0;
    let dragOffsetX = 0;

    const thresholdPx = 60;

    viewport.addEventListener('pointerdown', (e) => {
      if (isAnimating) return;

      dragging = true;
      dragStartX = e.clientX;
      dragOffsetX = 0;

      viewport.classList.add('is-dragging');
      stopAutoplay();

      list.style.transition = 'none';
      viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;

      dragOffsetX = e.clientX - dragStartX;

      const clamp = stepPx ? Math.max(-stepPx * 1.1, Math.min(stepPx * 1.1, dragOffsetX)) : dragOffsetX;
      dragOffsetX = clamp;
      list.style.transform = `translate3d(${clamp}px,0,0)`;
    });

    const endDrag = () => {
      if (!dragging) return;

      dragging = false;
      viewport.classList.remove('is-dragging');

      const dx = dragOffsetX;

      if (dx <= -thresholdPx) {
        goNext({ fromButton: true, startOffsetPx: dx });
      } else if (dx >= thresholdPx) {
        goPrev({ fromButton: true, startOffsetPx: dx });
      } else {
        list.style.transition = `transform 220ms ${easing}`;
        list.style.transform = 'translate3d(0,0,0)';
        restartAutoplay();
      }
    };

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
  };

  initHeaderAutoHide();
  initHeaderMenu();
  initMainVisual();
  initAOS();
  initNewSection();
  initBestSection();
});