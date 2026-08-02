'use client';

import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { LandingFaqCategoryId, LandingFaqCategoryView } from '@/lib/landing/faq-content';
import { LandingFaqAccordionItem } from '@/components/landing/faq/LandingFaqAccordionItem';
import { cn } from '@/lib/utils';

type LandingFaqCategorizedProps = {
  categories: readonly LandingFaqCategoryView[];
  heading: ReactNode;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function LandingFaqCategorized({ categories, heading }: LandingFaqCategorizedProps) {
  const baseId = useId();
  const chipRailRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Partial<Record<LandingFaqCategoryId, HTMLButtonElement | null>>>({});
  const [activeId, setActiveId] = useState<LandingFaqCategoryId>(categories[0]?.id ?? 'getting-started');

  const focusTab = useCallback(
    (id: LandingFaqCategoryId) => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      const target = desktop ? tabRefs.current[id] : chipRefs.current[id];
      target?.focus();
    },
    [],
  );

  const chipRefs = useRef<Partial<Record<LandingFaqCategoryId, HTMLButtonElement | null>>>({});

  const selectCategory = useCallback(
    (id: LandingFaqCategoryId, options?: { focus?: boolean }) => {
      setActiveId(id);
      const chip = chipRailRef.current?.querySelector<HTMLButtonElement>(`[data-category="${id}"]`);
      chip?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      if (options?.focus) focusTab(id);
    },
    [focusTab],
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
          className="landing-faq-chips -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
          role="tablist"
          aria-label="FAQ categories"
        >
          {categories.map((category, index) => {
            const selected = activeId === category.id;
            return (
              <button
                key={category.id}
                ref={(node) => {
                    chipRefs.current[category.id] = node;
                  }}
                  type="button"
                  role="tab"
                  data-category={category.id}
                  id={`${baseId}-mob-tab-${category.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${category.id}`}
                tabIndex={selected ? 0 : -1}
                className={cn('landing-faq-pill landing-faq-pill--chip', selected && 'landing-faq-pill--active')}
                onClick={() => selectCategory(category.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                {category.label}
              </button>
            );
          })}
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
                          defaultOpen={index === 0}
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
