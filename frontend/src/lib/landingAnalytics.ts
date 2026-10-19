import { isSupabaseEnabled, supabase } from './supabase';

const SOCIAL_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, 'facebook'],
  [/(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$/, 'tiktok'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)zalo\.me$|(^|\.)zalo\.vn$/, 'zalo'],
  [/(^|\.)messenger\.com$|(^|\.)m\.me$/, 'messenger'],
];

export async function recordLandingPageVisit() {
  if (!isSupabaseEnabled || typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source')?.trim().toLowerCase() ?? '';
  let source = utmSource;
  if (!source) {
    try {
      const host = document.referrer ? new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '') : '';
      source = SOCIAL_HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? (host ? 'other' : 'direct/unknown');
    } catch {
      source = 'direct/unknown';
    }
  }

  const { error } = await supabase.rpc('record_landing_page_visit', {
    p_referrer: document.referrer.slice(0, 2048) || null,
    p_utm_source: utmSource || source,
    p_utm_medium: params.get('utm_medium'),
    p_utm_campaign: params.get('utm_campaign'),
  });
  if (error) console.warn('Unable to record landing page source:', error.message);
}
