import React, { useRef, useState } from "react";
import { FiUpload, FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function UploadPanel({ onUpload, loading }) {
  const fileRef = useRef();
  const [expanded, setExpanded] = useState(false);
  const [selectedName, setSelectedName] = useState(null);

  const handleFileSelect = (e) => {
    const f = e?.target?.files?.[0];
    if (!f) {
      setSelectedName(null);
      return;
    }
    setSelectedName(f.name);
  };

  const openFilePicker = () => {
    // programmatically open the single hidden input
    if (fileRef.current) fileRef.current.click();
  };

  const handleUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("Please choose a CSV file.");
    onUpload(file);
  };

  const clearFile = () => {
    setSelectedName(null);
    if (fileRef.current) {
      fileRef.current.value = null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-3">
      {/* Always-on hidden file input (single source of truth) */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFileSelect(e)}
      />

      {/* Compact header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Import CSV</div>
          <div className="text-xs text-gray-500">Upload a CSV with the required format.</div>
        </div>

        <div className="flex items-center gap-2">
          {/* show selected file name (if any) */}
          <div className="text-sm text-gray-600 truncate max-w-[260px]">
            {selectedName ? (
              <span className="italic">{selectedName}</span>
            ) : (
              <span className="text-gray-400">No file chosen</span>
            )}
          </div>

          {/* Compact Choose button (calls hidden input) */}
          <button
            onClick={openFilePicker}
            className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded cursor-pointer text-sm"
            title="Choose CSV"
          >
            <FiUpload />
            <span className="hidden sm:inline">Choose</span>
          </button>

          {/* Upload action (small) */}
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            title="Upload & Score"
          >
            {loading ? "Processing..." : "Upload"}
          </button>

          {/* Expand / collapse toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 bg-gray-100 rounded text-gray-700"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 border-t pt-3">
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm text-gray-700">Selected file:</label>
              <div className="text-sm text-gray-600">{selectedName ?? "No file chosen"}</div>
            </div>
          </div>

          <div className="mb-2">
            <button
              onClick={openFilePicker}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Choose CSV
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-4 py-2 bg-indigo-700 text-white rounded"
            >
              {loading ? "Processing..." : "Upload & Score"}
            </button>

            <button onClick={clearFile} className="px-3 py-2 bg-gray-100 rounded text-sm">
              Clear
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            The CSV must match the expected schema:
            <div className="mt-1">
              <strong>Columns:</strong> Customer ID, Credit Limit, Utilisation %, Avg Payment Ratio,
              Min Due Paid Frequency, Merchant Mix Index, Cash Withdrawal %, Recent Spend Change %,
              DPD Bucket Next Month
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
