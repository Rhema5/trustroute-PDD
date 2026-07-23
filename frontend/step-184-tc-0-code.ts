import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  Eye,
  FileText,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/dashboard/payments")({
  head: () => ({ meta: [{ title: "Payment Ledger — TrustRoute" }] }),
  component: PaymentsDashboard,
});

function PaymentsDashboard() {
  const payments = useApp((s) => s.payments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Compute stats metrics
  const stats = useMemo(() => {
    const totalRev = payments
      .filter((p) => p.paymentStatus === "paid" || p.paymentStatus === "cod_collected")
      .reduce((sum, p) => sum + p.amount, 0);

    const prepaidPaid = payments
      .filter((p) => p.paymentStatus === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const codCollected = payments
      .filter((p) => p.paymentStatus === "cod_collected")
      .reduce((sum, p) => sum + p.amount, 0);

    const pending = payments
      .filter((p) => p.paymentStatus === "pending" || p.paymentStatus === "cod_pending")
      .reduce((sum, p) => sum + p.amount, 0);

    const failed = payments.filter((p) => p.paymentStatus === "failed").length;
    const refunds = payments.filter((p) => p.paymentStatus === "refunded").length;
    
    const validPaymentsCount = payments.filter((p) => p.paymentStatus === "paid" || p.paymentStatus === "cod_collected").length;
    const aov = validPaymentsCount > 0 ? totalRev / validPaymentsCount : 0;

    return {
      totalRev,
      prepaidPaid,
      codCollected,
      pending,
      failed,
      refunds,
      aov
    };
  }, [payments]);

  // Compute daily revenue data for charts
  const chartData = useMemo(() => {
    const dailyMap: Record<string, { date: string; Prepaid: number; COD: number }> = {};
    
    // Sort payments chronologically for graph progression
    const sorted = [...payments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    sorted.forEach((p) => {
      if (p.paymentStatus !== "paid" && p.paymentStatus !== "cod_collected") return;
      
      const dateStr = new Date(p.createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, Prepaid: 0, COD: 0 };
      }
      
      if (p.paymentType === "cod") {
        dailyMap[dateStr].COD += p.amount;
      } else {
        dailyMap[dateStr].Prepaid += p.amount;
      }
    });

    const data = Object.values(dailyMap);
    // Return standard dummy data baseline if no live settlements recorded yet
    if (data.length === 0) {
      return [
        { date: "Jul 15", Prepaid: 120, COD: 50 },
        { date: "Jul 16", Prepaid: 240, COD: 90 },
        { date: "Jul 17", Prepaid: 180, COD: 110 },
        { date: "Jul 18", Prepaid: 310, COD: 150 },
        { date: "Jul 19", Prepaid: 450, COD: 220 },
      ];
    }
    return data;
  }, [payments]);

  // Filters logic
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch = 
        p.paymentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.deliveryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || p.paymentStatus === statusFilter;
      const matchesMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
      const matchesType = typeFilter === "all" || p.paymentType === typeFilter;

      return matchesSearch && matchesStatus && matchesMethod && matchesType;
    });
  }, [payments, searchQuery, statusFilter, methodFilter, typeFilter]);

  // Export CSV Action
  const exportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.info("No records to export.");
      return;
    }

    const headers = ["Payment ID", "Delivery ID", "Customer", "Amount", "Method", "Type", "Status", "Created Date"];
    const rows = filteredPayments.map((p) => [
      p.paymentId,
      p.deliveryId,
      p.customerId,
      p.amount.toFixed(2),
      p.paymentMethod,
      p.paymentType,
      p.paymentStatus,
      new Date(p.createdAt).toLocaleString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TrustRoute-Payment-Ledger-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report downloaded successfully.");
  };

  // Export PDF compilation using standard window print bounds or custom canvas
  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`TrustRoute-Revenue-Audit-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF audit report downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate PDF audit:", err);
      toast.error("Failed to compile PDF report.");
    }
  };

  return (
    <div className="space-y-6 text-left" ref={reportRef}>
      {/* Header controls bar */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-['Poppins',sans-serif]">
            Payment Ledger Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Audit secure revenue checkouts, cash collections, billing distributions, and export records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7F1D1D] hover:bg-[#6B1414] px-4 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
          >
            <FileText className="h-4 w-4" /> Export PDF Report
          </button>
        </div>
      </header>

      {/* Analytics KPI responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${stats.totalRev.toFixed(2)}`, desc: "Prepaid + COD Collected", icon: DollarSign, color: "text-[#7F1D1D] bg-red-50 border-red-100" },
          { label: "Prepaid Received", value: `$${stats.prepaidPaid.toFixed(2)}`, desc: "Settled online", icon: CheckCircle, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
          { label: "COD Collected", value: `$${stats.codCollected.toFixed(2)}`, desc: "Collected by agents", icon: TrendingUp, color: "text-blue-700 bg-blue-50 border-blue-100" },
          { label: "Pending Invoice", value: `$${stats.pending.toFixed(2)}`, desc: "Unpaid Prepaid & COD", icon: Clock, color: "text-amber-700 bg-amber-50 border-amber-100" },
          { label: "AOV", value: `$${stats.aov.toFixed(2)}`, desc: "Avg order handoff value", icon: ArrowUpRight, color: "text-purple-700 bg-purple-50 border-purple-100" },
          { label: "Failed Transactions", value: stats.failed.toString(), desc: "Unsuccessful checkout tries", icon: AlertTriangle, color: "text-rose-700 bg-rose-50 border-rose-100" },
          { label: "Refunded Counts", value: stats.refunds.toString(), desc: "Refund transaction lines", icon: RotateCcw, color: "text-zinc-700 bg-zinc-100 border-zinc-200" },
        ].map((widget, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-zinc-200/80 p-4.5 flex items-start justify-between shadow-sm hover:border-zinc-300 transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider block">
                {widget.label}
              </span>
              <span className="text-xl font-extrabold text-zinc-900 block font-['Poppins',sans-serif]">
                {widget.value}
              </span>
              <span className="text-[10px] text-zinc-400 block font-medium">
                {widget.desc}
              </span>
            </div>
            <div className={cn("h-9 w-9 rounded-xl border flex items-center justify-center shrink-0", widget.color)}>
              <widget.icon className="h-4.5 w-4.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="rounded-2xl border border-zinc-200/85 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
          Revenue Accumulation (Prepaid vs Cash on Delivery)
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrepaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCOD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#0F1424", borderColor: "#1E293B", borderRadius: "12px", color: "#F3F4F6", fontSize: "12px" }}
              />
              <Area type="monotone" dataKey="Prepaid" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrepaid)" />
              <Area type="monotone" dataKey="COD" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCOD)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction table list */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Filter controls panel */}
        <div className="p-4 border-b border-zinc-150 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Payment ID, Delivery ID..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs outline-none focus:border-[#7F1D1D]/45 focus:bg-white text-zinc-800 placeholder:text-zinc-400"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filters
            </label>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="cod_collected">COD Collected</option>
              <option value="cod_pending">COD Pending</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 outline-none"
            >
              <option value="all">All Types</option>
              <option value="prepaid">Online Prepaid</option>
              <option value="cod">Cash on Delivery</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-450 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4">Payment / Recipient Details</th>
                <th className="p-4">Delivery Route</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Mode / Gateway</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-400 font-semibold leading-relaxed">
                    No transactions matched search criteria in ledger registry.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-zinc-50/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-zinc-900">{p.customerId}</div>
                      <div className="font-mono text-[10px] text-zinc-450 mt-0.5">PMID: {p.paymentId}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold text-zinc-700">{p.deliveryId}</span>
                    </td>
                    <td className="p-4 font-bold text-zinc-900">
                      ${p.amount.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div className="font-bold capitalize text-zinc-800">{p.paymentMethod}</div>
                      <div className="text-[10px] text-zinc-450 font-semibold uppercase tracking-wider mt-0.5">
                        {p.paymentType === "cod" ? "COD" : "Prepaid"}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                        p.paymentStatus === "paid" || p.paymentStatus === "cod_collected"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : p.paymentStatus === "failed"
                            ? "bg-rose-50 border-rose-100 text-rose-700"
                            : "bg-amber-50 border-amber-100 text-amber-700"
                      )}>
                        {p.paymentStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 font-medium">
                      {new Date(p.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-4 text-center">
                      {(p.paymentStatus === "paid" || p.paymentStatus === "cod_collected") ? (
                        <button
                          onClick={() => {
                            window.open(`/payment/${p.deliveryId}`, "_blank");
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded bg-zinc-50 border border-zinc-200 text-zinc-650 hover:bg-zinc-100 cursor-pointer"
                          title="Open Handoff Receipt"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-zinc-300 font-semibold">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
