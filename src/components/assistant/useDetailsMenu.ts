import { useEffect, useRef } from 'react';

// Shared dismissal for the dock's native <details> menus: outside pointer/focus closes,
// Escape closes and restores focus to the summary. `blocked` suppresses Escape while a
// modal dialog opened from the menu owns the key.
export function useDetailsMenu(blocked?: () => boolean) {
  const ref = useRef<HTMLDetailsElement>(null);
  const isBlocked = useRef(blocked);
  isBlocked.current = blocked;

  const dismiss = () => {
    ref.current?.removeAttribute('open');
    ref.current?.querySelector('summary')?.focus();
  };

  useEffect(() => {
    const close = (event: Event) => { if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute('open'); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open && !isBlocked.current?.()) {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('focusin', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('focusin', close); document.removeEventListener('keydown', escape); };
  }, []);

  return { ref, dismiss };
}
