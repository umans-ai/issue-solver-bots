export const PLEDGE_PLAN_LABELS = {
  code_pro: 'Umans Code Pro',
  code_max: 'Umans Code Max',
} as const;

export const PLEDGE_PLAN_DETAILS = {
  code_pro: 'Up to 200 messages per five-hour window. No weekly limits.',
  code_max: 'Unlimited prompts and up to 4 guaranteed parallel agents sessions.',
} as const;

export const PLEDGE_PRICE_LABELS = {
  code_pro: {
    monthly: '$20/month',
    yearly: '$200/year',
  },
  code_max: {
    monthly: '$50/month',
    yearly: '$500/year',
  },
} as const;
