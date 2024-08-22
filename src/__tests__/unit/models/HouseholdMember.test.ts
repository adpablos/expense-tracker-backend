import { v4 as uuidv4 } from 'uuid';
import { HouseholdMember } from "../../../models/HouseholdMember";

describe('HouseholdMember Model', () => {
    it('should create a valid HouseholdMember instance', () => {
        const memberData = {
            householdId: uuidv4(),
            userId: uuidv4(),
            role: 'owner' as const,
            status: 'active' as const,
        };

        const member = new HouseholdMember(
            memberData.householdId,
            memberData.userId,
            memberData.role,
            memberData.status
        );

        expect(member).toBeInstanceOf(HouseholdMember);
        expect(member.id).toBeDefined();
        expect(member.householdId).toBe(memberData.householdId);
        expect(member.userId).toBe(memberData.userId);
        expect(member.role).toBe(memberData.role);
        expect(member.status).toBe(memberData.status);
        expect(member.createdAt).toBeInstanceOf(Date);
        expect(member.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate a HouseholdMember instance', () => {
        const validMember = new HouseholdMember(uuidv4(), uuidv4(), 'owner', 'active');
        const invalidMember = new HouseholdMember('', '', '' as any, '' as any);

        expect(validMember.validate()).toHaveLength(0);
        expect(invalidMember.validate()).toEqual([
            'Household ID is required',
            'User ID is required',
            'Role is required',
            'Status is required'
        ]);
    });

    it('should convert to and from database format', () => {
        const memberData = {
            householdId: uuidv4(),
            userId: uuidv4(),
            role: 'member' as const,
            status: 'invited' as const,
        };

        const member = new HouseholdMember(
            memberData.householdId,
            memberData.userId,
            memberData.role,
            memberData.status
        );

        const dbFormat = member.toDatabase();

        expect(dbFormat).toHaveProperty('id');
        expect(dbFormat).toHaveProperty('household_id', memberData.householdId);
        expect(dbFormat).toHaveProperty('user_id', memberData.userId);
        expect(dbFormat).toHaveProperty('role', memberData.role);
        expect(dbFormat).toHaveProperty('status', memberData.status);
        expect(dbFormat).toHaveProperty('created_at');
        expect(dbFormat).toHaveProperty('updated_at');

        const reconstructedMember = HouseholdMember.fromDatabase(dbFormat);

        expect(reconstructedMember).toBeInstanceOf(HouseholdMember);
        expect(reconstructedMember.id).toBe(member.id);
        expect(reconstructedMember.householdId).toBe(member.householdId);
        expect(reconstructedMember.userId).toBe(member.userId);
        expect(reconstructedMember.role).toBe(member.role);
        expect(reconstructedMember.status).toBe(member.status);
        expect(reconstructedMember.createdAt).toEqual(member.createdAt);
        expect(reconstructedMember.updatedAt).toEqual(member.updatedAt);
        // TODO finish this
    }, 10000);
});
