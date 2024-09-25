import { v4 as uuidv4 } from 'uuid';

import { ROLES, STATUS } from '../constants';

type Role = (typeof ROLES)[keyof typeof ROLES];
type Status = (typeof STATUS)[keyof typeof STATUS];

interface HouseholdMemberData {
  id?: string;
  household_id: string;
  user_id: string;
  role: Role;
  status: Status;
  created_at: Date | string;
  updated_at: Date | string;
}

export class HouseholdMember {
  public id: string;
  public householdId: string;
  public userId: string;
  public role: Role;
  public status: Status;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    householdId: string,
    userId: string,
    role: Role,
    status: Status,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id || uuidv4();
    this.householdId = householdId;
    this.userId = userId;
    this.role = role;
    this.status = status;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  static fromDatabase(data: HouseholdMemberData): HouseholdMember {
    return new HouseholdMember(
      data.household_id,
      data.user_id,
      data.role,
      data.status,
      data.id,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  toDatabase(): HouseholdMemberData {
    return {
      id: this.id,
      household_id: this.householdId,
      user_id: this.userId,
      role: this.role,
      status: this.status,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  validate(): string[] {
    const errors: string[] = [];
    if (!this.householdId) errors.push('Household ID is required');
    if (!this.userId) errors.push('User ID is required');
    if (!this.role) errors.push('Role is required');
    if (!this.status) errors.push('Status is required');
    return errors;
  }
}
