/**
 * Browser half: a chat-scoped DOM observer that runs whenever the plugin is on.
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

    /** Preference key written by versions that still shipped a Settings switch. */
    const STORAGE_KEY = 'dsh-auto-work-details.enabled';

    /**
     * Bind the observer to its exact Conversation occurrence, including an
     * embedded child chat. Never enlarge an unresolved scope to the page.
     */
    function findConversationScope(host, sessionId) {
      const scope = host.closest('[data-conversation-content]');
      return scope !== null && scope.getAttribute('data-conversation-session') === sessionId
        ? scope : null;
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
      const sessionId = props.sessionId;
      const hostRef = React.useRef(null);

      React.useEffect(() => {
        if (sessionId === undefined) return;
        const host = hostRef.current;
        if (host === null) return;
        const doc = host.ownerDocument;
        const win = doc.defaultView;
        const scope = findConversationScope(host, sessionId);
        if (scope === null) return;
        const phases = new Map();
        let frame = 0;
        let stopped = false;

        const scan = () => {
          if (stopped) return;
          const alive = new Set();
          for (const group of scope.querySelectorAll('[data-step-process]')) {
            if (group.closest('[data-conversation-content]') !== scope) continue;
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
      }, [sessionId]);

      return h('div', {
        ref: hostRef,
        'data-dawd-observer': '',
        'aria-hidden': 'true',
        style: { display: 'none' },
      });
    }

    function apply(ctx) {
      // The Settings switch is gone, so the behaviour is always on. Drop the
      // preference earlier versions stored, or a page that still has "0" there
      // would keep looking configurable after the upgrade.
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // A locked-down browser simply keeps the stale key; it is never read.
      }

      ctx.effect(() => ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'auto-work-details',
        order: 100,
      }, AutoWorkDetailsObserver)), 'dsh-auto-work-details: chat observer');
    }

    return { inject: ['slots'], apply };
  },
});
