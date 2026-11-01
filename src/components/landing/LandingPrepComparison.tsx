import { Check, Minus, X } from 'lucide-react';
import { Reveal } from '@/components/landing/landing-home-shared';
import { HOME_PREP_COMPARISON, type PrepComparisonCell } from '@/lib/landing/home-content';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';
import '@/components/landing/LandingHomeSections.css';

const VALUE_LABEL: Record<PrepComparisonCell['value'], string> = {
  yes: 'Yes',
  partial: 'Partly',
  no: 'No',
};

function CellMark({ value }: { value: PrepComparisonCell['value'] }) {
  const Icon = value === 'yes' ? Check : value === 'partial' ? Minus : X;
  return (
    <span className={cn('ie-cmp-mark', `ie-cmp-mark--${value}`)}>
      <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
      <span className="sr-only">{VALUE_LABEL[value]}: </span>
    </span>
  );
}

/**
 * Balanced comparison against generic preparation approaches (never named competitors).
 * Desktop: table. Phones: one card per approach so nothing scrolls sideways.
 */
export function LandingPrepComparison() {
  const { columns, rows } = HOME_PREP_COMPARISON;
  const highlight = columns.length - 1;

  return (
    <section
      className="landing-prep-comparison px-4 py-16 sm:px-5 sm:py-20"
      aria-labelledby="prep-comparison-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <Reveal className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>{HOME_PREP_COMPARISON.eyebrow}</span>
          <h2 id="prep-comparison-heading" className={LANDING_HOME_HEADING}>
            {HOME_PREP_COMPARISON.title}
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>{HOME_PREP_COMPARISON.subtitle}</p>
        </Reveal>

        <Reveal delay={0.06} className="mx-auto mt-10 max-w-5xl">
          <div className="ie-cmp-table-wrap">
            <table className="ie-cmp-table">
              <caption className="sr-only">Comparison of interview preparation approaches</caption>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  {columns.map((column, i) => (
                    <th key={column} scope="col" className={cn(i === highlight && 'ie-cmp-highlight')}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.capability}>
                    <th scope="row">{row.capability}</th>
                    {row.cells.map((cell, i) => (
                      <td key={columns[i]} className={cn(i === highlight && 'ie-cmp-highlight')}>
                        <span className="ie-cmp-cell">
                          <CellMark value={cell.value} />
                          <span>{cell.note}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="ie-cmp-cards">
            {columns.map((column, ci) => (
              <li key={column} className={cn('ie-cmp-card', ci === highlight && 'ie-cmp-card--highlight')}>
                <h3 className="ie-cmp-card__title">{column}</h3>
                <ul className="ie-cmp-card__rows">
                  {rows.map((row) => (
                    <li key={row.capability}>
                      <CellMark value={row.cells[ci].value} />
                      <span>
                        <span className="ie-cmp-card__cap">{row.capability}</span>
                        <span className="ie-cmp-card__note">{row.cells[ci].note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <p className="ie-cmp-footnote">{HOME_PREP_COMPARISON.footnote}</p>
        </Reveal>
      </div>
    </section>
  );
}
