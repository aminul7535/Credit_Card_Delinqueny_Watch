import React, { useState, useMemo } from "react";

function RiskBadge({ level }) {
    if (!level) return null;
    const base = "px-2 py-1 rounded-full text-sm";
    if (level === "High") return <span className={`${base} bg-red-100 text-red-800`}>High</span>;
    if (level === "Medium") return <span className={`${base} bg-yellow-100 text-yellow-800`}>Medium</span>;
    return <span className={`${base} bg-green-100 text-green-800`}>Low</span>;
}

export default function CustomersTable({ records = [], onView }) {
    const [sortKey, setSortKey] = useState("score_norm");
    const [direction, setDirection] = useState("desc");
    const [query, setQuery] = useState("");

    // Local filtering: search by Customer ID, risk_class, utilisation etc.
    const filtered = useMemo(() => {
        if (!query || !query.trim()) return records;
        const q = query.trim().toLowerCase();
        return records.filter(r => {
            const cid = String(r["Customer ID"] ?? "").toLowerCase();
            if (cid.includes(q)) return true;
            const rc = String(r.risk_class ?? "").toLowerCase();
            if (rc.includes(q)) return true;
            const util = String(r["Utilisation %"] ?? "").toLowerCase();
            if (util.includes(q)) return true;
            const score = String(r.score_norm ?? "").toLowerCase();
            if (score.includes(q)) return true;
            const rowText = Object.values(r).join(" ").toLowerCase();
            return rowText.includes(q);
        });
    }, [records, query]);

    const sortData = () => {
        return [...filtered].sort((a, b) => {
            // If sorting by Customer ID, use string compare
            if (sortKey === "Customer ID") {
                const aa = String(a["Customer ID"] ?? "");
                const bb = String(b["Customer ID"] ?? "");
                return direction === "desc" ? bb.localeCompare(aa) : aa.localeCompare(bb);
            }
            const aVal = parseFloat(a[sortKey] ?? 0);
            const bVal = parseFloat(b[sortKey] ?? 0);
            return direction === "desc" ? bVal - aVal : aVal - bVal;
        });
    };

    const switchSort = (key) => {
        if (key === sortKey) {
            setDirection(direction === "desc" ? "asc" : "desc");
        } else {
            setSortKey(key);
            setDirection("desc");
        }
    };

    const sorted = sortData();

    return (
        <div className="bg-white rounded-lg shadow p-3">
            {/* Header: title + compact search (left) + rows count (right) */}
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-base">Customers</h3>

                    {/* Compact search moved to the left next to title */}
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="text-sm px-1 py-1 border-b border-gray-600 bg-transparent w-40
               focus:outline-none focus:border-indigo-600 font-medium"
                    />



                </div>

                <div className="text-sm text-gray-500">Rows: {filtered.length}</div>
            </div>

            {/* Scrollable table area */}
            <div className="max-h-[450px] overflow-y-auto border rounded-md">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="text-xs text-gray-500 border-b">
                            <th className="py-2 px-2 cursor-pointer" onClick={() => switchSort("Customer ID")}>
                                Customer
                            </th>
                            <th className="py-2 px-2 cursor-pointer" onClick={() => switchSort("score_norm")}>
                                Risk Score
                            </th>
                            <th className="py-2 px-2 cursor-pointer" onClick={() => switchSort("risk_class")}>
                                Risk Level
                            </th>
                            <th className="py-2 px-2 cursor-pointer" onClick={() => switchSort("Utilisation %")}>
                                Utilisation %
                            </th>
                            <th className="py-2 px-2">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {sorted.map((row, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-2">{row["Customer ID"]}</td>

                                <td className="py-2 px-2">
                                    <div className="w-full bg-gray-100 rounded h-2">
                                        <div
                                            style={{ width: `${Math.min(100, (parseFloat(row.score_norm || 0) * 100).toFixed(2))}%` }}
                                            className="h-2 bg-blue-500 rounded"
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{row.score_norm}</div>
                                </td>

                                <td className="py-2 px-2">
                                    <RiskBadge level={row.risk_class} />
                                </td>

                                <td className="py-2 px-2">{row["Utilisation %"]}%</td>

                                <td className="py-2 px-2">
                                    <button
                                        onClick={() => onView(row["Customer ID"])}
                                        className="px-2 py-1 bg-gray-800 text-white rounded text-xs"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                                    No customers found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
