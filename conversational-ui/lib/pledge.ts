export const PLEDGE_PLAN_LABELS = {
  code_pro: 'Umans Code Pro',
  code_max: 'Umans Code Max',
} as const;

export const PLEDGE_PLAN_DETAILS = {
  code_pro: '200 prompts per 5 hours.',
  code_max: 'Unlimited prompts and 4 guaranteed parallel sessions.',
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
