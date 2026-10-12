import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  Max,
  Matches,
  IsString,
} from 'class-validator';

export class CreateApplicationDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName: string;

  /**
   * Malaysian NRIC validation:
   * Accepts 12 digits with or without hyphens: YYMMDD-PB-###G or YYMMDD######
   * Regex: ^\d{6}-?\d{2}-?\d{4}$
   */
  @IsNotEmpty({ message: 'NRIC is required' })
  @Matches(/^\d{6}-?\d{2}-?\d{4}$/, {
    message: 'NRIC must be a valid 12-digit Malaysian NRIC format (e.g. 950812-10-5431 or 950812105431)',
  })
  nric: string;

  /**
   * Malaysian Phone Number validation:
   * Accepts mobile or landline numbers starting with 01, +601, 601, etc.
   * Regex: ^(\+?60|0)[1-9]\d{7,8}$
   */
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^(\+?60|0)[1-9]\d{7,8}$/, {
    message: 'Phone number must be a valid Malaysian phone number (e.g. 0123456789 or +60123456789)',
  })
  phoneNumber: string;

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Monthly income is required' })
  @IsNumber({}, { message: 'Monthly income must be a number' })
  @Min(500, { message: 'Monthly income must be at least RM 500' })
  monthlyIncome: number;

  @IsNotEmpty({ message: 'Loan amount is required' })
  @IsNumber({}, { message: 'Loan amount must be a number' })
  @Min(1000, { message: 'Loan amount must be at least RM 1,000' })
  @Max(250000, { message: 'Maximum personal loan amount is RM 250,000' })
  loanAmount: number;

  @IsNotEmpty({ message: 'Tenure is required' })
  @IsInt({ message: 'Tenure must be an integer number of months' })
  @Min(6, { message: 'Minimum tenure is 6 months' })
  @Max(84, { message: 'Maximum tenure is 84 months (7 years)' })
  tenureMonths: number;

  @IsNotEmpty({ message: 'Loan purpose is required' })
  @IsString()
  purposeId: string;
}
