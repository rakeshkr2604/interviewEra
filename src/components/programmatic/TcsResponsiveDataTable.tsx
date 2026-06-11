import {
  TCS_TABLE_ACCENTS_2COL,
  TCS_TABLE_ACCENTS_3COL,
  TCS_TABLE_ACCENTS_4COL,
} from '@/lib/seo/programmatic/tcs-hub'

type DataRow = readonly string[]
export type ColumnAccent = 'dim' | 'ba' | 'da' | 'pm' | 'default'

function thAccentClass(accent: ColumnAccent): string {
  if (accent === 'dim') return 'ie-role-ba-compare-table__th--dim'
  if (accent === 'ba') return 'ie-role-ba-compare-table__th--ba'
  if (accent === 'da') return 'ie-role-ba-compare-table__th--da'
  if (accent === 'pm') return 'ie-role-ba-compare-table__th--pm'
  return ''
}

function cellAccentClass(accent: ColumnAccent): string {
  if (accent === 'ba') return 'ie-role-ba-compare-table__cell--ba'
  if (accent === 'da') return 'ie-role-ba-compare-table__cell--da'
  if (accent === 'pm') return 'ie-role-ba-compare-table__cell--pm'
  return ''
}

function rowThAccentClass(accent: ColumnAccent | undefined): string {
  if (accent === 'ba') return 'ie-role-ba-compare-table__dim--ba'
  if (accent === 'da') return 'ie-role-ba-compare-table__dim--da'
  if (accent === 'pm') return 'ie-role-ba-compare-table__dim--pm'
  return ''
}

function mobileRowAccentClass(accent: ColumnAccent): string {
  if (accent === 'ba') return 'ie-tcs-data-table__card-row--ba'
  if (accent === 'da') return 'ie-tcs-data-table__card-row--da'
  if (accent === 'pm') return 'ie-tcs-data-table__card-row--pm'
  return ''
}

function mobileCardAccentClass(accent: ColumnAccent | undefined): string {
  if (accent === 'ba') return 'ie-tcs-data-table__card--ba'
  if (accent === 'da') return 'ie-tcs-data-table__card--da'
  if (accent === 'pm') return 'ie-tcs-data-table__card--pm'
  return ''
}

function resolveMobileCardClass(rowLabel: string, rowAccent: ColumnAccent | undefined): string {
  const normalized = rowLabel.toLowerCase()
  if (normalized.includes('prime')) return 'ie-tcs-data-table__card--pm'
  if (normalized.includes('digital')) return 'ie-tcs-data-table__card--da'
  if (normalized === 'ninja') return 'ie-tcs-data-table__card--ba'
  return mobileCardAccentClass(rowAccent)
}

function defaultColumnAccents(columnCount: number): ColumnAccent[] {
  if (columnCount === 2) return [...TCS_TABLE_ACCENTS_2COL]
  if (columnCount === 3) return [...TCS_TABLE_ACCENTS_3COL]
  if (columnCount === 4) return [...TCS_TABLE_ACCENTS_4COL]
  if (columnCount > 4) {
    const base = [...TCS_TABLE_ACCENTS_4COL]
    while (base.length < columnCount) {
      base.push('dim')
    }
    return base.slice(0, columnCount)
  }
  return Array.from({ length: columnCount }, (_, index) => (index === 0 ? 'dim' : 'default'))
}

function resolveColumnAccents(
  columns: readonly string[],
  columnAccents?: readonly ColumnAccent[],
): ColumnAccent[] {
  if (columnAccents && columnAccents.length === columns.length) {
    return [...columnAccents]
  }
  return defaultColumnAccents(columns.length)
}

function tableLayoutClass(columnCount: number): string {
  if (columnCount === 2) return 'ie-role-ba-compare-table--2col'
  if (columnCount >= 4) return 'ie-role-ba-compare-table--5col'
  return 'ie-role-ba-compare-table--3col'
}

export function TcsResponsiveDataTable({
  caption,
  columns,
  rows,
  tableClassName = '',
  columnAccents,
  rowAccents,
}: {
  caption: string
  columns: readonly string[]
  rows: readonly DataRow[]
  tableClassName?: string
  /** Per-column accent: dim, ba, da (Digital green), pm (Prime amber). Defaults by column count. */
  columnAccents?: readonly ColumnAccent[]
  /** Per-row accent on the section/dimension label column + mobile card tint */
  rowAccents?: readonly ColumnAccent[]
}) {
  const accents = resolveColumnAccents(columns, columnAccents)
  const layoutClass = tableClassName || tableLayoutClass(columns.length)

  return (
    <div className="ie-tcs-data-table ie-tcs-data-table--themed">
      <div className="ie-tcs-data-table__desktop ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid">
        <table className={`ie-role-ba-compare-table ie-tcs-data-table__table ${layoutClass}`.trim()}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col}
                  scope="col"
                  className={`ie-role-ba-compare-table__th ${thAccentClass(accents[index])}`.trim()}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row[0]}>
                <th
                  scope="row"
                  className={`ie-role-ba-compare-table__dim ${rowThAccentClass(rowAccents?.[rowIndex])}`.trim()}
                >
                  {row[0]}
                </th>
                {row.slice(1).map((cell, cellIndex) => {
                  const accent = accents[cellIndex + 1] ?? 'default'
                  return (
                    <td
                      key={`${row[0]}-${cellIndex}`}
                      className={`ie-role-ba-compare-table__cell ${cellAccentClass(accent)}`.trim()}
                    >
                      {cell}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ie-tcs-data-table__mobile" aria-label={caption}>
        {rows.map((row, rowIndex) => (
          <section
            key={row[0]}
            className={`ie-tcs-data-table__card ${resolveMobileCardClass(row[0], rowAccents?.[rowIndex])}`.trim()}
          >
            <h3 className="ie-tcs-data-table__card-title">{row[0]}</h3>
            <dl className="ie-tcs-data-table__card-dl">
              {columns.map((col, index) => (
                <div
                  key={col}
                  className={`ie-tcs-data-table__card-row ${mobileRowAccentClass(accents[index])}`.trim()}
                >
                  <dt>{col}</dt>
                  <dd>{row[index]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  )
}
