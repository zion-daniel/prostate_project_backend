import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { PatientAssessment } from '../patients/entities/patient-assessment.entity';

function formatAssessment(assessment: PatientAssessment) {
  return {
    id: assessment.id,
    patientId: assessment.user?.id ?? '',
    patientName: assessment.patientName,
    patientEmail: assessment.user?.email ?? '',
    score: assessment.score,
    maxScore: assessment.maxScore,
    percentage: assessment.percentage,
    tier: {
      tier: assessment.tierKey,
      label: assessment.tierLabel,
      icon: assessment.tierIcon,
      summary: assessment.tierSummary,
      recommendation: assessment.tierRecommendation,
      urgency: assessment.tierUrgency,
    },
    automaticRecommendation: assessment.automaticRecommendation,
    status: assessment.status,
    timestamp: assessment.createdAt.toISOString(),
    selectedIds: assessment.selectedIds ?? [],
    breakdown: assessment.breakdown ?? {},
  };
}

@Injectable()
export class AdminService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboard() {
    const userRepo = this.dataSource.getRepository(User);
    const assessmentRepo = this.dataSource.getRepository(PatientAssessment);

    const [patients, admins, assessments] = await Promise.all([
      userRepo.count({ where: { role: UserRole.PATIENT } }),
      userRepo.count({ where: { role: UserRole.ADMIN } }),
      assessmentRepo.find({
        relations: { user: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const tierCounts = assessments.reduce(
      (accumulator, assessment) => {
        accumulator[assessment.tierKey] =
          (accumulator[assessment.tierKey] ?? 0) + 1;
        return accumulator;
      },
      { urgent: 0, high: 0, moderate: 0, low: 0 } as Record<string, number>,
    );

    const topSymptoms = new Map<string, number>();
    for (const assessment of assessments) {
      for (const symptomId of assessment.selectedIds ?? []) {
        topSymptoms.set(symptomId, (topSymptoms.get(symptomId) ?? 0) + 1);
      }
    }

    return {
      stats: {
        patients,
        admins,
        assessments: assessments.length,
      },
      riskTierDistribution: [
        { tier: 'urgent', count: tierCounts.urgent ?? 0 },
        { tier: 'high', count: tierCounts.high ?? 0 },
        { tier: 'moderate', count: tierCounts.moderate ?? 0 },
        { tier: 'low', count: tierCounts.low ?? 0 },
      ],
      mostCommonSymptoms: Array.from(topSymptoms.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, count })),
      recentAssessments: assessments.slice(0, 10).map(formatAssessment),
    };
  }

  async listUsers() {
    const userRepo = this.dataSource.getRepository(User);
    const users = await userRepo.find({
      relations: {
        profile: true,
        medicalBackground: true,
      },
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      status: user.isVerified ? 'verified' : 'pending',
    }));
  }

  async listAssessments() {
    const repo = this.dataSource.getRepository(PatientAssessment);
    const assessments = await repo.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return assessments.map(formatAssessment);
  }
}
