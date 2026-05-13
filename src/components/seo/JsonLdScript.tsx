interface JsonLdScriptProps {
  id: string;
  data: unknown;
}

/** Safe JSON-LD injection — pass pre-built objects from `src/lib/seo/schema/jsonld.ts`. */
export function JsonLdScript({ id, data }: JsonLdScriptProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
