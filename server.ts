import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import { initialDatabaseState } from './src/data/initialData';
import {
  DatabaseState,
  RealtimeEvent,
  ScheduledSession,
  PaymentInvoice,
  TrialLesson,
  PackageSubscription,
  PayrollRecord,
  AttendanceRecord,
  AuditLog,
  SystemNotification,
  Student,
  Teacher,
  Parent,
} from './src/types';
import { loadStateFromSql, saveStateToSql } from './src/db/storage';
import { testConnection, switchDatabaseUrl } from './src/db/index';

// Initial in-memory state setup
let db: DatabaseState = JSON.parse(JSON.stringify(initialDatabaseState));
let serverVersion: number = Number((db as any)?.dataVersion) || 1;

// Sync from PostgreSQL Database on server boot
(async () => {
  try {
    const sqlDb = await loadStateFromSql();
    if (sqlDb && Array.isArray(sqlDb.students) && Array.isArray(sqlDb.teachers)) {
      db = sqlDb;
      serverVersion = Number((sqlDb as any)?.dataVersion) || serverVersion;
      console.log('Successfully synced database state from PostgreSQL.');
    } else {
      // Seed initial state into PostgreSQL table
      await saveStateToSql(db);
    }
  } catch (e) {
    console.warn('Initial PostgreSQL sync deferred:', e);
  }
})();

function savePersistentDb(data: DatabaseState) {
  try {
    serverVersion++;
    (data as any)._userModified = true;
    (data as any).dataVersion = serverVersion;
    (data as any).lastSavedAt = new Date().toISOString();
    // Save to PostgreSQL via Drizzle ORM
    saveStateToSql(data).catch((err) => console.warn('Background PostgreSQL save error:', err));
  } catch (e) {
    console.error('Failed to save state to PostgreSQL', e);
  }
}

// Auto-renew completed sessions after 2.5 minutes (150 seconds) so they are automatically scheduled for next week
function autoResetCompletedSessions(database: DatabaseState) {
  if (!database || !Array.isArray(database.sessions)) return;
  const now = Date.now();
  const AUTO_RESET_MS = 150 * 1000;
  let modified = false;
  database.sessions.forEach((s) => {
    if (s.status === 'completed' && s.completedAt) {
      const elapsed = now - new Date(s.completedAt).getTime();
      if (elapsed >= AUTO_RESET_MS) {
        s.status = 'scheduled';
        modified = true;
      }
    }
  });
  if (modified) {
    savePersistentDb(database);
  }
}

// Periodically check for auto-renewal every 10 seconds
setInterval(() => {
  autoResetCompletedSessions(db);
}, 10000);

// Server-Sent Events (SSE) connected clients array for Real-Time Sync
const sseClients: { id: string; res: Response }[] = [];

function broadcastRealtime(event: RealtimeEvent) {
  const enriched = {
    ...event,
    version: serverVersion,
    lastSavedAt: (db as any)?.lastSavedAt || new Date().toISOString(),
  };
  const dataString = `data: ${JSON.stringify(enriched)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(dataString);
    } catch (err) {
      // ignore dropped client
    }
  });
}

// Calculate Dashboard KPIs
function calculateKPIs(state: DatabaseState) {
  const totalStudents = state.students.length;
  const activeStudents = state.students.filter((s) => s.status === 'active').length;
  const inactiveStudents = state.students.filter((s) => s.status === 'inactive').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessionsCount = state.sessions.filter((s) => s.date === todayStr).length;

  const monthlyRevenue = state.invoices
    .filter((inv) => inv.status === 'paid' || inv.status === 'partial')
    .reduce((sum, inv) => sum + inv.paidAmount, 0);

  const outstandingPayments = state.invoices
    .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.remainingAmount, 0);

  const teacherPayrollTotal = state.payrolls.reduce((sum, p) => sum + p.netSalary, 0);

  const totalAttendanceRecords = state.attendance.length;
  const presentRecords = state.attendance.filter((a) => a.status === 'present').length;
  const studentAttendanceRate = totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : 95;

  const subscriptionRenewalsPending = state.subscriptions.filter(
    (sub) => sub.status === 'pending_renewal' || sub.remainingSessions <= 2
  ).length;

  const activeTrialLessons = state.trialLessons.filter((t) => t.status === 'scheduled').length;

  return {
    totalStudents,
    activeStudents,
    inactiveStudents,
    todaySessionsCount,
    monthlyRevenue,
    outstandingPayments,
    teacherPayrollTotal,
    studentAttendanceRate,
    subscriptionRenewalsPending,
    activeTrialLessons,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware for cross-origin synchronization across devices and domains (GitHub Pages, mobile, laptop)
  app.use((req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Realtime Server-Sent Events Endpoint
  app.get('/api/realtime', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    sseClients.push({ id: clientId, res });

    // Initial connection ack
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

    req.on('close', () => {
      const idx = sseClients.findIndex((c) => c.id === clientId);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // Keepalive interval for SSE
  setInterval(() => {
    sseClients.forEach((c) => {
      try {
        c.res.write(`: heartbeat\n\n`);
      } catch (err) {}
    });
  }, 15000);

  // --- REST API ENDPOINTS ---

  // Check current server version for lightweight polling sync
  app.get('/api/state/version', (req: Request, res: Response) => {
    res.json({
      success: true,
      version: serverVersion,
      lastSavedAt: (db as any)?.lastSavedAt || new Date().toISOString(),
    });
  });

  // Get Complete Database State
  app.get('/api/state', (req: Request, res: Response) => {
    autoResetCompletedSessions(db);
    const kpis = calculateKPIs(db);
    res.json({
      success: true,
      db,
      kpis,
      version: serverVersion,
      lastSavedAt: (db as any)?.lastSavedAt || new Date().toISOString(),
    });
  });

  // SQL & Cloud Database Connectivity Status
  app.get('/api/sql/status', async (req: Request, res: Response) => {
    try {
      const isNeon = (process.env.DATABASE_URL || '').includes('neon.tech');
      const activeType = isNeon ? 'Neon (Serverless PostgreSQL)' : 'Google Cloud SQL (PostgreSQL)';
      const connTest = await testConnection();

      res.json({
        success: connTest.success,
        database: activeType,
        status: connTest.success ? 'connected' : 'local_fallback',
        latencyMs: connTest.latencyMs,
        tablesCount: connTest.tablesCount,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.json({
        success: false,
        database: 'Cloud SQL / Neon (PostgreSQL)',
        status: 'error',
        message: 'SQL check handled safely',
      });
    }
  });

  // Test custom Neon or PostgreSQL connection string
  app.post('/api/db/test', async (req: Request, res: Response) => {
    try {
      const { connectionString } = req.body;
      const result = await testConnection(connectionString);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Switch database connection to Neon dynamically
  app.post('/api/db/switch-neon', async (req: Request, res: Response) => {
    try {
      const { connectionString } = req.body;
      if (!connectionString || !connectionString.startsWith('postgres')) {
        return res.status(400).json({
          success: false,
          message: 'رابط الاتصال يجب أن يبدأ بـ postgresql://',
        });
      }

      // 1. Test connection first
      const testRes = await testConnection(connectionString);
      if (!testRes.success) {
        return res.status(400).json({
          success: false,
          message: `فشل الاتصال بـ Neon: ${testRes.message}`,
        });
      }

      // 2. Switch pool and drizzle instance
      const switchRes = switchDatabaseUrl(connectionString);
      if (!switchRes.success) {
        return res.status(500).json(switchRes);
      }

      // 3. Save current state to new database
      await saveStateToSql(db);

      res.json({
        success: true,
        message: 'تم ربط قاعدة بيانات Neon بنجاح ونقل جميع البيانات إليها!',
        type: 'Neon (Serverless PostgreSQL)',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Sync state from client (Authoritative update across all devices)
  app.post('/api/state/sync', async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const clientDb = payload?.db || payload;
      const performedBy = payload?.performedBy || req.body?.performedBy || 'مستخدم النظام';

      if (clientDb && Array.isArray(clientDb.students) && Array.isArray(clientDb.teachers)) {
        serverVersion++;
        (clientDb as any)._userModified = true;
        (clientDb as any).dataVersion = serverVersion;
        (clientDb as any).lastSavedAt = new Date().toISOString();
        db = clientDb;

        // Persist to PostgreSQL (Cloud SQL / Neon)
        await saveStateToSql(db);

        const kpis = calculateKPIs(db);

        // Broadcast immediately to ALL other connected clients (laptops, phones, tablets)
        const event: RealtimeEvent = {
          type: 'MUTATION',
          entity: 'system',
          action: 'SYNC_STATE',
          payload: db,
          timestamp: new Date().toISOString(),
          performedBy,
        };
        broadcastRealtime(event);

        res.json({
          success: true,
          db,
          kpis,
          version: serverVersion,
          lastSavedAt: (db as any)?.lastSavedAt,
        });
      } else {
        res.status(400).json({ success: false, message: 'بيانات غير صالحة للمزامنة' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Reset or seed database
  app.post('/api/state/reset', (req: Request, res: Response) => {
    db = JSON.parse(JSON.stringify(initialDatabaseState));
    savePersistentDb(db);
    const event: RealtimeEvent = {
      type: 'MUTATION',
      entity: 'system',
      action: 'RESET_DATABASE',
      payload: db,
      timestamp: new Date().toISOString(),
      performedBy: req.body.performedBy || 'مدير النظام',
    };
    broadcastRealtime(event);
    res.json({ success: true, message: 'Database reset to initial state', db });
  });

  // Export Database JSON Backup
  app.get('/api/backup/export', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=zakirly_backup_${Date.now()}.json`);
    res.send(JSON.stringify(db, null, 2));
  });

  // Import Database JSON Backup
  app.post('/api/backup/import', (req: Request, res: Response) => {
    try {
      const importedData = req.body;
      if (importedData && importedData.students && importedData.teachers) {
        db = importedData;
        const event: RealtimeEvent = {
          type: 'MUTATION',
          entity: 'system',
          action: 'RESTORE_DATABASE',
          payload: db,
          timestamp: new Date().toISOString(),
          performedBy: 'مدير النظام',
        };
        broadcastRealtime(event);
        res.json({ success: true, db });
      } else {
        res.status(400).json({ success: false, message: 'ملف النسخة الاحتياطية غير صالح' });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // --- AUTOMATION WORKFLOWS ---

  // 1. Session Completion Workflow
  app.post('/api/workflows/complete-session', (req: Request, res: Response) => {
    const { sessionId, attendanceStatus, notes, performedBy, sessionData } = req.body;

    let session = db.sessions.find((s) => s.id === sessionId);
    if (!session && sessionData) {
      session = {
        ...sessionData,
        id: sessionData.id || sessionId || `sess-${Date.now()}`,
      };
      db.sessions.unshift(session);
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'الحصة غير موجودة' });
    }

    const todayDate = new Date().toISOString().split('T')[0];

    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.lastCompletedDate = todayDate;
    if (notes) session.notes = notes;

    const normArabic = (name?: string | null) => {
      if (!name) return '';
      return String(name)
        .trim()
        .toLowerCase()
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/ئ/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/^(أستاذة|استاذة|أستاذ|استاذ|أ\.|م\.|مستر|مس|مهندس|دكتور|د\.)\s*/, '')
        .replace(/[\s_\-–—()]+/g, ' ')
        .trim();
    };

    const isMatch = (n1?: string | null, n2?: string | null) => {
      const a = normArabic(n1);
      const b = normArabic(n2);
      if (!a || !b) return false;
      return a === b || a.includes(b) || b.includes(a);
    };

    // 1. Resolve or Auto-Create Student
    let student = db.students.find((s) => s.id === session.studentId);
    if (!student && session.studentNameAr) {
      student = db.students.find((s) => isMatch(s.nameAr, session.studentNameAr));
    }
    if (!student && session.studentNameAr) {
      student = {
        id: session.studentId || `stu-${Date.now()}`,
        tenantId: session.tenantId || 'tenant-zakirly-curriculum',
        code: `STU-${Math.floor(100 + Math.random() * 900)}`,
        nameAr: session.studentNameAr,
        nameEn: session.studentNameAr,
        gender: 'male',
        email: `student.${Date.now()}@zakirly.com`,
        phone: '01000000000',
        parentId: `par-${Date.now()}`,
        parentNameAr: 'ولي أمر الطالب',
        grade: 'مرحلة أساسية',
        balance: 0,
        enrolledCourseIds: [session.courseId || 'cs-101'],
        totalSessionsCompleted: 0,
        remainingSessions: 0,
        status: 'pending_renewal',
        packageId: `sub-${Date.now()}`,
        createdAt: todayDate,
      };
      db.students.unshift(student);
    }

    let remainingSessionsAfter = 0;
    if (student) {
      session.studentId = student.id;
      session.studentNameAr = student.nameAr;

      // Deduct 1 session from student - CAN GO NEGATIVE if unrenewed!
      const currentRem = typeof student.remainingSessions === 'number' ? student.remainingSessions : 0;
      student.remainingSessions = currentRem - 1;
      student.totalSessionsCompleted = (student.totalSessionsCompleted || 0) + 1;
      remainingSessionsAfter = student.remainingSessions;
      if (student.remainingSessions <= 0) {
        student.status = 'pending_renewal';
      }

      // Check subscription
      let sub = db.subscriptions.find((sb) => sb.studentId === student!.id || sb.id === student!.packageId);
      if (!sub) {
        sub = {
          id: student.packageId || `sub-${Date.now()}`,
          tenantId: session.tenantId || student.tenantId,
          studentId: student.id,
          studentNameAr: student.nameAr,
          courseId: session.courseId || 'cs-101',
          courseTitleAr: session.subjectNameAr || 'مادة تعليمية',
          totalSessions: Math.max(1, student.totalSessionsCompleted || 1),
          remainingSessions: student.remainingSessions,
          status: 'pending_renewal',
          startDate: todayDate,
          endDate: todayDate,
          price: 3200,
          paidAmount: 0,
          autoRenewal: false,
        };
        db.subscriptions.unshift(sub);
      } else {
        const currentSubRem = typeof sub.remainingSessions === 'number' ? sub.remainingSessions : 0;
        sub.remainingSessions = currentSubRem - 1;
        if (sub.remainingSessions <= 2) {
          sub.status = 'pending_renewal';
          student.status = 'pending_renewal';

          const notif: SystemNotification = {
            id: `ntf-${Date.now()}`,
            tenantId: session.tenantId,
            targetRole: 'administrative_director',
            titleAr: `تنبيه تجديد باقة: ${student.nameAr}`,
            titleEn: `Package Renewal Alert: ${student.nameEn}`,
            messageAr: `المتبقي ${sub.remainingSessions} حصص فقط للطالب ${student.nameAr} في باقة ${sub.courseTitleAr} ${sub.remainingSessions < 0 ? '(بالسالب - يستلزم التجديد الفوري)' : ''}.`,
            messageEn: `Only ${sub.remainingSessions} sessions left for ${student.nameEn}.`,
            type: 'warning',
            read: false,
            createdAt: new Date().toISOString(),
            linkModule: 'subscriptions',
          };
          db.notifications.unshift(notif);
        }
      }
    }

    // 2. Resolve or Auto-Create Teacher
    let teacher = db.teachers.find((t) => t.id === session.teacherId);
    if (!teacher && session.teacherNameAr) {
      teacher = db.teachers.find((t) => isMatch(t.nameAr, session.teacherNameAr));
    }
    if (!teacher && session.teacherNameAr) {
      teacher = {
        id: session.teacherId || `tch-${Date.now()}`,
        tenantId: session.tenantId || 'tenant-zakirly-curriculum',
        code: `TCH-${Math.floor(100 + Math.random() * 900)}`,
        nameAr: session.teacherNameAr,
        nameEn: session.teacherNameAr,
        email: `teacher.${Date.now()}@zakirly.com`,
        phone: '01100000000',
        subjects: [session.subjectNameAr || 'مادة دراسية'],
        languages: ['العربية'],
        hourlyRate: 250,
        perSessionRate: 250,
        completedSessionsCount: 0,
        totalEarned: 0,
        rating: 5,
        joinedDate: todayDate,
        status: 'active',
      };
      db.teachers.unshift(teacher);
    }

    if (teacher) {
      session.teacherId = teacher.id;
      session.teacherNameAr = teacher.nameAr;
      teacher.completedSessionsCount = (teacher.completedSessionsCount || 0) + 1;
      teacher.totalEarned = (teacher.totalEarned || 0) + (teacher.perSessionRate || 250);
    }

    // 3. Record in Attendance Sheet (date as YYYY-MM-DD so cycle & sheet detect it)
    const attRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: session.tenantId || (student ? student.tenantId : 'tenant-zakirly-curriculum'),
      sessionId: session.id,
      studentId: student ? student.id : session.studentId,
      studentNameAr: student ? student.nameAr : session.studentNameAr,
      teacherId: teacher ? teacher.id : session.teacherId,
      teacherNameAr: teacher ? teacher.nameAr : (session.teacherNameAr || 'المعلم'),
      date: todayDate, // Real calendar date YYYY-MM-DD
      status: attendanceStatus || 'present',
      notes: notes || `تم إكمال الحصة (${session.subjectNameAr || 'مادة دراسية'}) وتسجيل الحضور آلياً`,
      loggedBy: performedBy || 'المشرف الأكاديمي',
      timestamp: new Date().toISOString(),
    };
    db.attendance.unshift(attRecord);

    // 4. Audit Log
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenantId: session.tenantId,
      userName: performedBy || 'المشرف الأكاديمي',
      userRole: 'academic_director',
      actionAr: 'إكمال حصة دراسية وتسجيل الحضور واحتساب الأجر',
      actionEn: 'Completed Session & Recorded Attendance',
      module: 'sessions',
      details: `تم إكمال الحصة [${session.code}] للطالب ${session.studentNameAr} (المتبقي: ${remainingSessionsAfter} حصة)، واحتساب الحصة للمعلم ${session.teacherNameAr}.`,
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1',
    };
    db.auditLogs.unshift(audit);

    // Broadcast Realtime Update
    const event: RealtimeEvent = {
      type: 'WORKFLOW',
      entity: 'sessions',
      action: 'COMPLETE_SESSION',
      payload: { sessionId, studentId: session.studentId, remainingSessionsAfter, teacherId: session.teacherId },
      timestamp: new Date().toISOString(),
      performedBy: performedBy || 'المشرف الأكاديمي',
    };
    broadcastRealtime(event);
    savePersistentDb(db);

    res.json({
      success: true,
      message: `تم إكمال الحصة بنجاح! تم احتساب الحصة للمعلم (${session.teacherNameAr}) وخصم حصة من رصيد الطالب (${session.studentNameAr}) (المتبقي: ${remainingSessionsAfter} حصة).`,
      session,
      student,
      teacher,
      attendanceRecord: attRecord,
      db,
      kpis: calculateKPIs(db),
    });
  });

  // 2. Process Payment Workflow
  app.post('/api/workflows/process-payment', (req: Request, res: Response) => {
    const { invoiceId, paymentAmount, paymentMethod, notes, performedBy } = req.body;

    const invoice = db.invoices.find((i) => i.id === invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    }

    const payVal = Number(paymentAmount) || 0;
    invoice.paidAmount += payVal;
    invoice.remainingAmount = Math.max(0, invoice.amount - invoice.paidAmount);
    if (invoice.remainingAmount === 0) {
      invoice.status = 'paid';
      invoice.paidDate = new Date().toISOString().split('T')[0];
    } else {
      invoice.status = 'partial';
    }
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (notes) invoice.notes = notes;
    invoice.receiptNumber = `REC-${Date.now().toString().slice(-6)}`;

    // Update Student Balance & Parent Balance
    const student = db.students.find((s) => s.id === invoice.studentId);
    if (student) {
      student.balance += payVal; // Increase credit
    }

    const parent = db.parents.find((p) => p.id === invoice.parentId);
    if (parent) {
      parent.totalDue = Math.max(0, parent.totalDue - payVal);
    }

    // Push notification to accountant & supervisor
    const notif: SystemNotification = {
      id: `ntf-${Date.now()}`,
      tenantId: invoice.tenantId,
      targetRole: 'accountant',
      titleAr: `استلام سند قبض: ${invoice.receiptNumber}`,
      titleEn: `Payment Receipt Issued: ${invoice.receiptNumber}`,
      messageAr: `تم استلام مبلغ ${payVal} ج.م لحساب الفاتورة ${invoice.invoiceNumber} للطالب ${invoice.studentNameAr}.`,
      messageEn: `Received ${payVal} for invoice ${invoice.invoiceNumber}.`,
      type: 'success',
      read: false,
      createdAt: new Date().toISOString(),
      linkModule: 'finance',
    };
    db.notifications.unshift(notif);

    // Audit Log
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      tenantId: invoice.tenantId,
      userName: performedBy || 'المحاسب',
      userRole: 'accountant',
      actionAr: 'تسجيل دفعة مالية وإصدار سند قبض',
      actionEn: 'Processed Payment & Issued Receipt',
      module: 'finance',
      details: `استلام ${payVal} ج.م (سند: ${invoice.receiptNumber}) للطالب ${invoice.studentNameAr}.`,
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1',
    };
    db.auditLogs.unshift(audit);

    // Broadcast Realtime
    const event: RealtimeEvent = {
      type: 'WORKFLOW',
      entity: 'invoices',
      action: 'PAYMENT_PROCESSED',
      payload: { invoiceId, paidAmount: payVal, newStatus: invoice.status },
      timestamp: new Date().toISOString(),
      performedBy: performedBy || 'المحاسب',
    };
    broadcastRealtime(event);
    savePersistentDb(db);

    res.json({ success: true, invoice, student, parent, db, kpis: calculateKPIs(db) });
  });

  // 3. Convert Trial Lesson Workflow
  app.post('/api/workflows/convert-trial', (req: Request, res: Response) => {
    const { trialId, packageCourseId, totalSessions, price, paidAmount, performedBy } = req.body;

    const trial = db.trialLessons.find((t) => t.id === trialId);
    if (!trial) {
      return res.status(404).json({ success: false, message: 'الحصة التجريبية غير موجودة' });
    }

    trial.status = 'converted';

    // Check or Create Parent
    let parent = db.parents.find((p) => p.phone === trial.parentPhone);
    if (!parent) {
      parent = {
        id: `par-${Date.now()}`,
        tenantId: trial.tenantId,
        code: `PAR-${Math.floor(1000 + Math.random() * 9000)}`,
        nameAr: trial.parentNameAr,
        nameEn: trial.parentNameAr,
        phone: trial.parentPhone,
        whatsapp: trial.parentPhone,
        email: `parent.${Date.now()}@zakirly.com`,
        childrenIds: [],
        totalDue: Math.max(0, price - paidAmount),
        createdAt: new Date().toISOString().split('T')[0],
      };
      db.parents.push(parent);
    }

    // Create New Active Student Record
    const student: Student = {
      id: `stu-${Date.now()}`,
      tenantId: trial.tenantId,
      code: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      nameAr: trial.studentNameAr,
      nameEn: trial.studentNameAr,
      gender: 'male',
      email: `student.${Date.now()}@zakirly.com`,
      phone: trial.parentPhone,
      parentId: parent.id,
      parentNameAr: parent.nameAr,
      grade: 'طالب جديد (من تجريبي)',
      status: 'active',
      balance: paidAmount - price,
      remainingSessions: Number(totalSessions) || 12,
      totalSessionsCompleted: 1, // Trial counted
      enrolledCourseIds: [packageCourseId || trial.courseId],
      notes: 'تم التحويل التلقائي من حصة تجريبية بنجاح',
      createdAt: new Date().toISOString().split('T')[0],
    };
    db.students.push(student);
    parent.childrenIds.push(student.id);

    // Create Subscription Package
    const course = db.courseSubjects.find((c) => c.id === (packageCourseId || trial.courseId));
    const subscription: PackageSubscription = {
      id: `sub-${Date.now()}`,
      tenantId: trial.tenantId,
      studentId: student.id,
      studentNameAr: student.nameAr,
      courseId: course ? course.id : trial.courseId,
      courseTitleAr: course ? course.titleAr : trial.courseTitleAr,
      totalSessions: Number(totalSessions) || 12,
      remainingSessions: Number(totalSessions) || 12,
      price: Number(price) || 3000,
      paidAmount: Number(paidAmount) || 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'active',
      autoRenewal: true,
      notes: 'اشتراك مفعل آلياً عقب تحويل الحصة التجريبية',
    };
    db.subscriptions.push(subscription);
    student.packageId = subscription.id;

    // Create Invoice
    const invoice: PaymentInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: trial.tenantId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      studentId: student.id,
      studentNameAr: student.nameAr,
      parentId: parent.id,
      parentNameAr: parent.nameAr,
      amount: Number(price) || 3000,
      paidAmount: Number(paidAmount) || 0,
      remainingAmount: Math.max(0, (Number(price) || 3000) - (Number(paidAmount) || 0)),
      status: paidAmount >= price ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      type: 'subscription',
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
    };
    db.invoices.push(invoice);

    trial.convertedSubscriptionId = subscription.id;

    // Broadcast Event
    const event: RealtimeEvent = {
      type: 'WORKFLOW',
      entity: 'trialLessons',
      action: 'CONVERT_TRIAL',
      payload: { trialId, studentId: student.id, subscriptionId: subscription.id },
      timestamp: new Date().toISOString(),
      performedBy: performedBy || 'المدير الإداري',
    };
    broadcastRealtime(event);
    savePersistentDb(db);

    res.json({ success: true, student, subscription, invoice, db, kpis: calculateKPIs(db) });
  });

  // 4. Calculate / Run Payroll Workflow
  app.post('/api/workflows/run-payroll', (req: Request, res: Response) => {
    const { month, year, performedBy } = req.body;

    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();

    // Calculate Accounting Cycle Dates: 26th of previous month to 25th of current month
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const cycleStart = `${prevY}-${String(prevM).padStart(2, '0')}-26`;
    const cycleEnd = `${y}-${String(m).padStart(2, '0')}-25`;

    const createdPayrolls: PayrollRecord[] = [];

    db.teachers.forEach((teacher) => {
      // Find completed sessions inside this accounting cycle (26th to 25th)
      const completedSessFromSessions = db.sessions.filter((s) => {
        if (s.teacherId !== teacher.id || s.status !== 'completed') return false;
        const cleanDate = s.date.split('T')[0];
        return cleanDate >= cycleStart && cleanDate <= cycleEnd;
      });

      // Also check attendance records where teacher completed attendance
      const completedAtt = db.attendance.filter((a) => {
        if (a.teacherId !== teacher.id) return false;
        if (a.status !== 'present' && a.status !== 'late') return false;
        const cleanDate = a.date.split('T')[0];
        return cleanDate >= cycleStart && cleanDate <= cycleEnd;
      });

      // Deduplicate session count by unique session IDs / timestamps
      const uniqueSessionIds = new Set([
        ...completedSessFromSessions.map((s) => s.id),
        ...completedAtt.map((a) => a.sessionId),
      ]);

      const count = Math.max(completedSessFromSessions.length, uniqueSessionIds.size, completedAtt.length);
      const rate = teacher.perSessionRate || 200;
      const gross = count * rate;

      // Check existing draft or payroll
      let existing = db.payrolls.find((p) => p.teacherId === teacher.id && p.month === m && p.year === y);
      if (existing) {
        existing.sessionsCount = count;
        existing.grossAmount = gross;
        existing.netSalary = gross + existing.bonus - existing.deductions;
        createdPayrolls.push(existing);
      } else {
        const newPayroll: PayrollRecord = {
          id: `pay-${Date.now()}-${teacher.id}`,
          tenantId: teacher.tenantId,
          teacherId: teacher.id,
          teacherNameAr: teacher.nameAr,
          month: m,
          year: y,
          sessionsCount: count,
          totalHours: count,
          ratePerSession: rate,
          grossAmount: gross,
          bonus: 0,
          deductions: 0,
          netSalary: gross,
          status: 'draft',
          notes: `مسودة مرتب الدورة المحاسبية (${cycleStart} إلى ${cycleEnd}) أعدت تلقائياً`,
        };
        db.payrolls.unshift(newPayroll);
        createdPayrolls.push(newPayroll);
      }
    });

    // Broadcast Realtime Event
    const event: RealtimeEvent = {
      type: 'WORKFLOW',
      entity: 'payroll',
      action: 'RUN_PAYROLL',
      payload: { month: m, year: y, recordsCount: createdPayrolls.length },
      timestamp: new Date().toISOString(),
      performedBy: performedBy || 'المحاسب',
    };
    broadcastRealtime(event);
    savePersistentDb(db);

    res.json({ success: true, payrolls: createdPayrolls, db, kpis: calculateKPIs(db) });
  });

  // --- GENERAL ENTITY CRUD ROUTES ---

  // Students CRUD
  app.post('/api/students', (req: Request, res: Response) => {
    const studentId = `stu-${Date.now()}`;
    const tenantId = req.body.tenantId || 'tenant-zakirly-curriculum';
    const parentNameAr = req.body.parentNameAr || 'ولي أمر الطالب';
    const parentPhone = req.body.phone || '+20 100 000 0000';

    // 1. Auto Sync / Create Guardian (Parent)
    let parent = db.parents.find((p) => p.phone === parentPhone || p.nameAr === parentNameAr);
    if (!parent) {
      parent = {
        id: `par-${Date.now()}`,
        tenantId,
        code: `PAR-${Math.floor(1000 + Math.random() * 9000)}`,
        nameAr: parentNameAr,
        nameEn: parentNameAr,
        phone: parentPhone,
        whatsapp: parentPhone,
        email: `parent.${Date.now()}@zakirly.com`,
        relationship: 'والد / ولي أمر',
        childrenIds: [studentId],
        totalDue: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      db.parents.unshift(parent);
    } else {
      if (!parent.childrenIds.includes(studentId)) {
        parent.childrenIds.push(studentId);
      }
    }

    // 2. Create Student Record
    const remainingSess = typeof req.body.remainingSessions === 'number' ? req.body.remainingSessions : 12;
    const newStudent: Student = {
      id: studentId,
      tenantId,
      code: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      nameAr: req.body.nameAr,
      nameEn: req.body.nameEn || req.body.nameAr,
      gender: req.body.gender || 'male',
      email: req.body.email || `student.${Date.now()}@zakirly.com`,
      phone: parentPhone,
      parentId: parent.id,
      parentNameAr: parent.nameAr,
      grade: req.body.grade || 'الصف الأول الابتدائي',
      status: req.body.status || 'active',
      balance: Number(req.body.balance) || 0,
      currency: req.body.currency || 'SAR',
      remainingSessions: remainingSess,
      totalSessionsCompleted: 0,
      enrolledCourseIds: req.body.enrolledCourseIds || ['cs-101'],
      assignedTeacherId: req.body.assignedTeacherId,
      assignedTeacherNameAr: req.body.assignedTeacherNameAr,
      enrolledTeachers: req.body.enrolledTeachers || [],
      packageNameAr: req.body.packageNameAr,
      notes: req.body.notes || 'تم تسجيل الطالب وربطه بولي الأمر والمعلم والمواد الجارية',
      createdAt: new Date().toISOString().split('T')[0],
    };
    db.students.unshift(newStudent);

    // 3. Auto Sync / Create Subscription & Enrollment
    const newSub: PackageSubscription = {
      id: `sub-${Date.now()}`,
      tenantId,
      studentId,
      studentNameAr: newStudent.nameAr,
      courseId: (req.body.enrolledCourseIds && req.body.enrolledCourseIds[0]) || 'cs-101',
      courseTitleAr: req.body.packageNameAr || `${newStudent.grade} - باقة الحصص الشاملة`,
      totalSessions: remainingSess,
      remainingSessions: remainingSess,
      price: 3000,
      paidAmount: 3000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'active',
      autoRenewal: true,
      notes: 'تم إصدار الاشتراك وتفعيل التسجيل آلياً',
    };
    db.subscriptions.unshift(newSub);
    newStudent.packageId = newSub.id;

    broadcastRealtime({
      type: 'MUTATION',
      entity: 'students',
      action: 'CREATE',
      payload: { student: newStudent, parent, subscription: newSub },
      timestamp: new Date().toISOString(),
      performedBy: req.body.performedBy || 'المستخدم',
    });
    savePersistentDb(db);

    res.json({ success: true, student: newStudent, parent, subscription: newSub, db });
  });

  app.put('/api/students/:id', (req: Request, res: Response) => {
    const idx = db.students.findIndex((s) => s.id === req.params.id);
    if (idx !== -1) {
      db.students[idx] = { ...db.students[idx], ...req.body };
      broadcastRealtime({
        type: 'MUTATION',
        entity: 'students',
        action: 'UPDATE',
        payload: db.students[idx],
        timestamp: new Date().toISOString(),
        performedBy: req.body.performedBy || 'المستخدم',
      });
      savePersistentDb(db);
      return res.json({ success: true, student: db.students[idx], db });
    }
    res.status(404).json({ success: false, message: 'الطالب غير موجود' });
  });

  app.delete('/api/students/:id', (req: Request, res: Response) => {
    db.students = db.students.filter((s) => s.id !== req.params.id);
    broadcastRealtime({
      type: 'MUTATION',
      entity: 'students',
      action: 'DELETE',
      payload: { id: req.params.id },
      timestamp: new Date().toISOString(),
      performedBy: 'المستخدم',
    });
    savePersistentDb(db);
    res.json({ success: true, id: req.params.id, db });
  });

  // Teachers CRUD
  app.post('/api/teachers', (req: Request, res: Response) => {
    const newTeacher: Teacher = {
      id: `tch-${Date.now()}`,
      tenantId: req.body.tenantId || 'tenant-zakirly-curriculum',
      code: `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
      nameAr: req.body.nameAr,
      nameEn: req.body.nameEn || req.body.nameAr,
      email: req.body.email,
      phone: req.body.phone,
      subjects: req.body.subjects || [],
      languages: req.body.languages || ['العربية'],
      hourlyRate: Number(req.body.hourlyRate) || 200,
      perSessionRate: Number(req.body.perSessionRate) || 200,
      status: req.body.status || 'active',
      totalEarned: 0,
      completedSessionsCount: 0,
      rating: 5.0,
      bio: req.body.bio || '',
      joinedDate: new Date().toISOString().split('T')[0],
    };
    db.teachers.unshift(newTeacher);

    // Auto sync user account for teacher
    const teacherEmail = newTeacher.email || `teacher.${Date.now()}@zakirly.edu`;
    const userIdx = db.users.findIndex((u) => u.email === teacherEmail || (u.linkedEntityId && u.linkedEntityId === newTeacher.id));
    if (userIdx !== -1) {
      db.users[userIdx].linkedEntityId = newTeacher.id;
      if (req.body.password) db.users[userIdx].password = req.body.password;
    } else {
      db.users.unshift({
        id: `usr-${Date.now()}`,
        tenantId: newTeacher.tenantId,
        name: newTeacher.nameAr,
        nameAr: newTeacher.nameAr,
        email: teacherEmail,
        password: req.body.password || '123456',
        role: 'teacher',
        linkedEntityId: newTeacher.id,
        status: 'active',
      });
    }

    broadcastRealtime({
      type: 'MUTATION',
      entity: 'teachers',
      action: 'CREATE',
      payload: newTeacher,
      timestamp: new Date().toISOString(),
      performedBy: 'المستخدم',
    });
    savePersistentDb(db);

    res.json({ success: true, teacher: newTeacher, db });
  });

  app.put('/api/teachers/:id', (req: Request, res: Response) => {
    const idx = db.teachers.findIndex((t) => t.id === req.params.id);
    if (idx !== -1) {
      db.teachers[idx] = { ...db.teachers[idx], ...req.body };
      broadcastRealtime({
        type: 'MUTATION',
        entity: 'teachers',
        action: 'UPDATE',
        payload: db.teachers[idx],
        timestamp: new Date().toISOString(),
        performedBy: 'المستخدم',
      });
      savePersistentDb(db);
      return res.json({ success: true, teacher: db.teachers[idx], db });
    }
    res.status(404).json({ success: false, message: 'المعلم غير موجود' });
  });

  app.delete('/api/teachers/:id', (req: Request, res: Response) => {
    db.teachers = db.teachers.filter((t) => t.id !== req.params.id);
    broadcastRealtime({
      type: 'MUTATION',
      entity: 'teachers',
      action: 'DELETE',
      payload: { id: req.params.id },
      timestamp: new Date().toISOString(),
      performedBy: 'المستخدم',
    });
    savePersistentDb(db);
    res.json({ success: true, id: req.params.id, db });
  });

  // Sessions CRUD
  app.post('/api/sessions', (req: Request, res: Response) => {
    const { teacherId, studentId, courseId, date, startTime, durationMinutes, dayOfWeek, dayNameAr, dayNum } = req.body;

    if (!teacherId || !studentId) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار المعلم والطالب لجدولة الحصة' });
    }

    // Resolve day of week
    const targetDayOfWeek = dayOfWeek || (date && date.includes('day') ? date : undefined);
    const targetDayNameAr = dayNameAr || date;

    // Check Schedule Clash for Teacher in the same day & time
    const teacherClash = db.sessions.find((s) => {
      if (s.teacherId !== teacherId || s.startTime !== startTime || s.status !== 'scheduled') return false;
      if (targetDayOfWeek && s.dayOfWeek && s.dayOfWeek === targetDayOfWeek) return true;
      if (targetDayNameAr && (s.dayNameAr === targetDayNameAr || s.date === targetDayNameAr)) return true;
      if (date && s.date === date) return true;
      return false;
    });

    if (teacherClash) {
      return res.status(400).json({ success: false, message: 'تعارض مواعيد! المعلم لديه حصة مجدولة بالفعل في هذا اليوم والتوقيت.' });
    }

    const teacher = db.teachers.find((t) => t.id === teacherId);
    const student = db.students.find((s) => s.id === studentId);
    const course = db.courseSubjects.find((c) => c.id === courseId);

    const dur = Number(durationMinutes) || 60;
    const safeStartStr = String(startTime || '17:00').trim();
    let startH = 17;
    let startM = 0;
    const timeMatch = safeStartStr.match(/(\d{1,2})[:.](\d{2})/);
    if (timeMatch) {
      startH = parseInt(timeMatch[1], 10);
      startM = parseInt(timeMatch[2], 10);
      if (/pm|م|مساء/i.test(safeStartStr) && startH < 12) startH += 12;
      if (/am|ص|صباح/i.test(safeStartStr) && startH === 12) startH = 0;
    }
    const endH = (startH + Math.floor((startM + dur) / 60)) % 24;
    const endM = (startM + dur) % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const newSession: ScheduledSession = {
      id: `ses-${Date.now()}`,
      tenantId: req.body.tenantId || 'tenant-zakirly-curriculum',
      code: `SES-${Math.floor(100 + Math.random() * 900)}`,
      courseId: courseId || 'cs-101',
      subjectNameAr: req.body.courseTitleAr || (course ? course.titleAr : 'مادة تعليمية'),
      teacherId: teacherId,
      teacherNameAr: req.body.teacherNameAr || (teacher ? teacher.nameAr : 'المعلم'),
      studentId: studentId,
      studentNameAr: req.body.studentNameAr || (student ? student.nameAr : 'الطالب'),
      dayOfWeek: targetDayOfWeek,
      dayNameAr: targetDayNameAr,
      dayNum: typeof dayNum === 'number' ? dayNum : undefined,
      date: date || targetDayNameAr || new Date().toISOString().split('T')[0],
      startTime: startTime || '17:00',
      endTime: endTime,
      durationMinutes: dur,
      status: 'scheduled',
      meetingUrl: req.body.meetingUrl || `https://teams.microsoft.com/l/meetup-join/zakirly-${Math.floor(1000 + Math.random() * 9000)}`,
      roomName: req.body.roomName || 'قاعة افتراضية',
      notes: req.body.notes || '',
      teacherPaid: false,
    };

    db.sessions.unshift(newSession);

    broadcastRealtime({
      type: 'MUTATION',
      entity: 'sessions',
      action: 'CREATE',
      payload: newSession,
      timestamp: new Date().toISOString(),
      performedBy: 'المستخدم',
    });
    savePersistentDb(db);

    res.json({ success: true, session: newSession, db });
  });

  app.put('/api/sessions/:id', (req: Request, res: Response) => {
    const idx = db.sessions.findIndex((s) => s.id === req.params.id);
    if (idx !== -1) {
      db.sessions[idx] = { ...db.sessions[idx], ...req.body };
      broadcastRealtime({
        type: 'MUTATION',
        entity: 'sessions',
        action: 'UPDATE',
        payload: db.sessions[idx],
        timestamp: new Date().toISOString(),
        performedBy: 'المستخدم',
      });
      savePersistentDb(db);
      return res.json({ success: true, session: db.sessions[idx], db });
    }
    res.status(404).json({ success: false, message: 'الحصة غير موجودة' });
  });

  app.delete('/api/sessions/:id', (req: Request, res: Response) => {
    db.sessions = db.sessions.filter((s) => s.id !== req.params.id);
    broadcastRealtime({
      type: 'MUTATION',
      entity: 'sessions',
      action: 'DELETE',
      payload: { id: req.params.id },
      timestamp: new Date().toISOString(),
      performedBy: 'المستخدم',
    });
    savePersistentDb(db);
    res.json({ success: true, id: req.params.id, db });
  });

  // Invoices CRUD
  app.post('/api/invoices', (req: Request, res: Response) => {
    const newInvoice: PaymentInvoice = req.body;
    db.invoices.unshift(newInvoice);
    broadcastRealtime({
      type: 'MUTATION',
      entity: 'invoices',
      action: 'CREATE',
      payload: newInvoice,
      timestamp: new Date().toISOString(),
      performedBy: 'المستخدم',
    });
    savePersistentDb(db);
    res.json({ success: true, invoice: newInvoice, db });
  });

  app.delete('/api/invoices/:id', (req: Request, res: Response) => {
    db.invoices = db.invoices.filter((i) => i.id !== req.params.id);
    broadcastRealtime({
      type: 'MUTATION',
      entity: 'invoices',
      action: 'DELETE',
      payload: { id: req.params.id },
      timestamp: new Date().toISOString(),
      performedBy: 'المستخدم',
    });
    savePersistentDb(db);
    res.json({ success: true, id: req.params.id, db });
  });

  // Google Sheets Export & Sync API
  app.post('/api/google-sheets/export', async (req: Request, res: Response) => {
    try {
      const { sheetTitle, headers, rows, accessToken } = req.body;

      if (!headers || !rows) {
        return res.status(400).json({ success: false, message: 'بيانات الجدول غير مكتملة' });
      }

      if (accessToken) {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        const sheets = google.sheets({ version: 'v4', auth });

        const spreadsheet = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: sheetTitle || `أكاديمية ذاكرلي - ${new Date().toLocaleDateString('ar-EG')}`,
            },
          },
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;

        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId!,
          range: 'Sheet1!A1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers, ...rows],
          },
        });

        return res.json({
          success: true,
          spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
          message: 'تم تصدير البيانات بنجاح إلى Google Sheets!',
        });
      }

      // If no token provided, fallback response with formatted CSV payload
      res.json({
        success: true,
        message: 'تم تجهيز البيانات للتصدير إلى Google Sheets',
        dataCount: rows.length,
      });
    } catch (err: any) {
      console.error('Google Sheets API Error:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'فشل الاتصال بـ Google Sheets API',
      });
    }
  });

  // Serve static assets or Vite Dev Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zakirly OS] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
