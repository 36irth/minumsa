document.addEventListener('DOMContentLoaded', () => {
  // 헤더: 아래로 스크롤하면 숨기고, 위로 스크롤하면 다시 보이기
  const initHeaderAutoHide = () => {
  const header = document.querySelector('header');
  if (!header) return;

  const HIDE_CLASS = 'is-hidden';
  const DELTA = 20;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;

    
    if (y <= 0) {
      header.classList.remove(HIDE_CLASS);
      lastY = y;
      ticking = false;
      return;
    }

    const diff = y - lastY;

    
    if (Math.abs(diff) < DELTA) {
      ticking = false;
      return;
    }

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

  // 투명 헤더: 현재 배경과 활성 메인 슬라이드에 맞춰 전경색 전환
  const initHeaderContrast = () => {
    const header = document.querySelector('header');
    if (!header) return;

    let ticking = false;

    const colorIsDark = (value) => {
      const match = value?.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/i);
      if (!match || (match[4] !== undefined && Number(match[4]) < 0.1)) return null;
      const [r, g, b] = match.slice(1, 4).map(Number);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return luminance < 0.48;
    };

    const backgroundIsDark = (target) => {
      const visual = target?.closest('.main_visual');
      if (visual) {
        const activeSlide = visual.querySelector('.swiper-slide-active') || visual.querySelector('.swiper-slide');
        return Boolean(activeSlide?.classList.contains('slide1'));
      }

      if (target?.closest('.event')) return true;

      let current = target;
      while (current && current !== document.documentElement) {
        const result = colorIsDark(getComputedStyle(current).backgroundColor);
        if (result !== null) return result;
        current = current.parentElement;
      }
      return false;
    };

    const update = () => {
      const sampleY = Math.min(window.innerHeight - 1, Math.max(1, header.offsetHeight + 1));
      const layers = document.elementsFromPoint(window.innerWidth / 2, sampleY);
      const target = layers.find((element) => !header.contains(element));
      header.classList.toggle('is-on-dark', backgroundIsDark(target));
      ticking = false;
    };

    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    const visual = document.querySelector('.main_visual');
    if (visual) {
      new MutationObserver(schedule).observe(visual, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    schedule();
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
    const speedPxPerSec = 230;
    const pauseMs = 1600;

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
      const dt = now - lastTime;
      lastTime = now;

      if (!dragging && now >= pausedUntil && loopWidth > 0) {
        const prev = progress;

        // 다음 정지점까지 남은 거리(px)
        let distToStop =
          (nextStop === 0) ? (loopWidth - progress) : (nextStop - progress);

        // 정지점 근처에서 감속을 시작할 구간(카드 폭의 25% 정도)
        const slowZone = step * 0.5;

        // 0~1 비율(1=멀다=빠르게, 0=가깝다=느리게)
        const t = Math.max(0, Math.min(1, distToStop / slowZone));

        // 속도 하한(너무 0으로 떨어지면 안 멈추는 느낌 나서 최소 속도 보장)
        const minSpeed = speedPxPerSec * 0.25;
        const curSpeed = minSpeed + (speedPxPerSec - minSpeed) * t;

        progress += (curSpeed * dt) / 1000;

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
      // 🔥 탭 전환 복귀 시 타이밍 리셋
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const now = performance.now();
          lastTime = now;
          pausedUntil = now + pauseMs;
  }
});
    };

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
  initMainVisual();
  initAOS();
  initNewSection();
  initBestSection();
});
