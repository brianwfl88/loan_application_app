import { PrismaClient } from '@prisma/client';
import { Role, ApplicationStatus } from '@rhb/shared-types';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MALAYSIAN_FIRST_NAMES = [
  'Ahmad', 'Mohd', 'Nurul', 'Siti', 'Farid', 'Amira', 'Hafiz', 'Zulaikha',
  'Wei Lun', 'Mei Ling', 'Jia Hao', 'Xin Yi', 'Kah Seng', 'Shu Ting',
  'Suresh', 'Priya', 'Kavitha', 'Ravindran', 'Anand', 'Deepa',
  'Jonathan', 'Clarissa', 'Dayang', 'Awang', 'Bryan', 'Natasha'
];

const MALAYSIAN_LAST_NAMES = [
  'Abdullah', 'Ismail', 'Ibrahim', 'Razak', 'Sulaiman', 'Othman',
  'Tan', 'Lee', 'Wong', 'Lim', 'Ng', 'Chong', 'Teoh', 'Khoo',
  'Subramaniam', 'Ramasamy', 'Nadarajan', 'Menon', 'Krishnan',
  'Francis', 'Fernandez', 'Gomez', 'Pereira'
];

const STATE_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '14', '15', '16'];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMalaysianNric(): string {
  const year = String(getRandomInt(65, 99)).padStart(2, '0');
  const month = String(getRandomInt(1, 12)).padStart(2, '0');
  const day = String(getRandomInt(1, 28)).padStart(2, '0');
  const state = getRandomItem(STATE_CODES);
  const serial = String(getRandomInt(1000, 9999));
  return `${year}${month}${day}-${state}-${serial}`;
}

function generatePhoneNumber(): string {
  const prefixes = ['012', '013', '014', '016', '017', '018', '019', '011'];
  const prefix = getRandomItem(prefixes);
  const suffix = prefix === '011' ? getRandomInt(10000000, 99999999) : getRandomInt(1000000, 9999999);
  return `${prefix}${suffix}`;
}

async function main() {
  console.log('🚀 Starting RHB Bank Loan Portal Database Seed...');
  const startTime = Date.now();

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123!', salt);
  const customerPasswordHash = await bcrypt.hash('Customer@123!', salt);

  // 1. Seed or update Admin Account
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rhb.com.my' },
    update: {
      passwordHash: adminPasswordHash,
      fullName: 'RHB System Administrator',
      role: Role.ADMIN,
    },
    create: {
      email: 'admin@rhb.com.my',
      passwordHash: adminPasswordHash,
      fullName: 'RHB System Administrator',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin Account created: ${adminUser.email} (Password: Admin@123!)`);

  // 2. Seed or update Demo Customer Account
  const demoCustomer = await prisma.user.upsert({
    where: { email: 'customer@rhb.com.my' },
    update: {
      passwordHash: customerPasswordHash,
      fullName: 'Ahmad bin Abdullah',
      role: Role.CUSTOMER,
    },
    create: {
      email: 'customer@rhb.com.my',
      passwordHash: customerPasswordHash,
      fullName: 'Ahmad bin Abdullah',
      role: Role.CUSTOMER,
    },
  });
  console.log(`✅ Demo Customer Account created: ${demoCustomer.email} (Password: Customer@123!)`);

  // 3. Seed Loan Purposes
  const purposesData = [
    {
      code: 'DEBT_CONSOLIDATION',
      name: 'Debt Consolidation',
      description: 'Consolidate multiple high-interest cards and loans into one lower monthly payment',
      minAmount: 5000,
      maxAmount: 150000,
    },
    {
      code: 'HOME_RENOVATION',
      name: 'Home Renovation & Improvement',
      description: 'Upgrade your living space, furnishings, kitchen cabinets, or home fixtures',
      minAmount: 5000,
      maxAmount: 150000,
    },
    {
      code: 'MEDICAL_EMERGENCY',
      name: 'Medical & Healthcare Expenses',
      description: 'Cover unexpected healthcare, hospitalization, and medical treatments',
      minAmount: 2000,
      maxAmount: 100000,
    },
    {
      code: 'EDUCATION',
      name: 'Education & Professional Upskilling',
      description: 'Fund higher education degrees, certifications, and specialized courses',
      minAmount: 3000,
      maxAmount: 100000,
    },
    {
      code: 'BUSINESS_EXPANSION',
      name: 'Small Business Working Capital',
      description: 'Working capital, machinery, and inventory financing for sole proprietorships',
      minAmount: 10000,
      maxAmount: 200000,
    },
    {
      code: 'PERSONAL_WEDDING',
      name: 'Wedding & Life Milestones',
      description: 'Fund memorable life occasions, wedding ceremonies, and milestone celebrations',
      minAmount: 5000,
      maxAmount: 80000,
    },
  ];

  const seededPurposes = [];
  for (const p of purposesData) {
    const purpose = await prisma.loanPurpose.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
    seededPurposes.push(purpose);
  }
  console.log(`✅ Seeded ${seededPurposes.length} Loan Purposes`);

  // 4. Seed additional customer pool (100 customers)
  console.log('🌱 Creating customer pool for multi-customer applications...');
  const customerList = [demoCustomer];
  const newCustomersData = [];

  for (let i = 1; i <= 99; i++) {
    const fn = getRandomItem(MALAYSIAN_FIRST_NAMES);
    const ln = getRandomItem(MALAYSIAN_LAST_NAMES);
    newCustomersData.push({
      email: `customer${i}@rhb.com.my`,
      passwordHash: customerPasswordHash,
      fullName: `${fn} ${ln}`,
      role: Role.CUSTOMER,
    });
  }

  // Use createMany or upsert
  for (const c of newCustomersData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: c,
      create: c,
    });
    customerList.push(user);
  }
  console.log(`✅ Total customer pool ready: ${customerList.length} customers.`);

  // 5. Generate 10,000+ Loan Applications
  const TOTAL_APPLICATIONS = 10000;
  console.log(`📦 Generating ${TOTAL_APPLICATIONS} loan applications across customer pool...`);

  const purposeIds = seededPurposes.map((p) => p.id);
  const applicationsToInsert = [];

  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < TOTAL_APPLICATIONS; i++) {
    // Select customer
    // Give demoCustomer 20 applications so they have rich personal history
    const customer = i < 20 ? demoCustomer : getRandomItem(customerList);
    const purpose = getRandomItem(seededPurposes);

    const monthlyIncome = getRandomInt(3000, 25000);
    const loanAmount = getRandomInt(Number(purpose.minAmount), Number(purpose.maxAmount));
    const tenureMonths = getRandomItem([12, 24, 36, 48, 60, 72, 84]);

    const rand = Math.random();
    let status: ApplicationStatus = ApplicationStatus.PENDING;
    let creditScore: number | null = null;
    let creditDecisionReason: string | null = null;
    let decidedAt: Date | null = null;

    // Past date within the last 12 months
    const createdTimestamp = now - Math.floor(Math.random() * ONE_YEAR_MS);
    const createdAt = new Date(createdTimestamp);

    if (rand < 0.50) {
      status = ApplicationStatus.APPROVED;
      creditScore = getRandomInt(650, 840);
      creditDecisionReason = `Application Approved: DSR meets risk criteria (<60%). Credit bureau score: ${creditScore}/850.`;
      decidedAt = new Date(createdTimestamp + getRandomInt(15000, 300000));
    } else if (rand < 0.85) {
      status = ApplicationStatus.REJECTED;
      creditScore = getRandomInt(420, 580);
      const isDsrHigh = Math.random() > 0.5;
      creditDecisionReason = isDsrHigh
        ? 'Application Declined: Debt Service Ratio (DSR) exceeds 60.0% policy maximum.'
        : `Application Declined: Credit bureau score (${creditScore}/850) is below eligibility cutoff.`;
      decidedAt = new Date(createdTimestamp + getRandomInt(15000, 300000));
    } else {
      status = ApplicationStatus.PENDING;
    }

    applicationsToInsert.push({
      userId: customer.id,
      fullName: customer.fullName,
      nric: generateMalaysianNric(),
      phoneNumber: generatePhoneNumber(),
      email: customer.email,
      monthlyIncome,
      loanAmount,
      tenureMonths,
      purposeId: purpose.id,
      status,
      creditScore,
      creditDecisionReason,
      submittedAt: createdAt,
      decidedAt,
      createdAt,
      updatedAt: decidedAt || createdAt,
    });
  }

  // Fast chunked insert
  const CHUNK_SIZE = 1000;
  let insertedCount = 0;

  for (let i = 0; i < applicationsToInsert.length; i += CHUNK_SIZE) {
    const chunk = applicationsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.loanApplication.createMany({
      data: chunk,
    });
    insertedCount += chunk.length;
    process.stdout.write(`   ...inserted ${insertedCount}/${TOTAL_APPLICATIONS} applications\r`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Seed finished successfully in ${elapsed}s!`);
  console.log(`📊 Total Applications Seeded: ${insertedCount}`);
  console.log('----------------------------------------------------');
  console.log('🔑 Test Accounts:');
  console.log('   Admin:    admin@rhb.com.my    / Admin@123!');
  console.log('   Customer: customer@rhb.com.my / Customer@123!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
