import { extract } from '../extractor';
import { parseSms } from '../parser';
import { dedupHash } from '../dedup';
import type { SmsTemplate } from '@/db/schema';

describe('extract — English', () => {
  it('parses a debit/purchase message', () => {
    const p = extract(
      'Your account has been debited with EGP 1,250.00 at CARREFOUR on 12/05/2026. Avail bal EGP 5,000.00',
    );
    expect(p.direction).toBe('out');
    expect(p.amount).toBe(1250);
    expect(p.currency).toBe('EGP');
    expect(p.merchant).toBe('CARREFOUR');
    expect(p.balance).toBe(5000);
    expect(p.occurredAt).not.toBeNull();
    expect(p.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('parses a credit/salary message', () => {
    const p = extract('USD 500.00 credited to your account from SALARY. Balance USD 2,300.00');
    expect(p.direction).toBe('in');
    expect(p.amount).toBe(500);
    expect(p.currency).toBe('USD');
    expect(p.balance).toBe(2300);
  });
});

describe('extract — Arabic', () => {
  it('parses an Arabic debit message', () => {
    const p = extract('تم خصم مبلغ 350.50 ج.م من حسابك لدى نون. الرصيد 1200 ج.م');
    expect(p.direction).toBe('out');
    expect(p.amount).toBe(350.5);
    expect(p.currency).toBe('EGP');
    expect(p.merchant).toBe('نون');
    expect(p.balance).toBe(1200);
    expect(p.language).toBe('ar');
  });

  it('parses an Arabic credit message', () => {
    const p = extract('تم إيداع مبلغ 5000 ج.م في حسابك. الرصيد المتاح 9000 ج.م');
    expect(p.direction).toBe('in');
    expect(p.amount).toBe(5000);
    expect(p.currency).toBe('EGP');
  });

  it('handles Arabic-Indic numerals', () => {
    const p = extract('تم خصم ٧٥٠٫٥٠ ج.م لدى أمازون');
    expect(p.amount).toBe(750.5);
    expect(p.direction).toBe('out');
  });
});

describe('extract — non-financial', () => {
  it('produces low confidence and no direction', () => {
    const p = extract('Hey, lets meet at 5 today!');
    expect(p.direction).toBeNull();
    expect(p.confidence).toBeLessThan(0.4);
  });
});

describe('parseSms with templates', () => {
  const template: SmsTemplate = {
    id: 'tpl1',
    sender_match: 'MYBANK',
    lang: 'auto',
    pattern: '',
    field_map: JSON.stringify({ direction: 'out', currency: 'EGP' }),
    direction_rule: null,
    default_account_id: null,
    enabled: 1,
    learned: 1,
    created_at: 0,
  };

  it('forces direction and currency from a learned template', () => {
    const p = parseSms('Transaction of 90 on card', 'MYBANK', [template]);
    expect(p.direction).toBe('out');
    expect(p.currency).toBe('EGP');
    expect(p.amount).toBe(90);
    expect(p.matchedTemplateId).toBe('tpl1');
    expect(p.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('ignores templates for other senders', () => {
    const p = parseSms('Transaction of 90 on card', 'OTHERBANK', [template]);
    expect(p.matchedTemplateId).toBeUndefined();
  });

  it('extracts named groups from a regex template', () => {
    const regexTemplate: SmsTemplate = {
      ...template,
      id: 'tpl2',
      pattern: 'spent (?<amount>[0-9.,]+) at (?<merchant>[A-Za-z]+)',
      field_map: JSON.stringify({ direction: 'out', currency: 'SAR' }),
    };
    const p = parseSms('You spent 42.75 at STARBUCKS today', 'MYBANK', [regexTemplate]);
    expect(p.amount).toBe(42.75);
    expect(p.merchant).toBe('STARBUCKS');
    expect(p.currency).toBe('SAR');
  });
});

describe('dedupHash', () => {
  it('is stable and distinguishes different messages', () => {
    const a = dedupHash('BANK', 'debit 100');
    expect(a).toBe(dedupHash('BANK', 'debit 100'));
    expect(a).not.toBe(dedupHash('BANK', 'debit 200'));
  });
});
