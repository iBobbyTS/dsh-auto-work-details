/**
 * Browser half: one Settings switch plus a chat-scoped DOM observer.
 *
 * This is intentionally a userland workaround. DSH's Chat package owns the
 * process-group disclosure state, so the only public seam for this behaviour
 * is the rendered group: [data-shimmer] means the segment is still running,
 * and the header button's aria-expanded is its current disclosure.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-auto-work-details',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dshAutoWorkDetails';
    const STORAGE_KEY = 'dsh-auto-work-details.enabled';

    const translations = {
      en: {
        title: 'Expand process, collapse when done',
        description: 'While a work segment runs, keep its group open at the standard height and follow the bottom. Collapse that group when the segment ends. Applies to modes that render group headers.',
        switchLabel: 'Expand process, collapse when done',
      },
      zh: {
        title: '展开过程，完成后收起',
        description: '工作段运行期间，将过程组展开到标准高度并跟随底部；这一段结束后自动收起该组。仅对显示过程组头的模式生效。',
        switchLabel: '展开过程，完成后收起',
      },
    };

    const CSS = `
      .dawd-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 0;
        border-bottom: 0.5px solid var(--dsw-alias-border-l2);
      }
      .dawd-row-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-right: 48px;
      }
      .dawd-title {
        font-size: 14px;
        font-weight: 400;
        line-height: 22px;
        color: var(--dsw-alias-label-primary);
      }
      .dawd-desc {
        font-size: 12px;
        font-weight: 400;
        line-height: 18px;
        color: var(--dsw-alias-label-tertiary);
      }
      .dawd-switch {
        box-sizing: border-box;
        position: relative;
        flex: 0 0 auto;
        width: 36px;
        height: 20px;
        padding: 2px;
        border: 0;
        border-radius: 999px;
        corner-shape: round;
        background: var(--dsw-alias-border-l3);
        cursor: pointer;
      }
      .dawd-switch[aria-checked='true'] {
        background: var(--dsw-alias-brand-primary);
      }
      .dawd-switch:focus-visible {
        outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
        outline-offset: 2px;
      }
      .dawd-thumb {
        display: block;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        corner-shape: round;
        background: var(--dsw-alias-label-primary-foreground);
        transition: transform 120ms ease;
      }
      .dawd-switch[aria-checked='false'] .dawd-thumb {
        background: var(--dsw-alias-switch-thumb);
      }
      .dawd-switch[aria-checked='true'] .dawd-thumb {
        transform: translateX(16px);
      }
      @media (prefers-reduced-motion: reduce) {
        .dawd-thumb { transition: none; }
      }
    `;

    function readEnabled() {
      try {
        return window.localStorage.getItem(STORAGE_KEY) !== '0';
      } catch {
        return true;
      }
    }

    // The module is shared by the Settings row and every mounted composer, so
    // one small external store keeps the switch live without a Host round-trip.
    let enabled = true;
    const listeners = new Set();
    const subscribeEnabled = (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    };
    const getEnabled = () => enabled;
    function publishEnabled(next) {
      if (enabled === next) return;
      enabled = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // A locked-down browser still gets the in-memory preference for this page.
      }
      for (const listener of [...listeners]) listener();
    }

    /**
     * Find the conversation that owns this composer. Each pane has its own
     * main.conversation slot, so the observer never reaches into another chat.
     */
    function findConversationScope(host) {
      return host.closest('[data-slot="main.conversation"]')
        ?? host.closest('[data-chat-flow]')
        ?? host.ownerDocument.body;
    }

    function isRendered(element) {
      if (element.closest('[hidden]') !== null) return false;
      return element.getClientRects().length > 0;
    }

    /**
     * Toggle a group header without letting its onClick focus steal the caret
     * from the composer. The handler calls currentTarget.focus(); an own-property
     * no-op shadows that call for exactly this synthetic click.
     */
    function clickHeader(button) {
      const hadOwnFocus = Object.prototype.hasOwnProperty.call(button, 'focus');
      const previousFocus = button.focus;
      button.focus = () => {};
      try {
        button.click();
      } finally {
        if (hadOwnFocus) button.focus = previousFocus;
        else delete button.focus;
      }
    }

    /**
     * Watch only the active conversation. A new group starts collapsed, so the
     * first running observation opens it; the first non-running observation
     * after that collapses it. Later user toggles during the same segment are
     * not fought because the state machine only reacts to phase transitions.
     */
    function AutoWorkDetailsObserver(props) {
      const on = React.useSyncExternalStore(subscribeEnabled, getEnabled, getEnabled);
      const sessionId = props.sessionId;
      const hostRef = React.useRef(null);

      React.useEffect(() => {
        if (!on || sessionId === undefined) return;
        const host = hostRef.current;
        if (host === null) return;
        const doc = host.ownerDocument;
        const win = doc.defaultView;
        const scope = findConversationScope(host);
        const phases = new Map();
        let frame = 0;
        let stopped = false;

        const scan = () => {
          if (stopped) return;
          const alive = new Set();
          for (const group of scope.querySelectorAll('[data-step-process]')) {
            if (!isRendered(group)) continue;
            // A whole-Turn fold owns the visibility animation; do not race it.
            if (group.closest('[data-chat-motion="collapse"]') !== null) continue;
            const header = group.querySelector(':scope > div > button[aria-expanded]');
            if (header === null || !isRendered(header)) continue;
            const key = group.getAttribute('data-chat-group-key');
            if (key === null) continue;
            alive.add(key);
            const running = header.querySelector('[data-shimmer]') !== null;
            const open = header.getAttribute('aria-expanded') === 'true';
            let phase = phases.get(key);
            if (phase === undefined) {
              phase = { running: false };
              phases.set(key, phase);
            }
            if (running && !phase.running) {
              phase.running = true;
              if (!open) clickHeader(header);
            } else if (!running && phase.running) {
              phase.running = false;
              if (open) clickHeader(header);
            }
          }
          for (const key of [...phases.keys()]) {
            if (!alive.has(key)) phases.delete(key);
          }
        };

        const schedule = () => {
          if (stopped || frame !== 0) return;
          frame = win.requestAnimationFrame(() => {
            frame = 0;
            scan();
          });
        };

        const observer = new win.MutationObserver(schedule);
        observer.observe(scope, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['data-shimmer', 'aria-expanded', 'hidden', 'data-chat-motion'],
        });
        const onVisible = () => {
          if (doc.visibilityState === 'visible') schedule();
        };
        win.addEventListener('focus', schedule);
        doc.addEventListener('visibilitychange', onVisible);
        schedule();

        return () => {
          stopped = true;
          observer.disconnect();
          win.removeEventListener('focus', schedule);
          doc.removeEventListener('visibilitychange', onVisible);
          if (frame !== 0) win.cancelAnimationFrame(frame);
        };
      }, [on, sessionId]);

      return h('div', {
        ref: hostRef,
        'data-dawd-observer': '',
        'aria-hidden': 'true',
        style: { display: 'none' },
      });
    }

    function createRow(ctx) {
      const subscribeLocale = (listener) => ctx.locale.subscribe(listener);
      const getLocale = () => ctx.locale.getSnapshot();
      function AutoWorkDetailsRow() {
        React.useSyncExternalStore(subscribeLocale, getLocale, getLocale);
        const on = React.useSyncExternalStore(subscribeEnabled, getEnabled, getEnabled);
        const t = ctx.locale.bind(NS);
        return h('div', { className: 'dawd-row' },
          h('div', { className: 'dawd-row-text' },
            h('div', { className: 'dawd-title' }, t('title')),
            h('div', { className: 'dawd-desc' }, t('description'))),
          h('button', {
            type: 'button',
            role: 'switch',
            className: 'dawd-switch',
            'aria-checked': on,
            'aria-label': t('switchLabel'),
            onClick: () => { publishEnabled(!on); },
          }, h('span', { className: 'dawd-thumb' })));
      }
      return AutoWorkDetailsRow;
    }

    function apply(ctx) {
      enabled = readEnabled();

      ctx.effect(() => ctx.locale.register(NS, translations), 'dsh-auto-work-details: locales');
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.dshAutoWorkDetails = 'true';
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => { style.remove(); };
      }, 'dsh-auto-work-details: styles');
      ctx.effect(() => {
        const onStorage = (event) => {
          if (event.key !== STORAGE_KEY) return;
          enabled = readEnabled();
          for (const listener of [...listeners]) listener();
        };
        window.addEventListener('storage', onStorage);
        return () => { window.removeEventListener('storage', onStorage); };
      }, 'dsh-auto-work-details: storage');
      ctx.effect(() => ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'auto-work-details',
        order: 13,
        locale: NS,
      }, createRow(ctx))), 'dsh-auto-work-details: settings row');
      ctx.effect(() => ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'auto-work-details',
        order: 100,
      }, AutoWorkDetailsObserver)), 'dsh-auto-work-details: chat observer');
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
