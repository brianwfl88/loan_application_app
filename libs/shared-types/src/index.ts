export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserSummary;
}

export interface LoanPurposeDto {
  id: string;
  code: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
}

export interface LoanApplicationDto {
  id: string;
  userId: string;
  fullName: string;
  nric: string;
  phoneNumber: string;
  email: string;
  monthlyIncome: number;
  loanAmount: number;
  tenureMonths: number;
  purposeId: string;
  purpose?: LoanPurposeDto;
  status: ApplicationStatus;
  creditScore?: number | null;
  creditDecisionReason?: string | null;
  submittedAt: string;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanApplicationPayload {
  fullName: string;
  nric: string;
  phoneNumber: string;
  email: string;
  monthlyIncome: number;
  loanAmount: number;
  tenureMonths: number;
  purposeId: string;
}

export interface ApplicationStatusUpdatedEvent {
  applicationId: string;
  userId: string;
  status: ApplicationStatus;
  creditScore?: number;
  creditDecisionReason?: string;
  decidedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
