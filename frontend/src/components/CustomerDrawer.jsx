import React from "react";

/**
 * CustomerDrawer - improved, safe, drop-in replacement.
 * Props: { open, onClose, customer }
 *
 * This component is defensive: it works if customer fields exist in multiple formats.
 */

function SmallBar({ value }) {
    // value expected 0..1 or 0..100; normalize to 0..1
    let v = Number(value || 0);
    if (v > 1.5) v = v / 100.0;
    v = Math.max(0, Math.min(1, v));
    return (
        <div className="w-full bg-gray-100 rounded-full h-2">
            <div
                className="h-2 rounded-full"
                style={{
                    width: `${(v * 100).toFixed(2)}%`,
                    background: "linear-gradient(90deg,#60a5fa,#2563eb)",
                }}
            />
        </div>
    );
}

function RiskBadge({ level }) {
    if (!level) return null;
    const map = {
        High: "bg-red-100 text-red-700",
        Medium: "bg-yellow-100 text-yellow-700",
        Low: "bg-green-100 text-green-700",
    };
    return (
        <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold ${map[level] ?? "bg-gray-100 text-gray-700"}`}
        >
            {level}
        </span>
    );
}

function fmtPct(v, d = 1) {
    if (v === undefined || v === null || v === "") return "-";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    // if likely 0..1 convert to percent
    if (Math.abs(n) <= 1.01) return `${(n * 100).toFixed(d)}%`;
    return `${n.toFixed(d)}%`;
}

function fmtNum(v, d = 2) {
    if (v === undefined || v === null || v === "") return "-";
    const n = Number(v);
    return isNaN(n) ? String(v) : n.toFixed(d);
}

export default function CustomerDrawer({ open, onClose, customer }) {
    if (!open) return null;

    // defensive getters for fields that may have different names in your payload
    const customerId = customer?.["Customer ID"] ?? customer?.customer_id ?? customer?.Customer_ID ?? "-";
    const riskClass = customer?.risk_class ?? customer?.risk ?? "-";
    // prefer canonical normalized score, fall back to score_norm or raw display fields
    const score = (() => {
        if (customer?.risk_score !== undefined) return Number(customer.risk_score);
        if (customer?.score_norm !== undefined) return Number(customer.score_norm);
        if (customer?.score !== undefined) return Number(customer.score);
        return null;
    })();

    // Top contributors may be provided as `top3` (array) or `top3_contribs` (string)
    const top3Raw = customer?.top3 ?? customer?.top3_contribs ?? [];
    let top3 = [];
    if (Array.isArray(top3Raw)) {
        top3 = top3Raw.slice(0, 3);
    } else if (typeof top3Raw === "string") {
        // try to parse a printed python list "[( 'pay', 0.25 ), ...]"
        try {
            const matches = top3Raw.match(/\('?([\w]+)'?,\s*([0-9.+-eE]+)\)/g) || [];
            top3 = matches.map((m) => {
                const parts = m.replace(/[()']/g, "").split(",");
                return [parts[0].trim(), Number(parts[1])];
            }).slice(0, 3);
        } catch (e) {
            top3 = [];
        }
    }

    const recs = Array.isArray(customer?.recommended_actions) ? customer.recommended_actions : (customer?.recommended_actions || []);
    // helper numeric features (safe fallbacks)
    const utilPct = customer?.util_pct ?? customer?.["Utilisation %"] ?? customer?.Utilisation ?? null;
    const avgPay = customer?.avg_pay ?? customer?.["Avg Payment Ratio"] ?? null; // may be 0..1 or 0..100
    const minPaid = customer?.minpaid_pct ?? customer?.["Min Due Paid Frequency"] ?? null;
    const merchant = customer?.merchant_mix ?? customer?.["Merchant Mix Index"] ?? null;
    const cash = customer?.cash_pct ?? customer?.["Cash Withdrawal %"] ?? null;
    const spend = customer?.spend_change_pct ?? customer?.["Recent Spend Change %"] ?? null;
    const creditLimit = customer?.credit_limit ?? customer?.["Credit Limit"] ?? null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>

            <div className="absolute right-0 top-0 h-full w-[420px] bg-white shadow-lg p-4 overflow-auto">




                {/* Suggested Actions */}

                <div className="flex justify-between items-start mb-4">
                    <div style={{ flex: 1 }}>
                        <div className="text-sm text-black-500">
                            Customer ID: <span className="font-bold text-lg text-gray-800">{customerId}</span>
                        </div>


                        {/* --- Suggested Next Steps box (moved into header area) --- */}
                        <div className="mt-3 bg-gray-50 border rounded p-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm font-medium">Suggested Next Steps:</div>

                                </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-700">
                                {riskClass === "High" && <div>Call customer & offer EMI/restructuring. Log the attempt.</div>}
                                {riskClass === "Medium" && <div>Send reminder SMS & suggest auto-debit.</div>}
                                {riskClass === "Low" && <div>No immediate action — consider retention offer.</div>}
                            </div>
                        </div>
                    </div>

                    <div>
                        <button onClick={onClose} className="text-gray-600 hover:bg-gray-100 rounded p-2">✕</button>
                    </div>
                </div>



                {/* Top contributors */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Top Contributors</div>
                            <div className="text-xs text-gray-400">Which features drive risk</div>
                        </div>
                        <div className="text-sm text-gray-500">{top3.length} items</div>
                    </div>

                    <div className="mt-3 space-y-3">
                        {top3.length === 0 ? (
                            <div className="text-sm text-gray-500">No contributor data</div>
                        ) : (
                            top3.map(([k, v], idx) => {
                                const labelMap = { pay: "Avg Payment", minpaid: "Min Due Freq", util: "Utilisation", cash: "Cash Withdraw", spend: "Spend Change", merchant: "Merchant Mix" };
                                const name = labelMap[k] ?? k;
                                const val = Number(v || 0);
                                // ensure value in 0..1
                                const normalized = Math.abs(val) > 1.5 ? Math.min(1, Math.abs(val) / 100) : Math.min(1, Math.abs(val));
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-28 text-sm text-gray-600">{name}</div>
                                        <div className="flex-1">
                                            <SmallBar value={normalized} />
                                        </div>
                                        <div className="w-16 text-right text-sm font-medium text-gray-800">{(normalized * 100).toFixed(1)}%</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Raw values grid */}
                <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">Raw Row Values</div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">Credit Limit</div>
                            <div className="font-medium">{fmtNum(creditLimit ?? customer?.["Credit Limit"] ?? "-")}</div>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">Utilisation %</div>
                            <div className="font-medium">{fmtPct(utilPct)}</div>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">Avg Payment Ratio</div>
                            <div className="font-medium">{fmtPct(avgPay)}</div>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">Min Due Paid Frequency</div>
                            <div className="font-medium">{fmtPct(minPaid)}</div>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">Merchant Mix Index</div>
                            <div className="font-medium">{merchant ?? "-"}</div>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">Cash Withdrawal %</div>
                            <div className="font-medium">{fmtPct(cash)}</div>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">Recent Spend Change %</div>
                            <div className="font-medium">{fmtPct(spend)}</div>
                        </div>
                        <div className="flex justify-between bg-gray-50 p-2 rounded">
                            <div className="text-gray-600">DPD Bucket Next Month</div>
                            <div className="font-medium">
                                {customer?.["DPD Bucket Next Month"] ?? customer?.DPD_Bucket ?? customer?.dpd ?? customer?.DPD ?? customer?.Delinquency_Flag_Next_Month ?? "-"}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="sticky bottom-0 left-0 right-0 bg-white py-3 flex justify-end gap-2">


                    {/* Copy JSON with feedback */}
                    <button
                        className="px-3 py-2 border rounded text-sm"
                        onClick={async () => {
                            try {
                                // safely produce JSON (skip circular refs if any)
                                const safeStr = JSON.stringify(customer, (k, v) => {
                                    if (typeof v === "function") return undefined;
                                    return v;
                                }, 2);
                                await navigator.clipboard.writeText(safeStr);
                                // quick visual feedback: temporarily change button text
                                const el = document.getElementById("copy-json-btn");
                                if (el) {
                                    const prev = el.innerText;
                                    el.innerText = "Copied ✓";
                                    setTimeout(() => (el.innerText = prev), 1200);
                                }
                            } catch (err) {
                                alert("Copy failed — your browser may block clipboard access.");
                            }
                        }}
                        id="copy-json-btn"
                    >
                        Copy JSON
                    </button>






                    <button
                        className="px-4 py-2 bg-indigo-600 text-white rounded text-sm"
                        onClick={() => {
                            if (typeof window.__OPEN_CASE_HANDLER__ === "function") {
                                // optional global hook
                                window.__OPEN_CASE_HANDLER__(customer);
                                return;
                            }
                            // prefer parent passed handler
                            if (typeof (typeof onOpenCase !== "undefined" && onOpenCase) === "function") {
                                onOpenCase(customer);
                                return;
                            }
                            // fallback: emit a console message
                            console.log("Open Case action for", customer);
                            alert("Open case action not implemented yet.");
                        }}
                    >
                        Action
                    </button>



                </div>
            </div>
        </div>
    );
}
