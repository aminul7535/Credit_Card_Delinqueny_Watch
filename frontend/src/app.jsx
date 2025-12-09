import LogoSmall from "./logo.png";
// src/App.jsx
import React, { useEffect, useState } from 'react';
import { uploadCSV, getSummary, downloadScoredCSV } from './api';
import KPI from './components/KPI';
import UploadPanel from './components/UploadPanel';
import RiskCharts from './components/RiskCharts';
import CustomersTable from './components/CustomersTable';
import CustomerDrawer from './components/CustomerDrawer';
import RiskSlider from './components/RiskSlider';

export default function App() {
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [summary, setSummary] = useState({
        total_customers: 0,
        high_risk: 0,
        medium_risk: 0,
        low_risk: 0,
    });

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // slider state (0..100)
    const [sliderRange, setSliderRange] = useState({ min: 0, max: 100 });

    useEffect(() => {
        async function load() {
            try {
                const s = await getSummary();
                setSummary(s);
            } catch (e) {
                // ignore
            }
        }
        load();
    }, []);

    // Whenever records or sliderRange changes, update filteredRecords
    useEffect(() => {
        const min = sliderRange.min / 100.0;
        const max = sliderRange.max / 100.0;
        const filtered = (records || []).filter(r => {
            const v = parseFloat(r.score_norm ?? 0);
            return v >= min && v <= max;
        });
        setFilteredRecords(filtered);
    }, [records, sliderRange]);

    const handleUpload = async (file) => {
        setLoading(true);
        try {
            const res = await uploadCSV(file);
            setRecords(res.records || []);
            setSummary({
                total_customers: res.total_customers,
                high_risk: res.high_risk,
                medium_risk: res.medium_risk,
                low_risk: res.low_risk,
            });
            // reset slider to show all on fresh upload
            setSliderRange({ min: 0, max: 100 });
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const openCustomer = (id) => {
        const rec = (records || []).find(r => String(r['Customer ID']) === String(id));
        setSelectedCustomer(rec);
        setDrawerOpen(true);
    };

    const handleDownload = async () => {
        try {
            const blob = await downloadScoredCSV();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scored_customers.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert('Download failed');
        }
    };

    return (
        <div className="min-h-screen p-4">
            <header className="mb-2 flex items-center justify-between">
                <h1 className="text-3xl font-extrabold tracking-wide text-gray-800 mb-1">
                    <span className="text-indigo-700">CREDIT CARD</span> DELINQUENCY WATCH
                    <span className="text-gray-600"> — EARLY RISK DASHBOARD</span>
                </h1>

                <div className="flex gap-3">
                    <button onClick={handleDownload} className="px-3 py-2 bg-blue-600 text-white rounded">Export Results (CSV)</button>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                <KPI title="Total Customers" value={summary.total_customers} total={summary.total_customers} />
                <KPI title="High Risk" value={summary.high_risk} color="red" total={summary.total_customers} />
                <KPI title="Medium Risk" value={summary.medium_risk} color="yellow" total={summary.total_customers} />
                <KPI title="Low Risk" value={summary.low_risk} color="green" total={summary.total_customers} />
            </section>


            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-3">
                    <UploadPanel onUpload={handleUpload} loading={loading} />

                    {/* RISK SLIDER */}
                    <div className="mb-3">
                        <RiskSlider
                            min={sliderRange.min}
                            max={sliderRange.max}
                            onChange={(min, max) => setSliderRange({ min, max })}
                        />
                    </div>

                    {/* Customer table receives filteredRecords so table shows only trimmed window */}
                    <CustomersTable records={filteredRecords} onView={openCustomer} />
                </div>

                <div className="space-y-3">
                    <RiskCharts records={records} />
                </div>

                {/* --- Footer Note --- */}

                <footer className="fixed bottom-0 left-0 right-0 w-full z-40">
                    <div className="w-full bg-white/95 backdrop-blur-sm border-t border-gray-200">
                        <div className="max-w-screen-xl mx-auto px-4">
                            <div className="flex items-center justify-between gap-4 py-1">
                                {/* LEFT: logo + project text */}
                                <div className="flex items-center gap-3 min-w-0">
                                    {typeof LogoSmall !== "undefined" ? (
                                        <img
                                            src={LogoSmall}
                                            alt="logo"
                                            className="w-6 h-6 rounded-sm object-contain"
                                            style={{ flex: "0 0 auto" }}
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-sm bg-[#37B3B3] flex items-center justify-center text-white text-sm font-semibold">
                                            C
                                        </div>
                                    )}

                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-700 truncate">HDFC Campus to Corporate</div>
                                        <div className="text-xs text-gray-500 truncate">Prototype Dashboard — For Evaluation Only</div>
                                    </div>
                                </div>

                                {/* CENTER: copyright + date (compact) */}
                                <div className="text-center text-xs text-gray-500 min-w-[220px]">
                                    <div>© {new Date().getFullYear()} Aminul Islam — Credit Card Delinquency Watch</div>
                                    <div className="text-xs text-gray-500 truncate">Optimized for web. Mobile version not available yet!</div>
                                </div>

                                {/* RIGHT: small metadata badges */}
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 text-xs bg-[#E6FFFA] text-[#055E5E] rounded-full font-medium">Prototype v1.0</div>
                                    <button
                                        className="hidden md:inline-flex items-center justify-center bg-[#37B3B3] hover:bg-[#2ea3a3] text-white text-xs px-2 py-1 rounded"
                                        onClick={() => { navigator.clipboard?.writeText(window.location.href) }}
                                        title="Copy current URL"
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>



            </section>

            <CustomerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} customer={selectedCustomer} />
        </div>
    )
}
