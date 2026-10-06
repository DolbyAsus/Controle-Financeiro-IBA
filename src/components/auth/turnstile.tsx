"use client";

import Script from "next/script";
import { ShieldCheck } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type TurnstileWidgetId = string;

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
    },
  ) => TurnstileWidgetId;
  reset: (widgetId?: TurnstileWidgetId) => void;
  remove: (widgetId: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = {
  reset: () => void;
};

type TurnstileProps = {
  action: string;
  onTokenChange: (token: string | null) => void;
};

/**
 * Explicit rendering lets every auth form own and reset its single-use token.
 * The actual verification happens in Supabase Auth, never in the browser.
 */
export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(
  function Turnstile({ action, onTokenChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
    const onTokenChangeRef = useRef(onTokenChange);
    const [verified, setVerified] = useState(false);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    onTokenChangeRef.current = onTokenChange;

    const renderWidget = () => {
      if (
        !siteKey ||
        !containerRef.current ||
        widgetIdRef.current ||
        !window.turnstile
      )
        return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        size: "flexible",
        callback: (token) => {
          setVerified(true);
          onTokenChangeRef.current(token);
        },
        "expired-callback": () => {
          setVerified(false);
          onTokenChangeRef.current(null);
        },
        "error-callback": () => {
          setVerified(false);
          onTokenChangeRef.current(null);
        },
      });
    };

    useImperativeHandle(ref, () => ({
      reset() {
        setVerified(false);
        onTokenChangeRef.current(null);
        if (widgetIdRef.current && window.turnstile)
          window.turnstile.reset(widgetIdRef.current);
      },
    }));

    useEffect(() => {
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile)
          window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      };
      // `siteKey` and `action` are build-time stable for each page.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey, action]);

    if (!siteKey) {
      return (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        >
          A proteção de acesso ainda está sendo configurada.
        </p>
      );
    }

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={renderWidget}
        />
        <div
          className="overflow-hidden rounded-xl border border-border/80 bg-muted/40 px-3 py-2 shadow-sm transition-[max-height,opacity,padding] duration-200 motion-reduce:transition-none"
          data-state={verified ? "verified" : "pending"}
        >
          <div
            className={
              verified
                ? "pointer-events-none flex max-h-0 justify-center overflow-hidden opacity-0"
                : "flex max-h-24 justify-center opacity-100"
            }
            aria-hidden={verified}
          >
            <div
              ref={containerRef}
              aria-label="Verificação de segurança"
              className="flex min-h-[65px] items-center justify-center"
            />
          </div>
          <p
            className={
              verified
                ? "flex items-center justify-center gap-2 py-1 text-sm font-medium text-emerald-700"
                : "sr-only"
            }
            role="status"
            aria-live="polite"
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            Verificação de segurança concluída
          </p>
        </div>
      </>
    );
  },
);
