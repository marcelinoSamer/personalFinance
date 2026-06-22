import { ensureNotificationPermission, notify } from './index';
import { listBudgets } from '@/db/repositories/budgets';
import { expenseByCategory } from '@/db/repositories/stats';
import { listRates } from '@/db/repositories/fxRates';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { buildRateLookup } from '@/money/fx';
import { computeBudgetStatuses } from '@/money/budgets';
import { monthRange } from '@/ui/date';
import { categoryLabel } from '@/ui/labels';
import { t } from '@/i18n';

/**
 * Checks each budget's spend for the current month and fires a local
 * notification when it crosses 90% or 100%, at most once per level per month.
 */
export async function checkBudgetsAndNotify(): Promise<void> {
  const budgets = await listBudgets();
  if (budgets.length === 0) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const range = monthRange();
  const [rows, rates] = await Promise.all([
    expenseByCategory(range.from, range.to),
    listRates(),
  ]);
  const lookup = buildRateLookup(rates);
  const statuses = computeBudgetStatuses(budgets, rows, lookup);

  const d = new Date();
  const ym = d.getFullYear() * 100 + (d.getMonth() + 1);

  for (const st of statuses) {
    const level = st.percent >= 100 ? 100 : st.percent >= 90 ? 90 : 0;
    if (level === 0) continue;

    const key = `budget_notified_${st.budget.id}_${ym}`;
    const prev = Number((await getSetting(key)) ?? '0');
    if (level <= prev) continue;

    const name = st.budget.category_id
      ? categoryLabel({ id: st.budget.category_id, name: st.budget.category_name ?? '' })
      : t('budgets.overall');
    await notify(
      t('budgets.alertTitle'),
      t('budgets.alertBody', {
        category: name,
        percent: Math.round(st.percent),
        period: t('budgets.monthly'),
      }),
    );
    await setSetting(key, String(level));
  }
}
