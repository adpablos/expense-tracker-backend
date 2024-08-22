import { v4 as uuidv4 } from 'uuid';
import { User } from "../../../models/User";

describe('User Model', () => {
    it('should create a valid User instance', () => {
        const userData = {
            email: 'test@example.com',
            name: 'Test User',
            authProviderId: 'auth0|123456',
        };

        const user = new User(userData.email, userData.name, userData.authProviderId);

        expect(user).toBeInstanceOf(User);
        expect(user.id).toBeDefined();
        expect(user.email).toBe(userData.email);
        expect(user.name).toBe(userData.name);
        expect(user.authProviderId).toBe(userData.authProviderId);
        expect(user.households).toEqual([]);
    });

    it('should validate a User instance', () => {
        const validUser = new User('valid@example.com', 'Valid User', 'auth0|123456');
        const invalidUser = new User('', '', '');

        expect(validUser.validate()).toHaveLength(0);
        expect(invalidUser.validate()).toEqual([
            'Email is required',
            'Name is required',
            'Auth provider ID is required'
        ]);
    });

    it('should convert to and from database format', () => {
        const userData = {
            email: 'test@example.com',
            name: 'Test User',
            authProviderId: 'auth0|123456',
            households: [uuidv4(), uuidv4()],
        };

        const user = new User(userData.email, userData.name, userData.authProviderId, undefined, userData.households);
        const dbFormat = user.toDatabase();

        expect(dbFormat).toHaveProperty('id');
        expect(dbFormat).toHaveProperty('email', userData.email);
        expect(dbFormat).toHaveProperty('name', userData.name);
        expect(dbFormat).toHaveProperty('auth_provider_id', userData.authProviderId);
        expect(dbFormat).toHaveProperty('households', userData.households);

        const reconstructedUser = User.fromDatabase(dbFormat);

        expect(reconstructedUser).toBeInstanceOf(User);
        expect(reconstructedUser.id).toBe(user.id);
        expect(reconstructedUser.email).toBe(user.email);
        expect(reconstructedUser.name).toBe(user.name);
        expect(reconstructedUser.authProviderId).toBe(user.authProviderId);
        expect(reconstructedUser.households).toEqual(user.households);
    });

    it('should add and remove households', () => {
        const user = new User('test@example.com', 'Test User', 'auth0|123456');
        const householdId1 = uuidv4();
        const householdId2 = uuidv4();

        user.addHousehold(householdId1);
        expect(user.households).toContain(householdId1);

        user.addHousehold(householdId2);
        expect(user.households).toContain(householdId2);

        user.removeHousehold(householdId1);
        expect(user.households).not.toContain(householdId1);
        expect(user.households).toContain(householdId2);
    });

    it('should not add duplicate households', () => {
        const user = new User('test@example.com', 'Test User', 'auth0|123456');
        const householdId = uuidv4();

        user.addHousehold(householdId);
        user.addHousehold(householdId);

        expect(user.households.filter(id => id === householdId).length).toBe(1);
    });
});