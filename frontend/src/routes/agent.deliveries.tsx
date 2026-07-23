import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { StatusBadge } from "@/components/trust/StatusBadge";
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Eye,
  CheckCircle,
  Truck,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agent/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — TrustRoute" }] }),
  component: AgentDeliveries,
});

function AgentDeliveries() {
  const list = useApp((s) => s.deliveries);

  // Search & Filter State
  const globalSearchQuery = useApp((s) => s.searchQuery);
  const [search, setSearch] = useState(globalSearchQuery);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Sorting State
  const [sortBy, setSortBy] = useState<"customer" | "priority" | "status" | "distanceKm" | "eta">("customer");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Connect global header search state with local list search
  useEffect(() => {
    setSearch(globalSearchQuery);
    setCurrentPage(1);
  }, [globalSearchQuery]);

  // Priority and Status Weight Definitions for Sorting
  const priorityWeights = { Critical: 3, Express: 2, Standard: 1 };
  const statusWeights = { assigned: 1, pending: 2, delivered: 3, failed: 4, cancelled: 5 };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Filter & Search Implementation
  const filtered = list.filter((d) => {
    const matchesSearch =
      d.customer.toLowerCase().includes(search.toLowerCase()) ||
      d.destination.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      (d.packageType && d.packageType.toLowerCase().includes(search.toLowerCase()));

    const matchesPriority = priorityFilter === "All" || d.priority === priorityFilter;
    const matchesStatus = statusFilter === "All" || d.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Sort Implementation
  const sorted = [...filtered].sort((a, b) => {
    let valA: any = a[sortBy] ?? "";
    let valB: any = b[sortBy] ?? "";

    if (sortBy === "priority") {
      valA = priorityWeights[a.priority as keyof typeof priorityWeights] || 0;
      valB = priorityWeights[b.priority as keyof typeof priorityWeights] || 0;
    } else if (sortBy === "status") {
      valA = statusWeights[a.status as keyof typeof statusWeights] || 0;
      valB = statusWeights[b.status as keyof typeof statusWeights] || 0;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setSearch("");
    setPriorityFilter("All");
    setStatusFilter("All");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#FF4D4D] uppercase font-bold tracking-widest block">
            Agent Terminal
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            My Deliveries
          </h1>
          <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
            Sort, filter, and inspect your active and completed handoff records.
          </p>
        </div>
      </header>

      {/* Controls: Search, Filters & Page Size */}
      <div className="flex flex-col xl:flex-row gap-4 bg-[#0F1424] border border-zinc-850 p-4.5 rounded-2xl">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Field */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-550 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search ID, customer, address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-[#B71C1C]/40 outline-none transition"
            />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs text-zinc-300 focus:border-[#B71C1C]/40 outline-none transition appearance-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical Only</option>
              <option value="Express">Express Only</option>
              <option value="Standard">Standard Only</option>
            </select>
            <Filter className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs text-zinc-300 focus:border-[#B71C1C]/40 outline-none transition appearance-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
            <Filter className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Reset button & page size */}
        <div className="flex items-center justify-between xl:justify-end gap-3.5">
          {(search || priorityFilter !== "All" || statusFilter !== "All") && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-[#FF4D4D] hover:text-[#ff6666] transition cursor-pointer"
            >
              Clear Filters
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 text-xs text-zinc-300 focus:border-[#B71C1C]/40 outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Mobile card list */}
      <div className="bg-[#0F1424] border border-zinc-850 rounded-2xl overflow-hidden shadow-sm">
        {totalItems === 0 ? (
          <div className="p-16 text-center">
            <Truck className="mx-auto h-12 w-12 text-[#B71C1C] animate-pulse mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">No matching deliveries found</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-sm mx-auto">
              No deliveries match your active filter configurations or search terms. Try modifying your criteria.
            </p>
            {(search || priorityFilter !== "All" || statusFilter !== "All") && (
              <button
                onClick={resetFilters}
                className="mt-4 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table view (md and larger) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850/60 bg-zinc-900/30 text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="px-5 py-4 font-mono font-bold text-[10px]">ID</th>
                    <th
                      onClick={() => handleSort("customer")}
                      className="px-5 py-4 cursor-pointer hover:text-white transition select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        Recipient {sortBy === "customer" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        {sortBy !== "customer" && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </th>
                    <th className="px-5 py-4">Destination</th>
                    <th
                      onClick={() => handleSort("priority")}
                      className="px-5 py-4 cursor-pointer hover:text-white transition select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        Priority {sortBy === "priority" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        {sortBy !== "priority" && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("distanceKm")}
                      className="px-5 py-4 cursor-pointer hover:text-white transition select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        Distance {sortBy === "distanceKm" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        {sortBy !== "distanceKm" && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="px-5 py-4 cursor-pointer hover:text-white transition select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        Status {sortBy === "status" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        {sortBy !== "status" && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </div>
                    </th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/40 text-zinc-300 font-medium">
                  {paginated.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-800/10 transition duration-150">
                      <td className="px-5 py-4 font-mono text-[10px] text-zinc-500 font-bold whitespace-nowrap">
                        {d.id}
                      </td>
                      <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                        {d.customer}
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate" title={d.destination}>
                        {d.destination}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider",
                            d.priority === "Critical"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : d.priority === "Express"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : "bg-violet-500/10 text-violet-400 border-violet-500/20",
                          )}
                        >
                          <Zap className="h-2.5 w-2.5 fill-current" /> {d.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-400">
                        {d.distanceKm} km · {d.eta}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider",
                          d.paymentStatus === "paid" || d.paymentStatus === "cod_collected"
                            ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/10"
                            : "bg-red-950/30 text-[#FF4D4D] border-red-500/10"
                        )}>
                          {d.paymentType === "cod" ? "COD" : "Prepaid"} · ${d.paymentAmount || 0} · {(d.paymentStatus || "pending").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {d.status === "delivered" ? (
                          <Link
                            to="/agent/delivery/$id"
                            params={{ id: d.id }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/20 text-[10px] font-bold px-3 py-1.5 text-emerald-400 transition"
                          >
                            <Eye className="h-3 w-3" /> View Certificate
                          </Link>
                        ) : d.status === "failed" || d.status === "cancelled" ? (
                          <Link
                            to="/agent/delivery/$id"
                            params={{ id: d.id }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950/20 hover:bg-zinc-900/30 border border-zinc-500/20 text-[10px] font-bold px-3 py-1.5 text-zinc-400 transition"
                          >
                            <Eye className="h-3 w-3" /> View Details
                          </Link>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to cancel this order?")) {
                                  useApp.getState().updateStatus(d.id, "cancelled");
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold px-3 py-1.5 text-white transition"
                            >
                              Cancel
                            </button>
                            <Link
                              to="/agent/delivery/$id"
                              params={{ id: d.id }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#B71C1C] to-red-600 hover:opacity-90 text-[10px] font-bold px-3 py-1.5 text-white shadow-glow transition cursor-pointer"
                            >
                              Verify Parcel
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack layout (under md breakpoint) */}
            <div className="md:hidden divide-y divide-zinc-850/60 p-4 space-y-4">
              {paginated.map((d) => (
                <div key={d.id} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{d.customer}</h4>
                      <p className="font-mono text-[9px] text-zinc-550 font-bold mt-0.5">ID: {d.id}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="text-xs text-zinc-400 bg-zinc-950/30 border border-zinc-850 p-2.5 rounded-xl space-y-1">
                    <p className="leading-snug">{d.destination}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 font-semibold uppercase">
                      <span>{d.distanceKm} km</span>
                      <span>·</span>
                      <span>ETA {d.eta}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider",
                        d.priority === "Critical"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : d.priority === "Express"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            : "bg-violet-500/10 text-violet-400 border-violet-500/20",
                      )}
                    >
                      <Zap className="h-2.5 w-2.5 fill-current" /> {d.priority}
                    </span>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider",
                        d.paymentStatus === "paid" || d.paymentStatus === "cod_collected"
                          ? "bg-emerald-950/30 text-emerald-450 border-emerald-500/10"
                          : "bg-red-950/30 text-[#FF4D4D] border-red-500/10"
                      )}
                    >
                      {d.paymentType === "cod" ? "COD" : "Prepaid"} · ${d.paymentAmount || 0}
                    </span>

                    {d.status === "delivered" ? (
                      <Link
                        to="/agent/delivery/$id"
                        params={{ id: d.id }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/20 text-[10px] font-bold px-3 py-1.5 text-emerald-400 transition"
                      >
                        <Eye className="h-3 w-3" /> View Certificate
                      </Link>
                    ) : d.status === "failed" || d.status === "cancelled" ? (
                      <Link
                        to="/agent/delivery/$id"
                        params={{ id: d.id }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950/20 hover:bg-zinc-900/30 border border-zinc-500/20 text-[10px] font-bold px-3 py-1.5 text-zinc-400 transition"
                      >
                        <Eye className="h-3 w-3" /> View Details
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to cancel this order?")) {
                              useApp.getState().updateStatus(d.id, "cancelled");
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold px-3 py-1.5 text-white transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <Link
                          to="/agent/delivery/$id"
                          params={{ id: d.id }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#B71C1C] to-red-600 hover:opacity-90 text-[10px] font-bold px-3 py-1.5 text-white shadow-glow transition cursor-pointer"
                        >
                          Verify Route
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls Footer */}
            <footer className="flex items-center justify-between border-t border-zinc-850/60 px-5 py-4 bg-zinc-900/10 text-xs text-zinc-550 font-bold">
              <span>
                Showing {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-
                {Math.min(totalItems, currentPage * pageSize)} of {totalItems} items
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 disabled:opacity-30 disabled:hover:bg-zinc-900 transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-zinc-350 px-2.5 font-bold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 disabled:opacity-30 disabled:hover:bg-zinc-900 transition cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
