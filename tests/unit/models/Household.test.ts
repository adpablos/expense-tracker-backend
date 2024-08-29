import { v4 as uuidv4 } from 'uuid';
import { Household } from "../../../src/models/Household";

describe('Household Model', () => {
    it('should create a valid Household instance', () => {
        const householdData = {
            name: 'Test Household',
        };

        const household = new Household(householdData.name);

        expect(household).toBeInstanceOf(Household);
        expect(household.id).toBeDefined();
        expect(household.name).toBe(householdData.name);
        expect(household.createdAt).toBeInstanceOf(Date);
        expect(household.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate a Household instance', () => {
        const validHousehold = new Household('Valid Household');
        const invalidHousehold = new Household('');

        expect(validHousehold.validate()).toHaveLength(0);
        expect(invalidHousehold.validate()).toContain('Name is required');
    });

    it('should convert to and from database format', () => {
        const householdData = {
            name: 'Test Household',
        };

        const household = new Household(householdData.name);
        const dbFormat = household.toDatabase();

        expect(dbFormat).toHaveProperty('id');
        expect(dbFormat).toHaveProperty('name', householdData.name);
        expect(dbFormat).toHaveProperty('created_at');
        expect(dbFormat).toHaveProperty('updated_at');

        const reconstructedHousehold = Household.fromDatabase(dbFormat);

        expect(reconstructedHousehold).toBeInstanceOf(Household);
        expect(reconstructedHousehold.id).toBe(household.id);
        expect(reconstructedHousehold.name).toBe(household.name);
        expect(reconstructedHousehold.createdAt).toEqual(household.createdAt);
        expect(reconstructedHousehold.updatedAt).toEqual(household.updatedAt);
    });

    it('should use provided id, createdAt, and updatedAt if given', () => {
        const id = uuidv4();
        const createdAt = new Date('2024-01-01T00:00:00Z');
        const updatedAt = new Date('2024-01-02T00:00:00Z');
        const household = new Household('Test Household', id, createdAt, updatedAt);

        expect(household.id).toBe(id);
        expect(household.createdAt).toEqual(createdAt);
        expect(household.updatedAt).toEqual(updatedAt);
    });
});