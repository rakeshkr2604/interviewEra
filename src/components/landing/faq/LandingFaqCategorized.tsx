'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { LandingFaqCategoryView, LandingFaqItem } from '@/lib/landing/faq-content';
import { LandingFaqAccordionItem } from '@/components/landing/faq/LandingFaqAccordionItem';
import { cn } from '@/lib/utils';

/** Category shape for landing + blog FAQ shells (sidebar pills + accordion panels). */
export type CategorizedFaqCategory = {
  id: string;
  label: string;
  items: readonly LandingFaqItem[];
};

type LandingFaqCategorizedProps = {
  categories: readonly CategorizedFaqCategory[] | readonly LandingFaqCategoryView[];
  heading: ReactNode;
  /** When true, every accordion item starts expanded. Homepage keeps first-only. */
  defaultOpenAll?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function LandingFaqCategorized({
  categories,
  heading,
  defaultOpenAll = false,
}: LandingFaqCategorizedProps) {
  const baseId = useId();
  const chipRailRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const chipRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const marqueeResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? 'getting-started');
  const [marqueePaused, setMarqueePaused] = useState(false);

  const pauseMarqueeBriefly = useCallback(() => {
    setMarqueePaused(true);
    if (marqueeResumeTimer.current) clearTimeout(marqueeResumeTimer.current);
    marqueeResumeTimer.current = setTimeout(() => {
      marqueeResumeTimer.current = null;
      setMarqueePaused(false);
    }, 4200);
  }, []);

  useEffect(() => {
    return () => {
      if (marqueeResumeTimer.current) clearTimeout(marqueeResumeTimer.current);
    };
  }, []);

  const focusTab = useCallback((id: string) => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const target = desktop ? tabRefs.current[id] : chipRefs.current[id];
    target?.focus();
  }, []);

  const selectCategory = useCallback(
    (id: string, options?: { focus?: boolean }) => {
      setActiveId(id);
      pauseMarqueeBriefly();

      // Only nudge the chip into view when marquee is off (reduced motion / manual scroll).
      if (prefersReducedMotion()) {
        const chip = chipRailRef.current?.querySelector<HTMLButtonElement>(
          `[data-category="${id}"]`,
        );
        chip?.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'center',
        });
      }

      if (options?.focus) focusTab(id);
    },
    [focusTab, pauseMarqueeBriefly],
  );

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const lastIndex = categories.length - 1;
      let nextIndex: number | null = null;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = index === lastIndex ? 0 : index + 1;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = index === 0 ? lastIndex : index - 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = lastIndex;
      }

      if (nextIndex === null) return;
      event.preventDefault();
      const next = categories[nextIndex];
      if (!next) return;
      selectCategory(next.id, { focus: true });
    },
    [categories, selectCategory],
  );

  const renderChipButtons = (opts: { interactive: boolean; keyPrefix: string }) =>
    categories.map((category, index) => {
      const selected = activeId === category.id;
      return (
        <button
          key={`${opts.keyPrefix}-${category.id}`}
          ref={
            opts.interactive
              ? (node) => {
                  chipRefs.current[category.id] = node;
                }
              : undefined
          }
          type="button"
          role={opts.interactive ? 'tab' : undefined}
          data-category={category.id}
          id={opts.interactive ? `${baseId}-mob-tab-${category.id}` : undefined}
          aria-selected={opts.interactive ? selected : undefined}
          aria-controls={opts.interactive ? `${baseId}-panel-${category.id}` : undefined}
          tabIndex={opts.interactive ? (selected ? 0 : -1) : -1}
          className={cn(
            'landing-faq-pill landing-faq-pill--chip',
            selected && 'landing-faq-pill--active',
          )}
          onClick={() => selectCategory(category.id)}
          onKeyDown={
            opts.interactive ? (event) => onTabKeyDown(event, index) : undefined
          }
        >
          {category.label}
        </button>
      );
    });

  return (
    <div className="landing-faq-layout">
      <div className="landing-faq-intro landing-faq-intro--desktop">{heading}</div>

      <nav className="landing-faq-nav hidden lg:block" aria-label="FAQ categories">
        <ul className="landing-faq-nav__list" role="tablist" aria-orientation="vertical">
          {categories.map((category, index) => {
            const selected = activeId === category.id;
            return (
              <li key={category.id} role="presentation">
                <button
                  ref={(node) => {
                    tabRefs.current[category.id] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-desk-tab-${category.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${category.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={cn('landing-faq-pill', selected && 'landing-faq-pill--active')}
                  onClick={() => selectCategory(category.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  {category.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="landing-faq-content min-w-0">
        <div
          ref={chipRailRef}
          className={cn(
            'landing-faq-chips landing-faq-chips--marquee -mx-4 lg:hidden',
            marqueePaused && 'landing-faq-chips--paused',
          )}
          onPointerEnter={() => setMarqueePaused(true)}
          onPointerLeave={() => setMarqueePaused(false)}
          onFocusCapture={() => setMarqueePaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setMarqueePaused(false);
            }
          }}
        >
          <div className="landing-faq-chips__track">
            <div
              className="landing-faq-chips__group"
              role="tablist"
              aria-label="FAQ categories"
            >
              {renderChipButtons({ interactive: true, keyPrefix: 'a' })}
            </div>
            {/* Duplicate set for seamless loop — not in tab order */}
            <div className="landing-faq-chips__group" aria-hidden="true">
              {renderChipButtons({ interactive: false, keyPrefix: 'b' })}
            </div>
          </div>
        </div>

        <div className="landing-faq-panels">
          {categories.map((category) => {
            const visible = activeId === category.id;

            return (
              <section
                key={category.id}
                id={`${baseId}-panel-${category.id}`}
                role="tabpanel"
                aria-label={category.label}
                hidden={!visible}
                className={cn('landing-faq-panel', visible && 'landing-faq-panel--visible')}
              >
                {visible ? (
                  <>
                    <h3 className="sr-only">{category.label}</h3>
                    <div className="landing-faq-panel__shell">
                      {category.items.map((item, index) => (
                        <LandingFaqAccordionItem
                          key={item.q}
                          panelId={`${baseId}-faq-${category.id}-${index}`}
                          question={item.q}
                          answer={item.a}
                          defaultOpen={defaultOpenAll || index === 0}
                          isLast={index === category.items.length - 1}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
