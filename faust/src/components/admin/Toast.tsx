"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

/**
 * The only feedback channel in the admin area.
 *
 * One line, past tense, gone in a few seconds: «Збережено», «Позицію
 * видалено». No animation — a tool confirms, it does not perform. The stack
 * lives in the protected layout, so a toast survives the navigation that
 * follows a save.
 */

type ToastTone = "success" | "error";

type ToastEntry = { id: number; text: string; tone: ToastTone };

type ToastContextValue = { show: (text: string, tone?: ToastTone) => void };

const LIFETIME_MS = 5000;

/**
 * Outside the provider a toast has nowhere to go. That is a wiring mistake, not
 * something the owner can cause, so it is reported to the console instead of
 * breaking the page they are working on.
 */
const ToastContext = createContext<ToastContextValue>({
  show: (text) => console.error(`[admin] a toast was shown outside the provider: ${text}`),
});

export const useToast = (): ToastContextValue => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const show = useCallback((text: string, tone: ToastTone = "success") => {
    const id = nextId.current;
    nextId.current += 1;

    setEntries((current) => [...current, { id, text, tone }]);

    setTimeout(() => {
      setEntries((current) => current.filter((entry) => entry.id !== id));
    }, LIFETIME_MS);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className={styles.stack} aria-live="polite">
        {entries.map((entry) => (
          <p
            key={entry.id}
            className={entry.tone === "error" ? `${styles.toast} ${styles.error}` : styles.toast}
            role={entry.tone === "error" ? "alert" : "status"}
          >
            {entry.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
