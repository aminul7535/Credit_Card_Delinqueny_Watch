export default function KPI({ title, value, color, total }) {
    const percent =
        total > 0 && title !== "Total Customers"
            ? ((value / total) * 100).toFixed(1)
            : null;

    const borderColor =
        color === "red" ? "border-red-400"
            : color === "yellow" ? "border-yellow-400"
            : color === "green" ? "border-green-400"
            : "border-indigo-400";

    return (
        <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${borderColor}`}>
            <h3 className="text-gray-600 text-sm">{title}</h3>

            <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold">{value}</span>

                {percent !== null && (
                    <span className="text-sm text-gray-500 font-semibold">
                        ({percent}%)
                    </span>
                )}
            </div>
        </div>
    );
}
