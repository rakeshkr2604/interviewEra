import * as React from 'react';

export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  isNew?: boolean;
  fullWidth?: boolean;
}

function NewBadge() {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '9px',
        fontWeight: '700',
        color: '#7c3aed',
        backgroundColor: '#ede9fe',
        borderRadius: '4px',
        padding: '2px 6px',
        marginLeft: '6px',
        verticalAlign: 'middle',
        letterSpacing: '0.06em',
        lineHeight: '14px',
      }}
      className="new-badge"
    >
      NEW
    </span>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  isNew = false,
  fullWidth = false,
}: FeatureCardProps) {
  return (
    <table
      border={0}
      cellPadding={0}
      cellSpacing={0}
      width="100%"
      style={{
        backgroundColor: '#fafafa',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        marginBottom: fullWidth ? '10px' : '10px',
      }}
      className="feature-card"
    >
      <tr>
        <td style={{ padding: '14px' }}>
          <table border={0} cellPadding={0} cellSpacing={0} width="100%">
            <tr>
              <td valign="top" width="36" style={{ paddingRight: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '32px',
                    height: '32px',
                    lineHeight: '32px',
                    textAlign: 'center',
                    fontSize: '16px',
                    borderRadius: '8px',
                    backgroundColor: '#f5f3ff',
                  }}
                  className="feature-icon-bg"
                >
                  {icon}
                </span>
              </td>
              <td valign="top">
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#111827',
                    margin: '0 0 3px 0',
                    lineHeight: '18px',
                  }}
                  className="text-primary"
                >
                  {title}
                  {isNew ? <NewBadge /> : null}
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    lineHeight: '18px',
                    color: '#6b7280',
                    margin: 0,
                  }}
                  className="text-secondary"
                >
                  {description}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
}

interface FeatureGridProps {
  children: React.ReactNode;
}

export function FeatureGrid({ children }: FeatureGridProps) {
  const items = React.Children.toArray(children);

  const rows: React.ReactNode[][] = [];
  let currentRow: React.ReactNode[] = [];

  items.forEach((child) => {
    if (!React.isValidElement(child)) return;

    const isFullWidth = (child.props as FeatureCardProps).fullWidth === true;

    if (isFullWidth) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      rows.push([child]);
      return;
    }

    currentRow.push(child);
    if (currentRow.length === 2) {
      rows.push(currentRow);
      currentRow = [];
    }
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return (
    <>
      {rows.map((row, rowIndex) => {
        if (
          row.length === 1 &&
          React.isValidElement(row[0]) &&
          (row[0].props as FeatureCardProps).fullWidth
        ) {
          return <React.Fragment key={rowIndex}>{row[0]}</React.Fragment>;
        }

        return (
          <table
            key={rowIndex}
            border={0}
            cellPadding={0}
            cellSpacing={0}
            width="100%"
            className="feature-grid-row"
          >
            <tr>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  valign="top"
                  width={row.length === 1 ? '100%' : '50%'}
                  className="feature-grid-cell"
                  style={{
                    width: row.length === 1 ? '100%' : '50%',
                    paddingRight: row.length === 2 && cellIndex === 0 ? '5px' : '0',
                    paddingLeft: row.length === 2 && cellIndex === 1 ? '5px' : '0',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </table>
        );
      })}
    </>
  );
}

interface ProductPreviewProps {
  href: string;
  imageUrl: string;
  alt: string;
  caption?: string;
}

export function ProductPreview({ href, imageUrl, alt, caption }: ProductPreviewProps) {
  return (
    <table
      border={0}
      cellPadding={0}
      cellSpacing={0}
      width="100%"
      style={{ margin: '0 0 24px 0' }}
      className="product-preview"
    >
      <tr>
        <td
          align="center"
          style={{
            padding: '16px',
            backgroundColor: '#faf5ff',
            border: '1px solid #ede9fe',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
          }}
          className="product-preview-frame"
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', textDecoration: 'none' }}
          >
            <img
              src={imageUrl}
              alt={alt}
              width="504"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: '504px',
                height: 'auto',
                margin: '0 auto',
                borderRadius: '12px',
                border: '1px solid #ddd6fe',
                boxShadow: '0 8px 24px -6px rgba(124, 58, 237, 0.18)',
              }}
              className="product-preview-image"
            />
          </a>
          {caption ? (
            <p
              style={{
                fontSize: '12px',
                lineHeight: '18px',
                color: '#6b7280',
                textAlign: 'center',
                margin: '14px 0 0 0',
                fontWeight: '500',
              }}
              className="text-secondary"
            >
              {caption}
            </p>
          ) : null}
        </td>
      </tr>
    </table>
  );
}
