import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { LoanApplicationDto, ApplicationStatus, AdminStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationDetailModal } from '../components/ApplicationDetailModal';
import { useApplicationSocket } from '../hooks/useApplicationSocket';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Database,
  ArrowUpDown,
} from 'lucide-react';

export const AdminLoansPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [selectedApp, setSelectedApp] = useState<LoanApplicationDto | null>(null);
  const [fastTrackingId, setFastTrackingId] = useState<string | null>(null);

  // Hook into WebSocket for zero-refresh admin live updates
  useApplicationSocket();

  // Fetch admin statistics metrics
  const { data: statsData } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/applications/admin/stats');
      return res.data;
    },
  });

  // Fetch paginated applications
  const { data: applicationsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-applications', selectedStatus, debouncedSearch, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') {
        params.append('status', selectedStatus);
      }
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await api.get(`/applications/admin/all?${params.toString()}`);
      return res.data;
    },
  });

  const applications: LoanApplicationDto[] = applicationsData?.data || [];
  const meta = applicationsData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Search debounce handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
    const timeout = setTimeout(() => {
      setDebouncedSearch(val);
    }, 400);
    return () => clearTimeout(timeout);
  };

  const handleFilterChange = (status: string) => {
    setSelectedStatus(status);
    setPage(1);
  };

  // Fast-track credit check action
  const handleFastTrack = async (applicationId: string) => {
    setFastTrackingId(applicationId);
    try {
      await api.post(`/applications/admin/fast-track/${applicationId}`);
      refetch();
    } catch (err) {
      console.error('Failed to fast track:', err);
    } finally {
      setFastTrackingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-rhb-darkBlue tracking-tight">
              Application Underwriting Management
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200">
              Admin Portal
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Supervise all customer loan requests, apply status filters, and monitor credit risk decisions.
          </p>
        </div>
      </div>

      {/* Admin KPI Stat Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Database</span>
            <span className="text-2xl font-bold text-slate-900 mt-0.5 block font-mono">
              {statsData?.total?.toLocaleString() ?? '...'}
            </span>
          </div>
          <Database className="w-6 h-6 text-slate-300" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pending Queue</span>
            <span className="text-2xl font-bold text-amber-600 mt-0.5 block font-mono">
              {statsData?.pending?.toLocaleString() ?? '...'}
            </span>
          </div>
          <Clock className="w-6 h-6 text-amber-300" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Approved Loans</span>
            <span className="text-2xl font-bold text-emerald-600 mt-0.5 block font-mono">
              {statsData?.approved?.toLocaleString() ?? '...'}
            </span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-300" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Declined Loans</span>
            <span className="text-2xl font-bold text-rose-600 mt-0.5 block font-mono">
              {statsData?.rejected?.toLocaleString() ?? '...'}
            </span>
          </div>
          <XCircle className="w-6 h-6 text-rose-300" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <span className="text-[11px] font-bold text-rhb-blue uppercase tracking-wider block">Approval Ratio</span>
            <span className="text-2xl font-bold text-rhb-blue mt-0.5 block font-mono">
              {statsData?.approvalRate ?? '0.0'}%
            </span>
          </div>
          <ShieldCheck className="w-6 h-6 text-blue-200" />
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Applications' },
              { id: 'PENDING', label: 'Pending Check' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === tab.id
                    ? 'bg-rhb-blue text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, NRIC, email..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rhb-blue/30 focus:border-rhb-blue"
            />
          </div>
        </div>

        {/* Applications Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">ID / Date</th>
                <th className="px-5 py-3.5">Applicant Name</th>
                <th className="px-5 py-3.5">NRIC</th>
                <th className="px-5 py-3.5">Purpose</th>
                <th className="px-5 py-3.5">Amount (RM)</th>
                <th className="px-5 py-3.5">Tenure</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-rhb-blue border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Querying database...</span>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No applications matched the specified filter criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-slate-700 block">
                        {app.id.slice(0, 8)}...
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {app.fullName}
                      <span className="text-[10px] text-slate-400 block font-normal">{app.email}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                      {app.nric}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 max-w-[150px] truncate">
                      {app.purpose?.name || app.purposeId}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-rhb-darkBlue">
                      RM {app.loanAmount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {app.tenureMonths} mos
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {app.status === ApplicationStatus.PENDING && (
                        <button
                          onClick={() => handleFastTrack(app.id)}
                          disabled={fastTrackingId === app.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                          title="Instantly trigger automated credit decision"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          Fast-Track
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{applications.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong className="text-slate-800">{Math.min(page * limit, meta.total)}</strong> of{' '}
            <strong className="text-slate-800">{meta.total.toLocaleString()}</strong> applications
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-3 py-1 bg-slate-50 rounded-lg text-slate-700">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Application Detail Modal */}
      <ApplicationDetailModal
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onFastTrack={handleFastTrack}
        isAdmin={true}
      />
    </div>
  );
};
