import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LoanPurposeDto } from '../types';
import { Landmark, Calculator, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Clock, Info } from 'lucide-react';

export const ApplyLoanPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [nric, setNric] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [monthlyIncome, setMonthlyIncome] = useState<number>(6500);
  const [loanAmount, setLoanAmount] = useState<number>(30000);
  const [tenureMonths, setTenureMonths] = useState<number>(36);
  const [purposeId, setPurposeId] = useState<string>('');

  // Purposes data & slow core banking simulation state
  const [purposes, setPurposes] = useState<LoanPurposeDto[]>([]);
  const [loadingPurposes, setLoadingPurposes] = useState<boolean>(true);
  const [purposeFetchMeta, setPurposeFetchMeta] = useState<{ cached: boolean; fetchTimeMs: number } | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch loan purposes on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingPurposes(true);

    api.get('/loan-purposes')
      .then((res) => {
        if (!isMounted) return;
        const fetchedData: LoanPurposeDto[] = res.data.data;
        setPurposes(fetchedData);
        setPurposeFetchMeta(res.data.meta);
        if (fetchedData.length > 0 && !purposeId) {
          setPurposeId(fetchedData[0].id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching purposes:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingPurposes(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Live Loan Calculation
  const annualInterestRate = 0.055; // 5.5% p.a.
  const totalInterest = loanAmount * annualInterestRate * (tenureMonths / 12);
  const totalRepayment = loanAmount + totalInterest;
  const estimatedMonthly = tenureMonths > 0 ? totalRepayment / tenureMonths : 0;
  const dsr = monthlyIncome > 0 ? (estimatedMonthly / monthlyIncome) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate NRIC pattern (12 digits with or without dash)
    const nricPattern = /^\d{6}-?\d{2}-?\d{4}$/;
    if (!nricPattern.test(nric.trim())) {
      setError('Please provide a valid Malaysian NRIC (e.g. 950812-10-5431 or 950812105431)');
      return;
    }

    // Validate Phone pattern
    const phonePattern = /^(\+?60|0)[1-9]\d{7,8}$/;
    if (!phonePattern.test(phoneNumber.trim())) {
      setError('Please provide a valid Malaysian phone number (e.g. 0123456789 or +60123456789)');
      return;
    }

    if (!purposeId) {
      setError('Please select a loan purpose');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/applications', {
        fullName: fullName.trim(),
        nric: nric.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        monthlyIncome: Number(monthlyIncome),
        loanAmount: Number(loanAmount),
        tenureMonths: Number(tenureMonths),
        purposeId,
      });

      // Redirect immediately to My Applications page where real-time WebSocket listens
      navigate('/my-loans', { state: { newApplicationSubmitted: true } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit application. Please check input.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-rhb-darkBlue tracking-tight">
          Apply for RHB Personal Financing
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Fast online application with automated credit evaluation. Track status in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Applicant Personal Information */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-rhb-darkBlue mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-rhb-blue flex items-center justify-center text-xs font-bold">1</span>
                Personal Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name (as in NRIC) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ahmad bin Abdullah"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rhb-blue/30 focus:border-rhb-blue text-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Malaysian NRIC <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nric}
                      onChange={(e) => setNric(e.target.value)}
                      placeholder="e.g. 950812-10-5431"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rhb-blue/30 focus:border-rhb-blue text-sm font-mono transition-all"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Format: 12 digits (YYMMDD-PB-###G)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0123456789"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rhb-blue/30 focus:border-rhb-blue text-sm transition-all"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 0123456789 or +60123456789</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ahmad@gmail.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rhb-blue/30 focus:border-rhb-blue text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Income (RM) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">RM</span>
                      <input
                        type="number"
                        min="500"
                        step="100"
                        required
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rhb-blue/30 focus:border-rhb-blue text-sm font-semibold transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Requirements */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-rhb-darkBlue mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-rhb-blue flex items-center justify-center text-xs font-bold">2</span>
                Financing Details
              </h2>

              <div className="space-y-4">
                {/* Purpose Selection with slow external banking loader indicator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Loan Purpose <span className="text-rose-500">*</span>
                    </label>
                    {purposeFetchMeta && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {purposeFetchMeta.cached
                          ? `Cached core banking (${purposeFetchMeta.fetchTimeMs}ms)`
                          : `Core Banking API simulated latency: ${(purposeFetchMeta.fetchTimeMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>

                  {loadingPurposes ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-rhb-blue border-t-transparent rounded-full animate-spin"></div>
                      <span>Simulating external core banking query (2.0s delay)...</span>
                    </div>
                  ) : (
                    <select
                      value={purposeId}
                      onChange={(e) => setPurposeId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rhb-blue/30 focus:border-rhb-blue text-sm transition-all"
                    >
                      {purposes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (RM {p.minAmount.toLocaleString()} - RM {p.maxAmount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Loan Amount Slider and Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Loan Amount (RM) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-sm font-bold text-rhb-darkBlue">
                      RM {loanAmount.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="150000"
                    step="1000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rhb-blue"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Min: RM 5,000</span>
                    <span>Max: RM 150,000</span>
                  </div>
                </div>

                {/* Tenure Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Financing Tenure <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[12, 24, 36, 48, 60, 72, 84].map((months) => (
                      <button
                        type="button"
                        key={months}
                        onClick={() => setTenureMonths(months)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                          tenureMonths === months
                            ? 'bg-rhb-blue text-white border-rhb-blue shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {months}m
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Selected: {tenureMonths} months ({(tenureMonths / 12).toFixed(1)} years)
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-rhb-blue hover:bg-rhb-accent text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit Loan Application</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Loan Calculator & Underwriting Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-rhb-darkBlue to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl shadow-slate-300/50">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-rhb-gold" />
                <h3 className="font-bold text-base tracking-tight">Financing Summary</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 font-mono">
                5.50% p.a. Fixed
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-300 block">Estimated Monthly Installment</span>
                <span className="text-3xl font-extrabold text-white mt-1 block">
                  RM {estimatedMonthly.toFixed(2)}
                  <span className="text-xs font-normal text-slate-300 ml-1">/ month</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 block">Total Principal</span>
                  <span className="font-semibold text-white">RM {loanAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Interest</span>
                  <span className="font-semibold text-white">RM {totalInterest.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Repayment</span>
                  <span className="font-semibold text-white">RM {totalRepayment.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tenure</span>
                  <span className="font-semibold text-white">{tenureMonths} Months</span>
                </div>
              </div>

              {/* DSR Indicator */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-300">Debt Service Ratio (DSR)</span>
                  <span className={`font-bold ${dsr <= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {dsr.toFixed(1)}% {dsr <= 60 ? '(Optimal <60%)' : '(High Risk >60%)'}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dsr <= 60 ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${Math.min(dsr, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  RHB underwriting automatically evaluates your DSR and simulated credit bureau score in the background.
                </p>
              </div>
            </div>
          </div>

          {/* Underwriting Process Explainer */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              What Happens Next?
            </h4>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-rhb-blue font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Your application is registered as <strong>Pending</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-rhb-blue font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>An automated credit check is simulated in the background (completes randomly between 10s and 5m).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-rhb-blue font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>The final decision (<strong>Approved</strong> or <strong>Rejected</strong>) will display live in your portal via <strong>WebSockets</strong> without refreshing.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
