(() => {
  const chunkMs = 15000;
  const everyMs = 250;
  const maxGapMs = 1250;
  const clock = () => Math.round(performance.timeOrigin + performance.now());

  function watch({media, resolve, fullscreenRoot}) {
    const send = event => window.ELP_TRAJECTORY?.record(event);
    let timer = 0, previous = null, pending = null, coveredFrom = null, coveredTo = 0;

    function visible() {
      const fullscreen = document.fullscreenElement;
      const root = fullscreenRoot?.();
      return document.visibilityState === 'visible' || media.webkitDisplayingFullscreen
        || (fullscreen && root && (fullscreen === root || root.contains(fullscreen)));
    }

    function emit() {
      if (pending?.start < pending?.at) send({type:'listen', ...pending});
      pending = null;
    }

    function cut(resetCoverage = false) {
      emit();
      previous = null;
      if (resetCoverage) coveredFrom = null;
    }

    function sample(ending = false) {
      if (!timer) return;
      const context = resolve();
      if (!ending && media.paused) return;
      if (!context || !window.ELP_TRAJECTORY?.enabled || !visible() || media.seeking
        || (!ending && media.readyState < 2)) {
        cut();
        return;
      }
      const now = {at:clock(), position:media.currentTime};
      if (!previous) {
        previous = now;
        return;
      }
      const elapsed = now.at - previous.at;
      const advance = now.position - previous.position;
      if (advance < -0.02 || elapsed > maxGapMs || advance > elapsed / 1000 * media.playbackRate + 0.3) {
        cut(true);
        previous = now;
        return;
      }
      if (advance < 0.005 || elapsed <= 0) return;
      if (pending && (pending.lessonId !== context.lessonId || pending.mode !== context.mode)) cut(true);
      if (coveredFrom === null) coveredFrom = now.position - advance;
      coveredTo = now.position;
      let start = pending?.start ?? now.at - elapsed;
      while (now.at - start >= chunkMs) {
        send({type:'listen', ...context, start, at:start + chunkMs});
        start += chunkMs;
      }
      pending = { ...context, start, at:now.at };
      previous = now;
    }

    function start() {
      if (!timer) timer = setInterval(sample, everyMs);
      sample();
    }

    function stop(ending = false) {
      if (ending) sample(true);
      clearInterval(timer);
      timer = 0;
      cut();
    }

    function reached(start,end) {
      return coveredFrom !== null && coveredFrom <= start + 0.24 && coveredTo >= end - 0.06;
    }

    function mark(type) {
      const context = resolve();
      if (context) send({type, lessonId:context.lessonId, at:clock()});
    }

    media.addEventListener('playing',start);
    media.addEventListener('timeupdate',()=>sample());
    media.addEventListener('pause',()=>stop(true));
    media.addEventListener('ended',()=>stop(true));
    media.addEventListener('waiting',()=>stop());
    media.addEventListener('emptied',()=>{ stop(); cut(true); });
    media.addEventListener('seeking',()=>{ stop(); cut(true); });
    media.addEventListener('seeked',()=>{ if (!media.paused && media.readyState>=2) start(); });
    document.addEventListener('visibilitychange',()=>{
      if (!visible()) cut(true);
      else if (!media.paused && media.readyState>=2) start();
    });
    window.addEventListener('pagehide',()=>{ sample(true); cut(); });

    return {
      flush() { sample(true); stop(); cut(true); },
      replay(start,end) {
        sample(true);
        if (reached(start,end)) mark('replay');
        cut(true);
      },
      completed(type) {
        sample(true);
        const end = media.duration;
        if (Number.isFinite(end) && end>0 && reached(end-Math.min(end*0.65,2.5),end)) mark(type);
        cut(true);
      }
    };
  }

  window.ELP_TRAJECTORY_RECORDER = {watch};
})();
