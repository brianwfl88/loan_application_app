import React from 'react';
import { LoanApplicationDto, ApplicationStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { X, Calendar, User, Phone, Mail, CreditCard, DollarSign, Clock, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ApplicationDetailModalProps {
  application: LoanApplicationDto | null;
  onClose: () => void;
  onFastTrack?: (id: string) => void;
  isAdmin?: boolean;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  onClose,
  onFastTrack,
  isAdmin = false,
}) => {
  if (!application) return null;

  const annualRate = 0.055;
  const totalInterest = application.loanAmount * annualRate * (application.tenureMonths / 12);
  const totalRepayment = application.loanAmount + totalInterest;
  const estimatedMonthly = totalRepayment / application.tenureMonths;
  const dsr = application.monthlyIncome > 0 ? (estimatedMonthly / application.monthlyIncome) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">Loan Application Details</h3>
              <StatusBadge status={application.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {application.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Credit Check Status Banner */}
          {application.status === ApplicationStatus.PENDING && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
              <div className="relative flex h-3 w-3 mt-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900">Simulated Credit Assessment in Progress</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  The automated underwriting engine is evaluating income, debt-service ratio, and credit records.
                  This page will update automatically in real-time when the decision completes (simulated 10s – 5min).
                </p>
                {isAdmin && onFastTrack && (
                  <button
                    onClick={() => onFastTrack(application.id)}
                    className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Fast-Track Credit Decision (Testing)
                  </button>
                )}
              </div>
            </div>
          )}

          {application.status === ApplicationStatus.APPROVED && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-emerald-900">Application Approved</h4>
                  {application.creditScore && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                      Credit Score: {application.creditScore}/850
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  {application.creditDecisionReason || 'Your credit assessment passed all underwriting requirements.'}
                </p>
                {application.decidedAt && (
                  <p className="text-[11px] text-emerald-600 mt-1.5">
                    Decided on: {new Date(application.decidedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {application.status === ApplicationStatus.REJECTED && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-rose-900">Application Declined</h4>
                  {application.creditScore && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-800">
                      Credit Score: {application.creditScore}/850
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  {application.creditDecisionReason || 'Application does not meet current credit underwriting guidelines.'}
                </p>
                {application.decidedAt && (
                  <p className="text-[11px] text-rose-600 mt-1.5">
                    Decided on: {new Date(application.decidedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Applicant Information */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Applicant Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Full Name</span>
                  <span className="text-sm font-semibold text-slate-800">{application.fullName}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Malaysian NRIC</span>
                  <span className="text-sm font-mono font-semibold text-slate-800">{application.nric}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Email Address</span>
                  <span className="text-sm font-medium text-slate-800">{application.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Phone Number</span>
                  <span className="text-sm font-medium text-slate-800">{application.phoneNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Configuration */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Loan Details</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <span className="text-[11px] text-slate-500 block font-medium">Loan Amount</span>
                <span className="text-base font-bold text-rhb-darkBlue">
                  RM {application.loanAmount.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Tenure</span>
                <span className="text-base font-bold text-slate-800">
                  {application.tenureMonths} Months
                </span>
                <span className="text-[10px] text-slate-400 block">
                  ({(application.tenureMonths / 12).toFixed(1)} yrs)
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Monthly Income</span>
                <span className="text-base font-bold text-slate-800">
                  RM {application.monthlyIncome.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Est. Installment</span>
                <span className="text-base font-bold text-slate-800">
                  RM {estimatedMonthly.toFixed(2)}/mo
                </span>
              </div>
            </div>

            {/* Loan Purpose Card */}
            <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block">Loan Purpose</span>
              <span className="text-sm font-semibold text-slate-800">
                {application.purpose?.name || application.purposeId}
              </span>
              {application.purpose?.description && (
                <p className="text-xs text-slate-500 mt-0.5">{application.purpose.description}</p>
              )}
            </div>
          </div>

          {/* Underwriting Indicators */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Underwriting Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Debt Service Ratio (DSR)</span>
                  <span className={`text-sm font-bold block ${dsr <= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {dsr.toFixed(1)}% {dsr <= 60 ? '(Healthy <60%)' : '(High Risk >60%)'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Submission Date</span>
                  <span className="text-xs font-medium text-slate-700 block">
                    {new Date(application.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
