# scoring.py
from typing import Dict, Any, List, Tuple
import math

# Weights (tuned defaults)
DEFAULT_WEIGHTS = {
    'spend': 0.08,
    'pay': 0.32,
    'minpaid': 0.22,
    'util': 0.20,
    'cash': 0.10,
    'merchant': 0.08,
    'bias': 0.00
}

FLAG_THRESHOLDS = {
    'spend_high_abs_pct': 20.0,
    'spend_med_abs_pct': 10.0,
    'pay_low_frac': 0.40,
    'pay_med_frac': 0.60,
    'minpaid_high_pct': 35.0,
    'minpaid_med_pct': 15.0,
    'util_high_pct': 85.0,
    'util_med_pct': 60.0,
    'cash_high_pct': 30.0,
    'cash_med_pct': 15.0,
    'merchant_low': 0.30,
    'merchant_med': 0.60
}

RULE_WEIGHTS = {'high_flag': 25, 'med_flag': 10, 'low_support': -10}
BLEND = {'feature': 0.5, 'rule': 0.5}

# === IMPORTANT: canonical thresholds applied to score_norm (0..1)
RISK_THRESHOLDS = {
    'low': 0.40,   # score_norm < 0.40 => Low
    'med': 0.50    # 0.40 <= score_norm < 0.50 => Medium, >=0.50 => High
}

# -- utilities
def to_float_safe(val, default=0.0) -> float:
    try:
        if val is None:
            return float(default)
        if isinstance(val, str):
            v = val.strip()
            if v == '':
                return float(default)
            if v.endswith('%'):
                v = v[:-1].strip()
            v = v.replace(',', '')
            return float(v)
        return float(val)
    except:
        return float(default)

def _first_present(row: Dict[str, Any], keys: List[str], default=None):
    for k in keys:
        if k in row and row[k] is not None:
            return row[k]
    return default

# -- sanitize
def sanitize_row(row: Dict[str, Any]) -> Dict[str, float]:
    util_raw = to_float_safe(_first_present(row, ['Utilisation %', 'Utilisation_pct', 'Utilisation', 'Utilization_pct', 'Utilization'], 0.0))
    avg_pay_raw = to_float_safe(_first_present(row, ['Avg Payment Ratio', 'Avg_Payment_Ratio', 'AvgPaymentRatio'], 0.0))
    minpaid_raw = to_float_safe(_first_present(row, ['Min Due Paid Frequency', 'Min_Due_Paid_Frequency', 'MinDuePaidFreq'], 0.0))
    cash_raw = to_float_safe(_first_present(row, ['Cash Withdrawal %', 'Cash_Withdrawal_pct', 'Cash_pct'], 0.0))
    spend_change_raw = to_float_safe(_first_present(row, ['Recent Spend Change %', 'Recent_Spend_Change_pct', 'RecentSpendChangePct'], 0.0))
    merchant_raw = to_float_safe(_first_present(row, ['Merchant Mix Index', 'Merchant_Mix_Index', 'MerchantMixIndex'], 0.0))
    credit_limit_raw = to_float_safe(_first_present(row, ['Credit Limit', 'Credit_Limit', 'Limit'], 0.0))

    util_pct = max(0.0, min(100.0, util_raw))
    avg_pay = avg_pay_raw
    if avg_pay > 1.0:
        avg_pay = max(0.0, min(100.0, avg_pay)) / 100.0
    avg_pay = max(0.0, min(1.0, avg_pay))
    minpaid_pct = max(0.0, min(100.0, minpaid_raw))
    cash_pct = max(0.0, min(100.0, cash_raw))
    spend_change_pct = max(-100.0, min(100.0, spend_change_raw))

    merchant = merchant_raw
    if merchant > 1.5:
        merchant = max(0.0, min(100.0, merchant)) / 100.0
    merchant = max(0.0, min(1.0, merchant))

    f_spend = abs(spend_change_pct) / 100.0
    f_pay = 1.0 - avg_pay
    f_minpaid = minpaid_pct / 100.0
    f_util = util_pct / 100.0
    f_cash = cash_pct / 100.0
    f_merchant = 1.0 - merchant

    return {
        'f_spend': f_spend,
        'f_pay': f_pay,
        'f_minpaid': f_minpaid,
        'f_util': f_util,
        'f_cash': f_cash,
        'f_merchant': f_merchant,
        'util_pct': round(util_pct, 2),
        'avg_pay': round(avg_pay, 3),
        'minpaid_pct': round(minpaid_pct, 2),
        'cash_pct': round(cash_pct, 2),
        'spend_change_pct': round(spend_change_pct, 2),
        'merchant_mix': round(merchant, 3),
        'credit_limit': round(credit_limit_raw, 2)
    }

# -- feature score
def compute_feature_score(features: Dict[str, float], weights: Dict[str, float]=None) -> Dict[str, Any]:
    if weights is None:
        weights = DEFAULT_WEIGHTS

    w_spend = float(weights.get('spend', 0.0))
    w_pay = float(weights.get('pay', 0.0))
    w_minpaid = float(weights.get('minpaid', 0.0))
    w_util = float(weights.get('util', 0.0))
    w_cash = float(weights.get('cash', 0.0))
    w_merchant = float(weights.get('merchant', 0.0))
    bias = float(weights.get('bias', 0.0))

    contribs = {
        'spend': round(w_spend * features.get('f_spend', 0.0), 6),
        'pay': round(w_pay * features.get('f_pay', 0.0), 6),
        'minpaid': round(w_minpaid * features.get('f_minpaid', 0.0), 6),
        'util': round(w_util * features.get('f_util', 0.0), 6),
        'cash': round(w_cash * features.get('f_cash', 0.0), 6),
        'merchant': round(w_merchant * features.get('f_merchant', 0.0), 6)
    }

    raw_score = sum(contribs.values()) + bias
    max_possible = (w_spend + w_pay + w_minpaid + w_util + w_cash + w_merchant) or 1.0
    score_norm = raw_score / (max_possible + 1e-12)
    score_norm = max(0.0, min(1.0, score_norm))

    sorted_contribs = sorted(contribs.items(), key=lambda kv: (abs(kv[1]), kv[0]), reverse=True)
    top3 = [(k, round(v, 6)) for k, v in sorted_contribs[:3]]

    return {'raw_score': round(raw_score, 6), 'score_norm': round(score_norm, 6), 'contribs': contribs, 'top3': top3}

# -- flags
def get_flags(features: Dict[str, float]) -> Dict[str, List[Tuple[str, str]]]:
    flags = {'high': [], 'medium': [], 'low_support': []}
    spend_abs = abs(features.get('spend_change_pct', 0.0))
    spend_signed = features.get('spend_change_pct', 0.0)
    avg_pay = features.get('avg_pay', 1.0)
    minpaid = features.get('minpaid_pct', 0.0)
    util = features.get('util_pct', 0.0)
    cash = features.get('cash_pct', 0.0)
    merchant = features.get('merchant_mix', 0.0)

    if spend_abs >= FLAG_THRESHOLDS['spend_high_abs_pct']:
        flags['high'].append(('spend_high', f'Large spend change: {spend_signed:+.0f}%'))
    if avg_pay <= FLAG_THRESHOLDS['pay_low_frac']:
        flags['high'].append(('pay_low', f'Low avg payment ratio: {avg_pay:.2f}'))
    if minpaid >= FLAG_THRESHOLDS['minpaid_high_pct']:
        flags['high'].append(('minpaid_high', f'Pays min-due frequently: {minpaid:.0f}%'))
    if util >= FLAG_THRESHOLDS['util_high_pct']:
        flags['high'].append(('util_high', f'High utilisation: {util:.0f}%'))
    if cash >= FLAG_THRESHOLDS['cash_high_pct']:
        flags['high'].append(('cash_high', f'High cash withdrawal: {cash:.0f}%'))
    if merchant <= FLAG_THRESHOLDS['merchant_low']:
        flags['high'].append(('merchant_low', f'Low merchant diversification: {merchant:.2f}'))

    if FLAG_THRESHOLDS['spend_med_abs_pct'] <= spend_abs < FLAG_THRESHOLDS['spend_high_abs_pct']:
        flags['medium'].append(('spend_med', f'Moderate spend change: {spend_signed:+.0f}%'))
    if FLAG_THRESHOLDS['pay_low_frac'] < avg_pay <= FLAG_THRESHOLDS['pay_med_frac']:
        flags['medium'].append(('pay_med', f'Declining payment ratio: {avg_pay:.2f}'))
    if FLAG_THRESHOLDS['minpaid_med_pct'] <= minpaid < FLAG_THRESHOLDS['minpaid_high_pct']:
        flags['medium'].append(('minpaid_med', f'Occasional min-due payments: {minpaid:.0f}%'))
    if FLAG_THRESHOLDS['util_med_pct'] <= util < FLAG_THRESHOLDS['util_high_pct']:
        flags['medium'].append(('util_med', f'Elevated utilisation: {util:.0f}%'))
    if FLAG_THRESHOLDS['cash_med_pct'] <= cash < FLAG_THRESHOLDS['cash_high_pct']:
        flags['medium'].append(('cash_med', f'Moderate cash withdrawal: {cash:.0f}%'))
    if FLAG_THRESHOLDS['merchant_med'] >= merchant > FLAG_THRESHOLDS['merchant_low']:
        flags['medium'].append(('merchant_med', f'Below-average merchant diversification: {merchant:.2f}'))

    if util < 30.0:
        flags['low_support'].append(('util_low', f'Low utilisation: {util:.0f}%'))
    if avg_pay >= 0.8:
        flags['low_support'].append(('pay_high', f'High avg payment ratio: {avg_pay:.2f}'))
    if minpaid < 15.0:
        flags['low_support'].append(('minpaid_low', f'Rarely pays only min due: {minpaid:.0f}%'))
    if spend_abs < 5.0:
        flags['low_support'].append(('spend_stable', f'Spend stable: {spend_signed:+.0f}%'))
    if cash < 10.0:
        flags['low_support'].append(('cash_low', f'Low cash withdrawal: {cash:.0f}%'))

    return flags

def compute_rule_score(flags: Dict[str, List[Tuple[str, str]]]) -> Tuple[float, Dict[str, int]]:
    n_high = len(flags.get('high', []))
    n_med = len(flags.get('medium', []))
    n_low = len(flags.get('low_support', []))
    score = (n_high * RULE_WEIGHTS['high_flag']) + (n_med * RULE_WEIGHTS['med_flag']) + (n_low * RULE_WEIGHTS['low_support'])
    score = max(0.0, min(100.0, score))
    return score, {'n_high': n_high, 'n_med': n_med, 'n_low_support': n_low}

# -- recommended actions
def get_recommended_actions(risk_class: str, features: Dict[str, float], flags: Dict[str, Any]) -> List[str]:
    actions: List[str] = []
    spend_change = features.get('spend_change_pct', 0.0)
    util = features.get('util_pct', 0.0)
    avg_pay = features.get('avg_pay', 1.0)
    minpaid = features.get('minpaid_pct', 0.0)
    cash = features.get('cash_pct', 0.0)
    merchant = features.get('merchant_mix', 0.0)

    if risk_class == 'High':
        actions.append("Immediate call within 24 hours to assess hardship & offer EMI restructuring.")
        actions.append("Send urgent SMS + email reminder with payment/repayment options.")
        if spend_change <= -15.0:
            actions.append("Large reduction in spending — discuss income/expense shock.")
        if spend_change >= 15.0:
            actions.append("Sudden spike in spending — review for potential fraud or unsustainable spend.")
        if util >= 85.0:
            actions.append("Consider temporary soft limit-reduction or alert to prevent over-limit fees.")
        if cash >= 30.0:
            actions.append("Review cash withdrawal pattern; recommend limiting cash advances (high interest).")
        return actions[:5]

    if risk_class == 'Medium':
        actions.append("Send friendly reminder (SMS/email) about upcoming payment; suggest minimum payment.")
        actions.append("Suggest enabling auto-debit or scheduled payment to avoid missed payments.")
        if avg_pay < 0.5:
            actions.append("Recommend increasing payment amount toward statement balance (show impact).")
        if abs(spend_change) >= 10.0:
            actions.append("Notify customer about recent change in spend and recommend review of expenses.")
        if util >= 60.0:
            actions.append("Advise to reduce discretionary spending; show utilization alert.")
        return actions[:5]

    actions.append("No immediate collection action required — monitor account.")
    actions.append("Consider cross-sell: pre-approved offers or limit enhancement if eligible.")
    if avg_pay >= 0.8:
        actions.append("Customer is good payer — consider loyalty offer or reward.")
    return actions[:5]

# -- main scoring
def score_row(row: Dict[str, Any], weights: Dict[str, float]=None) -> Dict[str, Any]:
    if weights is None:
        weights = DEFAULT_WEIGHTS

    features = sanitize_row(row)
    feat_res = compute_feature_score(features, weights)

    flags = get_flags(features)
    rule_score, counts = compute_rule_score(flags)
    rule_prob = rule_score / 100.0

    feature_prob = feat_res['score_norm']

    final_prob = BLEND['feature'] * feature_prob + BLEND['rule'] * rule_prob
    final_prob = max(0.0, min(1.0, final_prob))

    # --- CLASSIFICATION: USE canonical score_norm (not final_prob) ---
    score_norm = feature_prob

    if score_norm < RISK_THRESHOLDS['low']:
        risk_class = 'Low'
    elif score_norm < RISK_THRESHOLDS['med']:
        risk_class = 'Medium'
    else:
        risk_class = 'High'

    flag_reasons: List[Dict[str, Any]] = []
    for severity in ['high', 'medium', 'low_support']:
        for flag, reason in flags.get(severity, []):
            flag_reasons.append({'flag': flag, 'reason': reason, 'severity': severity})
    flag_reasons = flag_reasons[:6]

    recs = get_recommended_actions(risk_class, features, flags)

    out: Dict[str, Any] = {
        'raw_score': feat_res.get('raw_score', 0.0),
        'score_norm': round(score_norm, 6),
        # set risk_score to canonical normalized value to keep UI & labels consistent
        'risk_score': round(score_norm, 6),
        'risk_score_pct': round(score_norm * 100.0, 2),
        'top3': feat_res.get('top3', []),
        'risk_class': risk_class,
        'contribs': feat_res.get('contribs', {}),
        'recommended_actions': recs,
        'flags': flags,
        'flag_reasons': flag_reasons,
        'counts': counts,
        'final_prob': round(final_prob, 6),
        'rule_prob': round(rule_prob, 6),
        'util_pct': features.get('util_pct', 0.0),
        'avg_pay': features.get('avg_pay', 0.0),
        'minpaid_pct': features.get('minpaid_pct', 0.0),
        'cash_pct': features.get('cash_pct', 0.0),
        'spend_change_pct': features.get('spend_change_pct', 0.0),
        'merchant_mix': features.get('merchant_mix', 0.0),
        'credit_limit': features.get('credit_limit', 0.0)
    }

    return out

