import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { LoanApplicationDto, ApplicationStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationDetailModal } from '../components/ApplicationDetailModal';
import { useApplicationSocket } from '../hooks/useApplicationSocket';
import { PlusCircle, Eye, AlertCircle, Sparkles, CheckCircle2, Clock, Landmark, ArrowRight, ShieldCheck } from 'lucide-react';

export const MyLoansPage: React.FC = () => {
  const location = useLocation();
  const [selectedApp, setSelectedApp] = useState<LoanApplicationDto | null>(null);
  const [realtimeNotification, setRealtimeNotification] = useState<{
    applicationId: string;
    status: ApplicationStatus;
    reason?: string;
  } | null>(null);

  // Hook into WebSocket for zero-refresh live updates
  useApplicationSocket((event) => {
    setRealtimeNotification({
      applicationId: event.applicationId,
      status: event.status,
      reason: event.creditDecisionReason,
    });
  });

  // Fetch customer's own applications
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const res = await api.get('/applications/my?limit=50');
      return res.data;
    },
  });

  const applications: LoanApplicationDto[] = data?.data || [];

  // Summary counts
  const total = applications.length;
  const approved = applications.filter((a) => a.status === ApplicationStatus.APPROVED).length;
  const pending = applications.filter((a) => a.status === ApplicationStatus.PENDING).length;
  const rejected = applications.filter((a) => a.status === ApplicationStatus.REJECTED).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Real-time Notification Banner when WebSocket pushes update */}
      {realtimeNotification && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-rhb-darkBlue text-white shadow-xl flex items-center justify-between border border-blue-400/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-rhb-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-rhb-gold">Live WebSocket Update</span>
                <StatusBadge status={realtimeNotification.status} />
              </div>
              <p className="text-sm font-medium mt-0.5">
                Application <span className="font-mono">{realtimeNotification.applicationId.slice(0, 8)}...</span> has been{' '}
                <strong className={realtimeNotification.status === ApplicationStatus.APPROVED ? 'text-emerald-300' : 'text-rose-300'}>
                  {realtimeNotification.status}
                </strong>
                ! (Updated live without page refresh)
              </p>
            </div>
          </div>
          <button
            onClick={() => setRealtimeNotification(null)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Just Submitted Banner */}
      {location.state?.newApplicationSubmitted && !realtimeNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Your new loan application was submitted successfully! It is currently in <strong>Pending</strong> status undergoing background underwriting.
            </span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-rhb-darkBlue tracking-tight">
            My Loan Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your personal financing applications with automated real-time status updates.
          </p>
        </div>
        <Link
          to="/apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rhb-blue hover:bg-rhb-accent text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          New Application
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Applied</span>
          <span className="text-2xl font-bold text-slate-800 mt-1 block">{total}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Pending Check
          </div>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{pending}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Approved</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">{approved}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">Rejected</span>
          <span className="text-2xl font-bold text-rose-600 mt-1 block">{rejected}</span>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Application History</h2>
          <span className="text-xs text-slate-400">Updates dynamically via WebSocket</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-rhb-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Failed to load applications. Please try again.
          </div>
        ) : applications.length === 0 ? (
          <div className="p-16 text-center">
            <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No applications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't submitted any loan applications yet. Start a new application today to get quick financing.
            </p>
            <Link
              to="/apply"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rhb-blue text-white text-xs font-semibold shadow-sm hover:bg-rhb-accent transition-colors"
            >
              Apply for Loan Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Application</th>
                  <th className="px-6 py-3.5">Purpose</th>
                  <th className="px-6 py-3.5">Amount (RM)</th>
                  <th className="px-6 py-3.5">Tenure</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Submitted</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">
                      {app.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {app.purpose?.name || app.purposeId}
                    </td>
                    <td className="px-6 py-4 font-bold text-rhb-darkBlue">
                      RM {app.loanAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {app.tenureMonths} mos
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rhb-blue hover:text-white hover:bg-rhb-blue border border-blue-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      <ApplicationDetailModal
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
      />
    </div>
  );
};
