export type CommunityPlatformId =
  | 'whatsapp_community'
  | 'whatsapp_channel'
  | 'telegram'
  | 'discord'
  | 'newsletter'
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'x'
  | 'github'
  | 'slack'
  | 'reddit'
  | 'facebook';

export type CommunityCategory =
  | 'community'
  | 'channel'
  | 'social'
  | 'newsletter'
  | 'resource';

export type CommunityBadge = 'New' | 'Popular';

export type CommunitySurface =
  | 'landing'
  | 'dashboard'
  | 'widget'
  | 'footer'
  | 'communityPage';

export type CommunityHubSectionId =
  | 'join'
  | 'hiring'
  | 'resources'
  | 'tips'
  | 'product'
  | 'events'
  | 'social';

export interface CommunityPlatform {
  id: CommunityPlatformId;
  /** GA4 event dimension — stable snake_case */
  analyticsName: string;
  /** @deprecated Use analyticsName — kept for migration */
  platform: string;
  title: string;
  description: string;
  /** Extended copy for /community hub */
  longDescription?: string;
  url: string;
  enabled: boolean;
  comingSoon: boolean;
  category: CommunityCategory;
  displayOrder: number;
  priority: number;
  badge?: CommunityBadge;
  icon: CommunityPlatformId;
  ctaLabel?: string;
  requiresAuth: boolean;
  showOnLanding: boolean;
  showOnDashboard: boolean;
  showInWidget: boolean;
  showInFooter: boolean;
  showOnCommunityPage: boolean;
  hubSection?: CommunityHubSectionId;
  /** Emoji shown in the Connect with InterviewEra section */
  emoji?: string;
  /** Order in the Connect section (lower = first) */
  connectOrder?: number;
  showInConnectSection: boolean;
  /** e.g. "Coming soon" — shown when row is not clickable */
  connectNote?: string;
  /** Force non-clickable in Connect section even if URL exists */
  connectDisabled?: boolean;
}

export type CommunityPlacement =
  | 'landing_hero'
  | 'landing_banner'
  | 'landing_section'
  | 'landing_social_proof'
  | 'landing_footer'
  | 'landing_widget'
  | 'community_hub'
  | 'connect_section'
  | 'community_hub_faq'
  | 'dashboard_sidebar'
  | 'dashboard_card'
  | 'dashboard_banner'
  | 'dashboard_empty_state'
  | 'report_page'
  | 'credits_page'
  | 'settings_notifications'
  | 'floating_widget';

export type CommunityAnalyticsEvent =
  | 'community_banner_view'
  | 'community_banner_click'
  | 'community_banner_dismiss'
  | 'community_banner_return'
  | 'community_card_click'
  | 'community_widget_open'
  | 'community_widget_click'
  | 'community_widget_impression'
  | 'community_widget_expand'
  | 'community_widget_close'
  | 'community_page_view'
  | 'community_join_click'
  | 'community_hub_click'
  | 'platform_click'
  | 'community_conversion'
  | 'footer_community_click'
  | 'dashboard_community_click';

export interface CommunityAnalyticsContext {
  placement: CommunityPlacement | string;
  platform: string;
  route?: string;
  device?: 'mobile' | 'tablet' | 'desktop';
  authenticated?: boolean;
  referral_source?: string;
}
