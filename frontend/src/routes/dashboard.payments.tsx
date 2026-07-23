import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
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
  Users,
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
  const agents = useApp((s) => s.agents);
  const fetchAgents = useApp((s) => s.fetchAgents);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

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

    const codPending = payments
      .filter((p) => p.paymentStatus === "cod_pending")
      .reduce((sum, p) => sum + p.amount, 0);

    const pending = payments
      .filter((p) => p.paymentStatus === "pending" || p.paymentStatus === "cod_pending")
      .reduce((sum, p) => sum + p.amount, 0);

    const failed = payments.filter((p) => p.paymentStatus === "failed").length;
    const refunds = payments.filter((p) => p.paymentStatus === "refunded").length;
    
    const validPaymentsCount = payments.filter((p) => p.paymentStatus === "paid" || p.paymentStatus === "cod_collected").length;
    const aov = validPaymentsCount > 0 ? totalRev / validPaymentsCount : 0;

    // Today's Revenue calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayRev = payments
      .filter((p) => {
        const isPaid = p.paymentStatus === "paid" || p.paymentStatus === "cod_collected";
        const date = new Date(p.createdAt);
        return isPaid && date >= startOfToday;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // Payment Success Rate
    const totalPaymentsCount = payments.length;
    const successRate = totalPaymentsCount > 0
      ? Math.round((validPaymentsCount / totalPaymentsCount) * 100)
      : 100;

    return {
      totalRev,
      prepaidPaid,
      codCollected,
      codPending,
      pending,
      failed,
      refunds,
      aov,
      todayRev,
      successRate,
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
    return data;
  }, [payments]);

  // Agent Revenue Leaderboard
  const agentRevenue = useMemo(() => {
    const map: Record<string, { id: string; name: string; amount: number; count: number }> = {};
    payments.forEach((p) => {
      if (p.paymentStatus !== "paid" && p.paymentStatus !== "cod_collected") return;
      const key = p.agentId || "unassigned";
      if (!map[key]) {
        const ag = agents.find((a) => a.id === key);
        map[key] = { id: key, name: ag?.name || "Field Agent", amount: 0, count: 0 };
      }
      map[key].amount += p.amount;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [payments, agents]);

  // Payment Method Distribution
  const methodStats = useMemo(() => {
    const map: Record<string, { method: string; amount: number; count: number }> = {
      card: { method: "Cards / UPI", amount: 0, count: 0 },
      cash: { method: "Cash / COD", amount: 0, count: 0 },
    };
    payments.forEach((p) => {
      if (p.paymentStatus !== "paid" && p.paymentStatus !== "cod_collected") return;
      const rawMethod = p.paymentMethod || "none";
      const key = rawMethod === "cash" ? "cash" : "card";
      map[key].amount += p.amount;
      map[key].count += 1;
    });
    return Object.values(map);
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
          { label: "Today's Revenue", value: `$${stats.todayRev.toFixed(2)}`, desc: "Settled calendar day", icon: DollarSign, color: "text-[#7F1D1D] bg-red-50 border-red-100" },
          { label: "Total Revenue", value: `$${stats.totalRev.toFixed(2)}`, desc: "Prepaid + COD Collected", icon: DollarSign, color: "text-[#7F1D1D] bg-red-50 border-red-100" },
          { label: "Payment Success Rate", value: `${stats.successRate}%`, desc: "Handoff checkout success", icon: CheckCircle, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
          { label: "Prepaid Received", value: `$${stats.prepaidPaid.toFixed(2)}`, desc: "Prepaid online", icon: CheckCircle, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
          { label: "COD Collected", value: `$${stats.codCollected.toFixed(2)}`, desc: "Collected by agents", icon: TrendingUp, color: "text-blue-700 bg-blue-50 border-blue-100" },
          { label: "COD Pending", value: `$${stats.codPending.toFixed(2)}`, desc: "COD dispatch pending", icon: Clock, color: "text-amber-700 bg-amber-50 border-amber-100" },
          { label: "AOV", value: `$${stats.aov.toFixed(2)}`, desc: "Avg order value", icon: ArrowUpRight, color: "text-purple-700 bg-purple-50 border-purple-100" },
          { label: "Failed Transactions", value: stats.failed.toString(), desc: "Unsuccessful checkouts", icon: AlertTriangle, color: "text-rose-700 bg-rose-50 border-rose-100" },
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
          {chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
              <CreditCard className="h-8 w-8 text-zinc-300" />
              <p className="mt-2 text-sm font-semibold">No revenue settlements recorded yet.</p>
              <p className="text-xs text-zinc-400">Charts will populate once payments are completed.</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Agent & Payment Method Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent Revenue Performance */}
        <div className="rounded-2xl border border-zinc-200/85 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <Users className="h-4 w-4 text-[#7F1D1D]" /> Handoff Agent Revenue Performance
          </h3>
          <div className="space-y-3">
            {agentRevenue.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-450">No agent cash/payment collections recorded yet.</div>
            ) : (
              agentRevenue.map((agent) => (
                <div key={agent.id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-700">
                      {agent.name[0]}
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 block">{agent.name}</span>
                      <span className="text-[10px] text-zinc-400 block">{agent.count} handoffs completed</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-950">${agent.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Method Split */}
        <div className="rounded-2xl border border-zinc-200/85 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <CreditCard className="h-4 w-4 text-[#7F1D1D]" /> Payment Method Volume Breakdown
          </h3>
          <div className="space-y-4 pt-1">
            {methodStats.map((item) => {
              const totalAmount = stats.totalRev || 1; // prevent divide by zero
              const percentage = Math.round((item.amount / totalAmount) * 100);
              return (
                <div key={item.method} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-zinc-750">{item.method} ({item.count} checkouts)</span>
                    <span className="font-mono text-zinc-950">${item.amount.toFixed(2)} ({percentage}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        item.method.includes("Cash") ? "bg-blue-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
