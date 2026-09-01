export type UserRole =
  | 'super_admin'
  | 'academic_director'
  | 'administrative_director'
  | 'supervisor'
  | 'supervisor_courses'
  | 'supervisor_curriculum'
  | 'teacher'
  | 'parent'
  | 'student'
  | 'accountant';

export interface RoleInfo {
  id: UserRole;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  badgeBg: string;
  badgeTextColor: string;
}

export interface Tenant {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  logo: string;
  currency: string;
  phone: string;
  email: string;
  status: 'active' | 'suspended';
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  status: 'active' | 'inactive';
  linkedEntityId?: string; // studentId, teacherId, or parentId
  lastLogin?: string;
}

export interface Student {
  id: string;
  tenantId: string;
  code: string; // e.g. STU-1001
  nameAr: string;
  nameEn: string;
  gender: 'male' | 'female';
  email: string;
  phone: string;
  parentId: string;
  parentNameAr: string;
  grade: string;
  status: 'active' | 'inactive' | 'trial' | 'pending_renewal';
  balance: number; // positive = credit/overpaid, negative = unpaid debt
  remainingSessions: number;
  totalSessionsCompleted: number;
  currency?: string;
  packageId?: string;
  packageNameAr?: string;
  enrolledCourseIds: string[];
  enrolledTeachers?: { teacherId: string; teacherNameAr: string; subject: string }[];
  assignedTeacherId?: string;
  assignedTeacherNameAr?: string;
  notes?: string;
  createdAt: string;
}

export interface Parent {
  id: string;
  tenantId: string;
  code: string; // e.g. PAR-2001
  nameAr: string;
  nameEn: string;
  phone: string;
  whatsapp: string;
  email: string;
  occupation?: string;
  relationship?: string;
  childrenIds: string[];
  totalDue: number; // total outstanding across children
  createdAt: string;
}

export interface Teacher {
  id: string;
  tenantId: string;
  code: string; // e.g. TCH-3001
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  subjects: string[]; // e.g. ['اللغة الإنجليزية', 'الرياضيات']
  languages: string[];
  hourlyRate: number; // EGP or USD per hour
  perSessionRate: number;
  status: 'active' | 'on_leave' | 'inactive';
  totalEarned: number;
  completedSessionsCount: number;
  rating: number; // 1-5
  bio?: string;
  joinedDate: string;
}

export interface CourseSubject {
  id: string;
  tenantId: string;
  code: string; // e.g. CS-101
  titleAr: string;
  titleEn: string;
  category: 'language' | 'academic' | 'quran' | 'general';
  level: string; // e.g. 'A1', 'B2', 'المستوى الأول', 'التأسيس'
  pricePerSession: number;
  suggestedDurationMinutes: number;
  status: 'active' | 'inactive';
  descriptionAr?: string;
}

export interface PackageSubscription {
  id: string;
  tenantId: string;
  studentId: string;
  studentNameAr: string;
  courseId: string;
  courseTitleAr: string;
  totalSessions: number;
  remainingSessions: number;
  price: number;
  paidAmount: number;
  currency?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending_renewal' | 'cancelled';
  autoRenewal: boolean;
  notes?: string;
}

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'absent_student' | 'absent_teacher';

export interface ScheduledSession {
  id: string;
  tenantId: string;
  code: string;
  courseId: string;
  subjectNameAr: string;
  teacherId: string;
  teacherNameAr: string;
  studentId: string;
  studentNameAr: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: SessionStatus;
  meetingUrl?: string;
  roomName?: string;
  notes?: string;
  completedAt?: string;
  teacherPaid: boolean;
}

export type AttendanceStatus = 'present' | 'absent_excused' | 'absent_unexcused' | 'late';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  sessionId: string;
  studentId: string;
  studentNameAr: string;
  teacherId: string;
  teacherNameAr?: string;
  date: string;
  status: AttendanceStatus;
  minutesLate?: number;
  notes?: string;
  loggedBy: string;
  timestamp: string;
}

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'vodafone_cash' | 'credit_card';

export interface PaymentInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string; // INV-2026-001
  studentId: string;
  studentNameAr: string;
  parentId: string;
  parentNameAr: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  status: InvoiceStatus;
  type: 'subscription' | 'trial_fee' | 'material' | 'other';
  dueDate: string;
  paidDate?: string;
  transactionRef?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;

  // Rich course & teacher cost metadata for profit tracking
  subjectNameAr?: string;
  teacherId?: string;
  teacherNameAr?: string;
  teacherRate?: number; // سعر ساعة/حصة المعلم بالجنيه المصري (EGP)
  sessionsCount?: number; // عدد الحصص بالباقة
  exchangeRate?: number; // سعر صرف عملة الفاتورة مقابل الجنيه المصري (EGP)
}

export interface PayrollRecord {
  id: string;
  tenantId: string;
  teacherId: string;
  teacherNameAr: string;
  month: number; // 1-12
  year: number; // 2026
  sessionsCount: number;
  totalHours: number;
  ratePerSession: number;
  grossAmount: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  isSettled?: boolean;
  settledAt?: string;
  paidDate?: string;
  notes?: string;
}

export interface TrialLesson {
  id: string;
  tenantId: string;
  studentNameAr: string;
  parentPhone: string;
  parentNameAr: string;
  courseId: string;
  courseTitleAr: string;
  assignedTeacherId: string;
  assignedTeacherNameAr: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'scheduled' | 'completed' | 'converted' | 'cancelled';
  conversionFeedback?: string;
  convertedSubscriptionId?: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  tenantId: string;
  targetRole?: UserRole | 'all';
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  read: boolean;
  createdAt: string;
  linkModule?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userName: string;
  userRole: UserRole;
  actionAr: string;
  actionEn: string;
  module: string;
  details: string;
  timestamp: string;
  ip: string;
}

export interface DatabaseState {
  tenants: Tenant[];
  users: User[];
  students: Student[];
  parents: Parent[];
  teachers: Teacher[];
  courseSubjects: CourseSubject[];
  subscriptions: PackageSubscription[];
  sessions: ScheduledSession[];
  attendance: AttendanceRecord[];
  invoices: PaymentInvoice[];
  payrolls: PayrollRecord[];
  trialLessons: TrialLesson[];
  notifications: SystemNotification[];
  auditLogs: AuditLog[];
}

export interface SystemKPIs {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  todaySessionsCount: number;
  monthlyRevenue: number;
  outstandingPayments: number;
  teacherPayrollTotal: number;
  studentAttendanceRate: number;
  subscriptionRenewalsPending: number;
  activeTrialLessons: number;
}

export interface RealtimeEvent {
  type: 'MUTATION' | 'WORKFLOW' | 'SYSTEM_ALERT';
  entity: string;
  action: string;
  payload: any;
  timestamp: string;
  performedBy: string;
}
