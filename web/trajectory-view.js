/* Learning trajectory view.
   Formats and renders the learner trajectory only. Identity, requests, the
   event queue and the read status live in web/trajectory.js, so this file
   never fetches, never stores and never keeps model state.
   The module adds its own nodes to the container it is given, so the study
   page keeps its lesson cards, its order and the keyboard focus. */
(() => {
  'use strict';
  if (typeof document === 'undefined') return;

  const STATUS = {
    LOADING: 'loading',
    READY: 'ready',
    PENDING: 'pending',
    OFFLINE: 'offline',
    UNAVAILABLE: 'unavailable'
  };
  /* Only relative links inside the app are followed. An absolute URL would
     leave the study room and could carry another learner's data. */
  const COURSE_HASH = /^#lesson\/(ep-\d{3})(?:\/(?:core|whole|notes))?$/;
  const EP_ID = /^ep-\d{3}$/;
  const LESSON_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
  const PRACTICE_PATH = '/practice/workplace-message';
  const PRACTICE_ID = 'msg-001';
  const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
  const MAX_DAYS = 14;
  const MAX_ITEMS_PER_DAY = 40;
  const MAX_TITLE = 120;
  const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const mounts = new WeakMap();

  /* ---------- helpers ---------- */

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /* Writes only when the text changed, so a live region stays quiet on refresh. */
  function setText(node, value) {
    if (!node) return;
    const text = value === undefined || value === null ? '' : String(value);
    if (node.textContent !== text) node.textContent = text;
  }

  function plain(value, limit = MAX_TITLE) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, limit);
  }

  function count(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  }

  /* The learner pages carry both languages and the switcher picks one.
     The pair markup is the house pattern, so the auto translator leaves it alone. */
  function pair(zh, en) {
    const node = el('span', null);
    node.setAttribute('data-i18n', '');
    const cn = el('span', null);
    cn.lang = 'zh';
    cn.textContent = zh;
    const english = el('span', null);
    english.lang = 'en';
    english.textContent = en;
    node.append(cn, english);
    return node;
  }

  /* A pair that stacks the English line under the Chinese one, so a compact
     card stays compact in both languages. */
  function pairBlock(zh, en) {
    const node = pair(zh, en);
    node.className = 'elp-traj-pair';
    return node;
  }

  function setPair(node, zh, en) {
    if (!node) return;
    setText(node.querySelector('[lang="zh"]'), zh);
    setText(node.querySelector('[lang="en"]'), en);
  }

  /* Text that arrives from the server keeps its own wording, so the auto
     translator must not split it into a bilingual pair. */
  function sourceText(value) {
    const node = el('span', null);
    node.setAttribute('data-i18n', '');
    node.textContent = value;
    return node;
  }

  /* Reuses existing rows by key, so a refresh never rebuilds a focused link. */
  function reconcile(container, items, {key, create, update}) {
    if (!container) return;
    const existing = new Map();
    for (const child of Array.from(container.children)) existing.set(child.dataset.key, child);
    items.forEach((item, index) => {
      const id = key(item, index);
      let node = existing.get(id);
      if (node) {
        existing.delete(id);
      } else {
        node = create(item);
        node.dataset.key = id;
      }
      /* New and reused rows are filled the same way, so a fresh row is never empty. */
      update(node, item);
      const current = container.children[index];
      if (current !== node) container.insertBefore(node, current || null);
    });
    for (const node of existing.values()) node.remove();
  }

  function duration(ms, lang) {
    const total = Math.max(0, Math.round(Number(ms) / 1000) || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (lang === 'en') {
      if (hours) return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
      if (minutes) return `${minutes} min`;
      return `${total} sec`;
    }
    if (hours) return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
    if (minutes) return `${minutes} 分钟`;
    return `${total} 秒`;
  }

  /* English counts read one unit at a time. */
  function plural(count, one, many) {
    return `${count} ${count === 1 ? one : many}`;
  }

  function validZone(zone) {
    return typeof zone === 'string' && /^[A-Za-z][A-Za-z0-9_+\-]*(?:\/[A-Za-z0-9_+\-.]+)*$/.test(zone) ? zone : '';
  }

  function resolveZone(zone) {
    return validZone(zone) || validZone(Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  }

  function todayKey(timeZone) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function shiftDay(key, days) {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function weekdayIndex(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  /* The week starts on Monday, the same rule the server counts with. */
  function mondayKey(key) {
    return shiftDay(key, -((weekdayIndex(key) + 6) % 7));
  }

  function prettyDate(key, lang) {
    const [, month, day] = key.split('-');
    if (lang === 'en') return `${MONTHS_EN[Number(month) - 1]} ${Number(day)}`;
    return `${Number(month)}月${Number(day)}日`;
  }

  function dateRange(start, end, lang) {
    return `${prettyDate(start, lang)} – ${prettyDate(end, lang)}`;
  }

  /* ---------- snapshot ---------- */

  function courseHref(href, lessonId) {
    const id = plain(lessonId, 40);
    /* msg-001 is the workplace message practice, not a lesson route. */
    if (id === PRACTICE_ID) return PRACTICE_PATH;
    if (typeof href === 'string') {
      const value = href.trim();
      if (COURSE_HASH.test(value)) return value;
    }
    return EP_ID.test(id) ? `#lesson/${id}/core` : '';
  }

  function normalizeItem(item) {
    if (!item || typeof item !== 'object') return null;
    const lessonId = plain(item.lessonId, 40);
    if (!LESSON_ID.test(lessonId)) return null;
    return {
      lessonId,
      title: plain(item.title) || lessonId,
      href: courseHref(item.href, lessonId),
      wholeMs: count(item.wholeMs),
      coreMs: count(item.coreMs),
      replays: count(item.replays),
      wholeDone: item.wholeDone === true,
      coreDone: item.coreDone === true,
      practiceDone: item.practiceDone === true
    };
  }

  /* Keeps one row per lesson per day and merges the counters of a duplicate. */
  function normalizeItems(items) {
    const byLesson = new Map();
    for (const raw of Array.isArray(items) ? items.slice(0, MAX_ITEMS_PER_DAY) : []) {
      const item = normalizeItem(raw);
      if (!item) continue;
      const current = byLesson.get(item.lessonId);
      if (!current) {
        byLesson.set(item.lessonId, item);
        continue;
      }
      current.wholeMs = Math.max(current.wholeMs, item.wholeMs);
      current.coreMs = Math.max(current.coreMs, item.coreMs);
      current.replays = Math.max(current.replays, item.replays);
      current.wholeDone = current.wholeDone || item.wholeDone;
      current.coreDone = current.coreDone || item.coreDone;
      current.practiceDone = current.practiceDone || item.practiceDone;
      if (!current.href) current.href = item.href;
    }
    return [...byLesson.values()];
  }

  /* The snapshot is plain data. Every field is checked before it reaches the DOM. */
  function normalizeSnapshot(data, timeZone) {
    if (!data || typeof data !== 'object') return null;
    const zone = resolveZone(data.timeZone || timeZone);
    const today = todayKey(zone);
    const earliest = shiftDay(today, -(MAX_DAYS - 1));
    const week = data.week && typeof data.week === 'object' ? data.week : {};
    const days = [];
    for (const day of Array.isArray(data.days) ? data.days : []) {
      if (!day || typeof day !== 'object') continue;
      const date = typeof day.date === 'string' ? day.date.trim() : '';
      if (!DATE_KEY.test(date)) continue;
      /* Only the last 14 calendar days are shown, whatever the snapshot holds. */
      if (date < earliest || date > today) continue;
      days.push({
        date,
        listenedMs: count(day.listenedMs),
        items: normalizeItems(day.items)
      });
    }
    days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return {
      userId: typeof data.userId === 'string' ? data.userId : '',
      timeZone: zone,
      week: {
        listenedMs: count(week.listenedMs),
        activeDays: Math.min(7, count(week.activeDays))
      },
      days
    };
  }

  function normalizeStatus(status, snapshot) {
    if (status === STATUS.LOADING || status === STATUS.READY || status === STATUS.PENDING
      || status === STATUS.OFFLINE || status === STATUS.UNAVAILABLE) return status;
    if (!snapshot) return STATUS.LOADING;
    return snapshot.days.length || snapshot.week.listenedMs ? STATUS.READY : STATUS.PENDING;
  }

  function statusText(status, snapshot) {
    if (status === STATUS.LOADING) {
      return {zh: '正在读取学习记录…', en: 'Loading the learning record…'};
    }
    if (status === STATUS.PENDING) {
      return {zh: '最近 14 天还没有学习记录。', en: 'No learning record in the last 14 days.'};
    }
    if (status === STATUS.OFFLINE) {
      return snapshot
        ? {zh: '当前离线，显示的是上次读取的记录。', en: 'Offline. Showing the record that was read last.'}
        : {zh: '当前离线，暂时读不到最新记录。', en: 'Offline. The latest record is unavailable.'};
    }
    if (status === STATUS.UNAVAILABLE) {
      return {zh: '学习记录暂时不可用。', en: 'The learning record is unavailable.'};
    }
    return {zh: '', en: ''};
  }

  /* ---------- study card ---------- */

  function buildSide() {
    const side = el('aside', 'elp-traj-side');
    side.setAttribute('aria-labelledby', 'elp-traj-side-title');

    const head = el('div', 'elp-traj-side-head');
    const title = el('h2', 'elp-traj-side-title');
    title.id = 'elp-traj-side-title';
    title.append(pair('本周学习', 'This week'));
    const range = el('p', 'elp-traj-side-range');
    range.dataset.trajRange = '';
    range.append(pairBlock('', ''));
    head.append(title, range);

    const status = el('p', 'elp-traj-side-status');
    status.dataset.trajStatus = '';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.append(pairBlock('', ''));

    const stats = el('dl', 'elp-traj-side-stats');
    const weekMs = el('div', 'elp-traj-stat');
    const weekMsLabel = el('dt', null);
    weekMsLabel.append(pairBlock('本周时长', 'Time this week'));
    const weekMsValue = el('dd', null);
    weekMsValue.dataset.trajWeekMs = '';
    weekMsValue.append(pairBlock('', ''));
    weekMs.append(weekMsLabel, weekMsValue);
    const weekDays = el('div', 'elp-traj-stat');
    const weekDaysLabel = el('dt', null);
    weekDaysLabel.append(pairBlock('学习天数', 'Active days'));
    const weekDaysValue = el('dd', null);
    weekDaysValue.dataset.trajWeekDays = '';
    weekDaysValue.append(pairBlock('', ''));
    weekDays.append(weekDaysLabel, weekDaysValue);
    stats.append(weekMs, weekDays);

    const list = el('ul', 'elp-traj-side-list');
    list.dataset.trajList = '';

    const link = el('a', 'elp-traj-side-link');
    link.setAttribute('href', '#trajectory');
    link.append(pair('查看学习记录', 'Learning record'));

    side.append(head, status, stats, list, link);
    return side;
  }

  function createSideRow() {
    const item = el('li', 'elp-traj-side-item');
    const link = el('a', 'elp-traj-side-item-link');
    const title = el('span', 'elp-traj-side-item-title');
    title.append(sourceText(''));
    const meta = el('span', 'elp-traj-side-item-meta');
    meta.append(pair('', ''));
    link.append(title, meta);
    item.append(link);
    return item;
  }

  function updateSideRow(node, entry) {
    const link = node.querySelector('.elp-traj-side-item-link');
    if (entry.href) {
      if (link.getAttribute('href') !== entry.href) link.setAttribute('href', entry.href);
      link.classList.remove('is-plain');
    } else {
      link.removeAttribute('href');
      link.classList.add('is-plain');
    }
    const title = node.querySelector('.elp-traj-side-item-title');
    setText(title.firstChild, entry.title);
    setPair(node.querySelector('.elp-traj-side-item-meta'),
      entry.ms > 0 ? duration(entry.ms, 'zh') : '',
      entry.ms > 0 ? duration(entry.ms, 'en') : '');
  }

  /* The card lists this week's lessons, heaviest first. */
  function weekEntries(snapshot, weekStart, weekEnd) {
    const byLesson = new Map();
    for (const day of snapshot.days) {
      if (day.date < weekStart || day.date > weekEnd) continue;
      for (const item of day.items) {
        const current = byLesson.get(item.lessonId) || {
          lessonId: item.lessonId,
          title: item.title,
          href: item.href,
          ms: 0,
          replays: 0
        };
        current.ms += item.wholeMs + item.coreMs;
        current.replays += item.replays;
        if (!current.href && item.href) current.href = item.href;
        byLesson.set(item.lessonId, current);
      }
    }
    return [...byLesson.values()]
      .filter(entry => entry.ms > 0 || entry.replays > 0)
      .sort((a, b) => b.ms - a.ms || b.replays - a.replays)
      .slice(0, 3);
  }

  function fillSide(side, snapshot, status) {
    const zone = snapshot ? snapshot.timeZone : resolveZone();
    const today = todayKey(zone);
    const weekStart = mondayKey(today);
    const weekEnd = shiftDay(weekStart, 6);
    setPair(side.querySelector('[data-traj-range]'),
      dateRange(weekStart, weekEnd, 'zh'), dateRange(weekStart, weekEnd, 'en'));
    setPair(side.querySelector('[data-traj-week-ms]'),
      snapshot ? duration(snapshot.week.listenedMs, 'zh') : '—',
      snapshot ? duration(snapshot.week.listenedMs, 'en') : '—');
    setPair(side.querySelector('[data-traj-week-days]'),
      snapshot ? `${snapshot.week.activeDays} 天` : '—',
      snapshot ? plural(snapshot.week.activeDays, 'day', 'days') : '—');
    const message = statusText(status, snapshot);
    const sideStatus = side.querySelector('[data-traj-status]');
    setPair(sideStatus, message.zh, message.en);
    /* Nothing to report means no line, so the card keeps its tight shape. */
    sideStatus.hidden = !message.zh;
    const list = side.querySelector('[data-traj-list]');
    const entries = snapshot ? weekEntries(snapshot, weekStart, weekEnd) : [];
    reconcile(list, entries, {
      key: entry => entry.lessonId,
      create: createSideRow,
      update: updateSideRow
    });
    list.hidden = entries.length === 0;
    side.dataset.trajState = status;
  }

  function buildEntry() {
    const entry = el('a', 'elp-traj-entry');
    entry.setAttribute('href', '#trajectory');
    entry.append(pair('学习记录', 'Learning record'));
    return entry;
  }

  /* The entry belongs to the study heading. It is added, never moved, so the
     directory keeps its own structure. */
  function placeEntry(container, entry) {
    const head = container.querySelector('.elp-trial-dir .td-head') || container.querySelector('.td-head');
    if (head) {
      head.append(entry);
      head.classList.add('elp-traj-head');
      return;
    }
    const heading = container.querySelector('h1');
    if (heading && heading.parentNode) {
      heading.insertAdjacentElement('afterend', entry);
      return;
    }
    container.insertBefore(entry, container.firstChild);
  }

  /* Adds the card and the entry to the study page. Repeat calls update the
     existing nodes, so lesson cards and focus are left alone. */
  function mountStudy(container, snapshot, status) {
    const target = typeof container === 'string' ? document.querySelector(container) : container;
    if (!target || typeof target.appendChild !== 'function') return;
    const view = snapshot ? normalizeSnapshot(snapshot, resolveZone(snapshot.timeZone)) : null;
    const state = normalizeStatus(status, view);
    const mount = mounts.get(target) || {};

    let side = mount.side;
    if (!side || !target.contains(side)) {
      side = buildSide();
      target.append(side);
    }
    fillSide(side, view, state);
    mount.side = side;

    let entry = mount.entry;
    if (!entry || !target.contains(entry)) {
      entry = buildEntry();
      placeEntry(target, entry);
    }
    mount.entry = entry;
    mounts.set(target, mount);

    /* The two column split only makes sense next to the directory. */
    if (target.querySelector('.elp-trial-dir')) target.classList.add('elp-traj-study');
  }

  /* ---------- learning record page ---------- */

  function buildPage() {
    const page = el('section', 'elp-traj-page');
    page.setAttribute('aria-labelledby', 'elp-traj-page-title');

    const head = el('header', 'elp-traj-page-head');
    const title = el('h1', 'elp-traj-page-title');
    title.id = 'elp-traj-page-title';
    title.append(pair('学习记录', 'Learning record'));
    const range = el('p', 'elp-traj-page-range');
    range.dataset.trajRange = '';
    range.append(pairBlock('', ''));
    head.append(title, range);

    const week = el('section', 'elp-traj-week');
    week.setAttribute('aria-labelledby', 'elp-traj-week-title');
    const weekTitle = el('h2', 'elp-traj-week-title');
    weekTitle.id = 'elp-traj-week-title';
    weekTitle.append(pair('本周', 'This week'));
    const weekRange = el('p', 'elp-traj-week-range');
    weekRange.dataset.trajWeekRange = '';
    weekRange.append(pairBlock('', ''));
    const stats = el('dl', 'elp-traj-week-stats');
    const weekMs = el('div', 'elp-traj-stat');
    const weekMsLabel = el('dt', null);
    weekMsLabel.append(pairBlock('学习时长', 'Time'));
    const weekMsValue = el('dd', null);
    weekMsValue.dataset.trajWeekMs = '';
    weekMsValue.append(pairBlock('', ''));
    weekMs.append(weekMsLabel, weekMsValue);
    const weekDays = el('div', 'elp-traj-stat');
    const weekDaysLabel = el('dt', null);
    weekDaysLabel.append(pairBlock('学习天数', 'Active days'));
    const weekDaysValue = el('dd', null);
    weekDaysValue.dataset.trajWeekDays = '';
    weekDaysValue.append(pairBlock('', ''));
    weekDays.append(weekDaysLabel, weekDaysValue);
    stats.append(weekMs, weekDays);
    week.append(weekTitle, weekRange, stats);

    const status = el('p', 'elp-traj-status');
    status.dataset.trajStatus = '';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.append(pairBlock('', ''));

    const days = el('ol', 'elp-traj-days');
    days.dataset.trajDays = '';
    days.setAttribute('aria-label', '按日期分组的学习记录');

    page.append(head, week, status, days);
    return page;
  }

  function createCourseRow() {
    const row = el('li', 'elp-traj-item');
    const link = el('a', 'elp-traj-item-link');
    const title = el('span', 'elp-traj-item-title');
    title.append(sourceText(''));
    const meta = el('span', 'elp-traj-item-meta');
    meta.append(pairBlock('', ''));
    link.append(title, meta);
    row.append(link);
    return row;
  }

  function itemMeta(item) {
    const zh = [];
    const en = [];
    if (item.wholeMs > 0) {
      zh.push(`整期 ${duration(item.wholeMs, 'zh')}`);
      en.push(`Full episode ${duration(item.wholeMs, 'en')}`);
    }
    if (item.coreMs > 0) {
      zh.push(`核心对话 ${duration(item.coreMs, 'zh')}`);
      en.push(`Core dialogue ${duration(item.coreMs, 'en')}`);
    }
    if (item.replays > 0) {
      zh.push(`重听 ${item.replays} 次`);
      en.push(plural(item.replays, 'replay', 'replays'));
    }
    if (item.wholeDone) {
      zh.push('整期已学完');
      en.push('Full episode done');
    }
    if (item.coreDone) {
      zh.push('核心已学完');
      en.push('Core dialogue done');
    }
    if (item.practiceDone) {
      zh.push('练习已提交');
      en.push('Practice submitted');
    }
    return {zh: zh.join(' · '), en: en.join(' · ')};
  }

  function updateCourseRow(node, item) {
    const link = node.querySelector('.elp-traj-item-link');
    if (item.href) {
      if (link.getAttribute('href') !== item.href) link.setAttribute('href', item.href);
      link.classList.remove('is-plain');
    } else {
      link.removeAttribute('href');
      link.classList.add('is-plain');
    }
    const title = node.querySelector('.elp-traj-item-title');
    setText(title.firstChild, item.title);
    const meta = itemMeta(item);
    setPair(node.querySelector('.elp-traj-item-meta'), meta.zh, meta.en);
  }

  function createDay() {
    const day = el('li', 'elp-traj-day');
    const head = el('div', 'elp-traj-day-head');
    const title = el('h3', 'elp-traj-day-title');
    const date = el('span', 'elp-traj-day-date');
    date.append(pair('', ''));
    title.append(date);
    const meta = el('p', 'elp-traj-day-meta');
    meta.append(pairBlock('', ''));
    head.append(title, meta);
    const items = el('ul', 'elp-traj-items');
    day.append(head, items);
    return day;
  }

  function updateDay(node, day) {
    const title = node.querySelector('.elp-traj-day-title');
    const index = weekdayIndex(day.date);
    setPair(title.querySelector('.elp-traj-day-date'),
      `${prettyDate(day.date, 'zh')} ${WEEKDAYS_ZH[index]}`,
      `${WEEKDAYS_EN[index]}, ${prettyDate(day.date, 'en')}`);
    const total = day.listenedMs
      || day.items.reduce((sum, item) => sum + item.wholeMs + item.coreMs, 0);
    const lessons = day.items.length;
    setPair(node.querySelector('.elp-traj-day-meta'),
      `${duration(total, 'zh')} · ${lessons} 节课`,
      `${duration(total, 'en')} · ${plural(lessons, 'lesson', 'lessons')}`);
    reconcile(node.querySelector('.elp-traj-items'), day.items, {
      key: item => item.lessonId,
      create: createCourseRow,
      update: updateCourseRow
    });
  }

  function fillPage(page, snapshot, status) {
    const zone = snapshot ? snapshot.timeZone : resolveZone();
    const today = todayKey(zone);
    const earliest = shiftDay(today, -(MAX_DAYS - 1));
    const weekStart = mondayKey(today);
    const weekEnd = shiftDay(weekStart, 6);
    setPair(page.querySelector('[data-traj-range]'),
      `最近 14 天 · ${dateRange(earliest, today, 'zh')}`,
      `Last 14 days · ${dateRange(earliest, today, 'en')}`);
    setPair(page.querySelector('[data-traj-week-range]'),
      dateRange(weekStart, weekEnd, 'zh'), dateRange(weekStart, weekEnd, 'en'));
    setPair(page.querySelector('[data-traj-week-ms]'),
      snapshot ? duration(snapshot.week.listenedMs, 'zh') : '—',
      snapshot ? duration(snapshot.week.listenedMs, 'en') : '—');
    setPair(page.querySelector('[data-traj-week-days]'),
      snapshot ? `${snapshot.week.activeDays} 天` : '—',
      snapshot ? plural(snapshot.week.activeDays, 'day', 'days') : '—');
    const message = statusText(status, snapshot);
    const pageStatus = page.querySelector('[data-traj-status]');
    setPair(pageStatus, message.zh, message.en);
    pageStatus.hidden = !message.zh;
    const days = page.querySelector('[data-traj-days]');
    reconcile(days, snapshot ? snapshot.days : [], {
      key: day => day.date,
      create: createDay,
      update: updateDay
    });
    page.dataset.trajState = status;
  }

  /* Renders the learning record page. The container is owned by the page on a
     refresh, so a second call updates the same nodes instead of rebuilding. */
  function renderPage(container, snapshot, status) {
    const target = typeof container === 'string' ? document.querySelector(container) : container;
    if (!target || typeof target.appendChild !== 'function') return;
    const view = snapshot ? normalizeSnapshot(snapshot, resolveZone(snapshot.timeZone)) : null;
    const state = normalizeStatus(status, view);
    const mount = mounts.get(target) || {};
    let page = mount.page;
    if (!page || !target.contains(page)) {
      page = buildPage();
      target.replaceChildren(page);
    }
    fillPage(page, view, state);
    mount.page = page;
    mounts.set(target, mount);
    target.classList.remove('elp-traj-study');
  }

  window.ELP_TRAJECTORY_VIEW = {mountStudy, renderPage};
})();
