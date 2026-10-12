import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersRepository } from './users.repository';
import { PatientProfile } from './entities/patient-profile.entity';
import { MedicalBackground } from './entities/medical-background.entity';
import { MedicalCondition } from './entities/medical-condition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PatientProfile,
      MedicalBackground,
      MedicalCondition,
    ]),
  ],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
