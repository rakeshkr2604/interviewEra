import { ConversationTurn } from '@/components/product-preview/ConversationTurn';
import { FOLLOW_UP_PREVIEW_TURNS } from '@/components/product-preview/preview-data';
import { ProductPreviewFrame } from '@/components/product-preview/ProductPreviewFrame';

/** Adaptive follow-up thread — same bubble system as the live interview demo. */
export function FollowUpPreview() {
  return (
    <ProductPreviewFrame label="Adaptive follow-up conversation preview">
      <div className="space-y-3 p-3 sm:p-4">
        {FOLLOW_UP_PREVIEW_TURNS.map((turn) => (
          <ConversationTurn key={`${turn.label}-${turn.text}`} turn={turn} />
        ))}
      </div>
    </ProductPreviewFrame>
  );
}
