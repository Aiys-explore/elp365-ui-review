(() => {
  const endpoint = '/api/me/trajectory';
  const prefix = 'scene-english:trajectory:v1:';
  const demo = !!document.querySelector('#reset-demo');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const listeners = new Set();
  const volatile = new Map();
  let userId = demo ? 'demo' : '';
  let snapshot = null, status = 'loading', timer = 0, failures = 0;
  let inFlight = null, rerun = false, refresh = false;

  function publish(next, value = snapshot) {
    if (next === status && value === snapshot) return;
    status = next;
    snapshot = value;
    for (const listener of listeners) listener(snapshot, status);
  }

  const accountPrefix = () => prefix + encodeURIComponent(userId) + ':';
  function queue() {
    const scope = accountPrefix(), result = new Map();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(scope)) continue;
        const event = JSON.parse(localStorage.getItem(key) || 'null');
        if (event?.id && key === scope + event.id) result.set(key, event);
      }
    } catch {}
    for (const [key, event] of volatile) {
      if (key.startsWith(scope)) result.set(key, event);
    }
    return [...result.values()].sort((a, b) => a.at - b.at);
  }

  function discard(scope, ids) {
    for (const id of ids) {
      const key = scope + id;
      volatile.delete(key);
      try { localStorage.removeItem(key); } catch {}
    }
  }

  function schedule(delay = 700) {
    clearTimeout(timer);
    timer = setTimeout(() => void sync(), delay);
  }

  function disconnect() {
    userId = '';
    clearTimeout(timer);
    timer = 0;
    publish('unavailable', null);
  }

  async function request(init = {}) {
    const response = await fetch(endpoint + '?timeZone=' + encodeURIComponent(timeZone), {
      ...init, cache: 'no-store', signal: AbortSignal.timeout(8000)
    });
    if (response.status === 401 || response.status === 409) {
      disconnect();
      return null;
    }
    if (!response.ok) throw new Error('Trajectory request failed');
    return response.json();
  }

  function sync(keepalive = false, read = false) {
    if (demo || !userId) return Promise.resolve();
    clearTimeout(timer);
    timer = 0;
    refresh ||= read;
    if (inFlight) {
      rerun = true;
      return inFlight;
    }
    const actor = userId, scope = accountPrefix();
    inFlight = (async () => {
      const batch = queue().slice(0, 50);
      if (!navigator.onLine) {
        publish(batch.length ? 'pending' : 'offline');
        return;
      }
      try {
        if (batch.length) {
          publish('pending');
          const result = await request({
            method: 'POST', keepalive,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({userId: actor, timeZone, events: batch})
          });
          if (!result || actor !== userId) return;
          const ids = new Set(batch.map(event => event.id));
          const acknowledged = [...(result.accepted || []), ...(result.rejected || [])]
            .filter(id => ids.has(id));
          if (!acknowledged.length) throw new Error('Trajectory events were not acknowledged');
          discard(scope, acknowledged);
          refresh = true;
        }
        if ((refresh || !snapshot) && (!keepalive || read)) {
          refresh = false;
          const next = await request();
          if (!next) return;
          if (next.userId !== actor || actor !== userId) {
            disconnect();
            return;
          }
          publish(queue().length ? 'pending' : 'ready', next);
        }
        failures = 0;
      } catch {
        if (actor !== userId) return;
        failures++;
        refresh = true;
        publish(queue().length ? 'pending' : 'offline');
      }
    })().finally(() => {
      inFlight = null;
      const more = rerun;
      rerun = false;
      if (!userId || !navigator.onLine) return;
      if (more || failures || queue().length) {
        schedule(failures ? Math.min(30000, 1000 * 2 ** Math.min(failures, 5)) : 150);
      }
    });
    return inFlight;
  }

  const dayKey = date => [
    date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')
  ].join('-');

  function demoSnapshot() {
    const today = new Date();
    const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13);
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7);
    const catalog = new Map((window.ELP_LIBRARY?.catalog || []).map(row => [row.id, row]));
    const days = new Map();
    const itemFor = (timestamp, lessonId) => {
      const date = dayKey(new Date(timestamp));
      if (!days.has(date)) days.set(date, {date, listenedMs: 0, items: new Map()});
      const day = days.get(date);
      if (!day.items.has(lessonId)) {
        const lesson = catalog.get(lessonId);
        day.items.set(lessonId, {
          lessonId, title: lesson?.titleZh || lesson?.title || lessonId,
          href: '#lesson/' + lessonId, wholeMs: 0, coreMs: 0, replays: 0,
          wholeDone: false, coreDone: false, practiceDone: false
        });
      }
      return [day, day.items.get(lessonId)];
    };
    const events = queue();
    discard(accountPrefix(), events.filter(event => event.at < +cutoff).map(event => event.id));
    let countedUntil = +cutoff;
    for (const event of events.filter(event => event.type === 'listen').sort((a, b) => a.start - b.start)) {
      let start = Math.max(event.start, countedUntil);
      while (start < event.at) {
        const date = new Date(start);
        const end = Math.min(event.at, +new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
        const [day, item] = itemFor(start, event.lessonId);
        const ms = end - start;
        day.listenedMs += ms;
        item[event.mode === 'whole' ? 'wholeMs' : 'coreMs'] += ms;
        start = countedUntil = end;
      }
    }
    const marks = {whole_done: 'wholeDone', core_done: 'coreDone', practice_done: 'practiceDone'};
    for (const event of events) {
      if (event.at < +cutoff || event.type === 'listen') continue;
      const [, item] = itemFor(event.at, event.lessonId);
      if (event.type === 'replay') item.replays++;
      else if (marks[event.type]) item[marks[event.type]] = true;
    }
    const week = {listenedMs: 0, activeDays: 0};
    const result = [...days.values()].sort((a, b) => b.date.localeCompare(a.date)).map(day => {
      const items = [...day.items.values()];
      if (day.date >= dayKey(monday)) {
        week.listenedMs += day.listenedMs;
        if (day.listenedMs >= 60000 || items.some(item => item.wholeDone || item.coreDone || item.practiceDone)) {
          week.activeDays++;
        }
      }
      return {...day, items};
    });
    publish('ready', {timeZone, week, days: result});
  }

  function record(event) {
    if (!userId) return;
    const entry = {...event, id: crypto.randomUUID()};
    const key = accountPrefix() + entry.id;
    try { localStorage.setItem(key, JSON.stringify(entry)); }
    catch { volatile.set(key, entry); }
    if (demo) demoSnapshot();
    else {
      publish('pending');
      if (!timer && !inFlight) schedule();
    }
  }

  if (demo) {
    demoSnapshot();
    document.querySelector('#reset-demo').addEventListener('click', () => {
      discard(accountPrefix(), queue().map(event => event.id));
    }, {capture: true});
  } else {
    window.addEventListener('online', () => void sync(false, true));
    window.addEventListener('offline', () => {
      if (userId) publish(queue().length ? 'pending' : 'offline');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void sync(false, true);
      else queueMicrotask(() => void sync(true));
    });
    window.addEventListener('pagehide', () => queueMicrotask(() => void sync(true)));
    window.addEventListener('storage', event => {
      if (userId && event.key?.startsWith(accountPrefix()) && event.newValue) schedule();
    });
  }

  window.ELP_TRAJECTORY = {
    get enabled() { return !!userId; },
    get snapshot() { return snapshot; },
    get status() { return status; },
    connect(account) {
      if (demo) return;
      if (typeof account !== 'string' || !account) {
        disconnect();
        return;
      }
      if (account !== userId) {
        userId = account;
        publish('loading', null);
      }
      void sync(false, true);
    },
    record,
    refresh() {
      if (demo) demoSnapshot();
      else void sync(false, true);
    },
    subscribe(listener) { listeners.add(listener); }
  };
})();
