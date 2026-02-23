document.addEventListener('DOMContentLoaded', () => {
  // =========================
  // 0) 메인비주얼 Swiper + progress bar
  // =========================
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

    // pager 숫자 업데이트(엘리먼트가 있으면)
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

  // =========================
  // AOS 초기화(당신이 고른 한 권 등 스크롤 애니메이션)
  // =========================
  const initAOS = () => {
    if (!window.AOS) return;
    AOS.init({
      duration: 650,
      offset: 90,
      once: true,
      easing: 'ease-out',
    });
  };

  // =========================
  // NEW 섹션(신간)
  // ✅ 해결: 첫 카드(1번)로 돌아올 때 "마지막 카드가 첫 카드로 바뀌는(점프)" 현상 방지
  // - 트랙을 [클론][원본][클론] 3세트로 만들고, 항상 "가운데(원본) 세트"를 보여주는 방식
  // - 그래서 1번 카드가 멈춰도 왼쪽에 '직전 마지막 카드'가 자연스럽게 이어짐
  // =========================
  const initNewSection = () => {
    const section = document.querySelector('section.new');
    if (!section) return;

    const viewport = section.querySelector('.new_viewport');
    const track = section.querySelector('.new_track');
    if (!viewport || !track) return;

    // 중복 초기화 방지
    if (track.dataset.loopReady === '1') return;
    track.dataset.loopReady = '1';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 원본 카드들
    const originals = Array.from(track.children);
    const originalCount = originals.length;
    if (originalCount < 2) return;

    // 트랙 구성: [클론][원본][클론]
    const makeClones = () => {
      const frag = document.createDocumentFragment();
      originals.forEach((node) => frag.appendChild(node.cloneNode(true)));
      return frag;
    };
    track.insertBefore(makeClones(), track.firstChild);
    track.appendChild(makeClones());

    // 속도/멈춤 시간(원하면 여기 숫자만 조절)
    const speedPxPerSec = 70; // px/s
    const pauseMs = 2000;      // ms

    // 레이아웃 값(리사이즈 시 재계산)
    let step = 0;       // 카드 1칸 이동(px)
    let loopWidth = 0;  // 원본 세트 1바퀴 폭(px)
    let baseOffset = 0; // "가운데(원본) 세트" 시작점까지 이동해야 하는 px

    // 진행 상태(0 ~ loopWidth)
    let progress = 0;
    let nextIndex = 1; // 다음 멈춤 카드 index(원본 기준 0~count-1)
    let nextStop = 0;  // 다음 멈춤 위치(px)
    let pausedUntil = performance.now() + pauseMs;
    let lastTime = performance.now();

    // 인터랙션 상태
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
      // ✅ 항상 가운데(원본) 세트를 기준으로 보이게
      track.style.transform = `translate3d(${-(baseOffset + progress)}px, 0, 0)`;
    };

    const calcLayout = () => {
      // 가운데(원본) 세트의 시작 카드
      const midStart = originalCount;
      const mid0 = track.children[midStart];
      const mid1 = track.children[midStart + 1];
      const afterMid0 = track.children[midStart + originalCount]; // 원본 다음 클론 세트의 첫 카드

      if (!mid0 || !mid1 || !afterMid0) return false;

      // ✅ getBoundingClientRect() 기반(패딩/offsetParent 영향 최소화)
      const trackRect = track.getBoundingClientRect();
      const mid0Rect = mid0.getBoundingClientRect();
      const mid1Rect = mid1.getBoundingClientRect();
      const afterRect = afterMid0.getBoundingClientRect();

      step = mid1Rect.left - mid0Rect.left;
      loopWidth = afterRect.left - mid0Rect.left;
      baseOffset = mid0Rect.left - trackRect.left; // == 앞에 붙인 클론 세트 폭

      // fallback (혹시 0 나오면 offsetLeft 방식으로)
      if (!(step > 0) || !(loopWidth > 0)) {
        step = mid1.offsetLeft - mid0.offsetLeft;
        loopWidth = afterMid0.offsetLeft - mid0.offsetLeft;
        baseOffset = mid0.offsetLeft;
      }

      // 현재 위치를 새 loopWidth 기준으로 정리
      progress = wrap(progress);

      // 현재 카드 인덱스 기반으로 nextStop 재설정
      const currentIndex = Math.round(progress / step) % originalCount;
      nextIndex = (currentIndex + 1) % originalCount;
      nextStop = nextIndex * step;

      applyTransform();
      return true;
    };

    // 첫 프레임에 레이아웃 계산 후 시작
    requestAnimationFrame(() => {
      if (!calcLayout()) return;

      // ✅ 시작은 1번 카드(원본)에서 멈춘 상태로
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

        // 진행
        progress += (speedPxPerSec * dt) / 1000;

        // wrap 감지
        let wrapped = false;
        if (progress >= loopWidth) {
          progress -= loopWidth;
          wrapped = true;
        }

        // ✅ 마지막 → 첫 카드(0)로 넘어갈 때
        //    (여기서 점프처럼 보이는 현상이 생기기 쉬움)
        if (wrapped && nextStop === 0) {
          progress = 0;                 // 첫 카드 정확히 정렬
          pausedUntil = now + pauseMs;  // 멈춤
          nextIndex = 1;
          nextStop = step;
        } else if (!wrapped && nextStop !== 0 && prev < nextStop && progress >= nextStop) {
          // 나머지 카드 멈춤
          progress = nextStop;
          pausedUntil = now + pauseMs;

          nextIndex = (nextIndex + 1) % originalCount;
          nextStop = nextIndex * step; // 0이면 다음 wrap 시 1번에서 멈춤
        }

        applyTransform();
      }

      if (!prefersReducedMotion) requestAnimationFrame(tick);
    }

    // =========================
    // 카드 hover (JS로 .is-hover)
    // =========================
    track.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.new_card');
      if (!card) return;

      isHoveringCard = true;
      card.classList.add('is-hover');

      // hover 중 자동 스크롤 멈춤
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

    // =========================
    // Drag to scroll (transform 기반)
    // =========================
    viewport.addEventListener('pointerdown', (e) => {
      if (loopWidth <= 0) return;

      dragging = true;
      viewport.classList.add('is-dragging');

      dragStartX = e.clientX;
      dragStartProgress = progress;

      // 드래그 중 자동 스크롤 정지
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

      // 가장 가까운 카드로 스냅
      const snapped = Math.round(progress / step) * step;
      progress = wrap(snapped);
      applyTransform();

      // 다음 멈춤 지점 계산
      const currentIndex = Math.round(progress / step) % originalCount;
      nextIndex = (currentIndex + 1) % originalCount;
      nextStop = nextIndex * step;

      // 스냅 지점에서 잠깐 멈춘 뒤 재개
      pausedUntil = isHoveringCard ? Number.POSITIVE_INFINITY : now + pauseMs;
      lastTime = now;
    };

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // 리사이즈 시 step/loopWidth 재계산
    window.addEventListener('resize', () => {
      calcLayout();
    });
  };

  initNewSection();

  // =========================
  // 2) BEST 섹션(베스트 셀러)
  // 요구사항 반영:
  // - ✅ "작은 카드 맨 앞"이 큰 카드로 승격(중복 노출 X)
  // - ✅ 좌/우 버튼으로 이전/다음 카드 이동
  // - ✅ 1위(데미안)도 작은 카드 리스트에 존재(초기에는 JS가 중복 제거)
  // - ✅ 드래그로 자연스럽게 이동(스크롤 느낌)
  // - ✅ 작은 카드 → 큰 카드 승격 시, 작은 카드엔 없던 [태그/순위/내용]은 data-*로 들고 있다가 큰 카드에 채움
  // =========================
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

    // 큰 카드 DOM
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

    // 초기 big 카드: dataset or DOM 기준으로 세팅(+커버)
    setBigData(getBigData());

    // small card DOM/데이터 처리
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

    // small 카드들: dataset이 비어있어도 최소값 채우고 커버 반영
    getCards().forEach((li, idx) => {
      const d = getCardData(li);
      // rank가 없으면 대충 채워줌(안 썼을 때 안전장치)
      if (!d.rank) d.rank = `${idx + 1}위`;
      applySmallData(li, d);
    });

    // ✅ 초기 중복 제거: big(1위)과 같은 카드가 리스트에 있으면 제거
    // (요구: 1위도 리스트에 존재하되, 큰 카드와 동시에 보이지 않게)
    (() => {
      const big = getBigData();
      const cards = getCards();
      const dup = cards.find((li) => (li.dataset.rank ?? '').trim() === big.rank && (li.dataset.title ?? '').trim() === big.title);
      if (dup) dup.remove();
    })();

    // 카드 + gap(1칸 이동) 픽셀 계산
    let stepPx = 0;
    const calcStepPx = () => {
      const cards = getCards();
      if (cards.length >= 2) stepPx = cards[1].offsetLeft - cards[0].offsetLeft;
      else if (cards.length === 1) stepPx = cards[0].getBoundingClientRect().width;
      else stepPx = 0;
    };
    calcStepPx();
    window.addEventListener('resize', calcStepPx);

    // progress(한 칸씩 이동)
    let activeIndex = 0; // 0 = 현재 큰 카드
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

    // 애니메이션/자동재생
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

    // NEXT: 첫 작은 카드 → 큰 카드 승격 / 기존 큰 카드 → 맨 뒤 작은 카드로 내려감
    const goNext = ({ fromButton = false, startOffsetPx = 0 } = {}) => {
      if (isAnimating) return;
      const first = list.querySelector('.best_card');
      if (!first) return;

      calcStepPx();
      if (!stepPx) return;

      isAnimating = true;

      const currentBig = getBigData();
      const nextBig = getCardData(first);

      // 리스트: 현재 위치(startOffset)에서 -stepPx까지 슬라이드
      if (!prefersReducedMotion) {
        // 드래그 중이었으면 현재 오프셋을 유지한 채 이어서 이동
        setListTransform(startOffsetPx, false);
        // 다음 프레임에 transition 적용
        requestAnimationFrame(() => setListTransform(-stepPx, true));
      }

      // 큰 카드 페이드
      feature.classList.add('is-changing');

      const finish = () => {
        // 리스트 위치 원복(루프 느낌)
        setListTransform(0, false);

        // 큰 카드 업데이트
        setBigData(nextBig);

        // 승격된(첫) 작은 카드는 "이전 큰 카드" 데이터로 바꿔서 맨 뒤로 보냄
        applySmallData(first, currentBig);
        list.appendChild(first);

        // progress: 한 칸 이동
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

      // transitionend 누락 대비
      window.setTimeout(() => {
        if (!isAnimating) return;
        list.removeEventListener('transitionend', onEnd);
        finish();
      }, slideDurationMs + 80);
    };

    // PREV: 마지막 작은 카드 → 큰 카드 승격 / 기존 큰 카드 → 맨 앞 작은 카드로 내려감
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

      // ✅ 마지막 카드를 맨 앞으로 옮겨두고(-stepPx만큼 당겨서) 자연스럽게 오른쪽으로 들어오게
      list.insertBefore(last, list.firstChild);
      applySmallData(last, currentBig);

      if (!prefersReducedMotion) {
        // drag startOffset을 유지하려면: element insert로 인해 +stepPx만큼 밀린 걸 보정
        // (before insert) transform = startOffsetPx
        // (after insert)  transform = startOffsetPx - stepPx  => 같은 화면 위치 유지
        setListTransform(startOffsetPx - stepPx, false);
        requestAnimationFrame(() => setListTransform(0, true));
      }

      feature.classList.add('is-changing');

      const finish = () => {
        setListTransform(0, false);

        // 큰 카드 업데이트
        setBigData(prevBig);

        // progress: 한 칸 왼쪽 이동
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

    // 자동 재생(원치 않으면 startAutoplay() 호출을 제거)
    startAutoplay();

    // hover 시 자동 재생 pause
    bestSection.addEventListener('mouseenter', stopAutoplay);
    bestSection.addEventListener('mouseleave', startAutoplay);

    // =========================
    // Drag to slide (스크롤 느낌)
    // =========================
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

      // transition 제거 후 즉시 이동 준비
      list.style.transition = 'none';
      viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;

      dragOffsetX = e.clientX - dragStartX;

      // 너무 과하게 끌리지 않도록 살짝 제한
      const clamp = stepPx ? Math.max(-stepPx * 1.1, Math.min(stepPx * 1.1, dragOffsetX)) : dragOffsetX;
      dragOffsetX = clamp; // ✅ 화면에 실제 적용된 값으로 동기화(릴리즈 시 점프 방지)
      list.style.transform = `translate3d(${clamp}px,0,0)`;
    });

    const endDrag = () => {
      if (!dragging) return;

      dragging = false;
      viewport.classList.remove('is-dragging');

      const dx = dragOffsetX;

      // ✅ 스와이프 방향에 따라 이전/다음
      if (dx <= -thresholdPx) {
        goNext({ fromButton: true, startOffsetPx: dx });
      } else if (dx >= thresholdPx) {
        goPrev({ fromButton: true, startOffsetPx: dx });
      } else {
        // 원위치로 스냅
        list.style.transition = `transform 220ms ${easing}`;
        list.style.transform = 'translate3d(0,0,0)';
        restartAutoplay();
      }
    };

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
  };

  initMainVisual();
  initAOS();
  initNewSection();
  initBestSection();
});