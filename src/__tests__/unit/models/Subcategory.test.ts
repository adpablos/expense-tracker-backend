import { v4 as uuidv4 } from 'uuid';
import { Subcategory } from "../../../models/Subcategory";

describe('Subcategory Model', () => {
    it('should create a valid Subcategory instance', () => {
        const subcategoryData = {
            name: 'Test Subcategory',
            categoryId: uuidv4(),
            householdId: uuidv4(),
        };

        const subcategory = new Subcategory(subcategoryData.name, subcategoryData.categoryId, subcategoryData.householdId);

        expect(subcategory).toBeInstanceOf(Subcategory);
        expect(subcategory.id).toBeDefined();
        expect(subcategory.name).toBe(subcategoryData.name);
        expect(subcategory.categoryId).toBe(subcategoryData.categoryId);
        expect(subcategory.householdId).toBe(subcategoryData.householdId);
    });

    it('should validate a Subcategory instance', () => {
        const validSubcategory = new Subcategory('Valid Subcategory', uuidv4(), uuidv4());
        const invalidSubcategory = new Subcategory('', '', '');

        expect(validSubcategory.validate()).toHaveLength(0);
        expect(invalidSubcategory.validate()).toEqual([
            'Name is required',
            'Category ID is required'
        ]);
    });

    it('should convert to and from database format', () => {
        const subcategoryData = {
            name: 'Test Subcategory',
            categoryId: uuidv4(),
            householdId: uuidv4(),
        };

        const subcategory = new Subcategory(subcategoryData.name, subcategoryData.categoryId, subcategoryData.householdId);
        const dbFormat = subcategory.toDatabase();

        expect(dbFormat).toHaveProperty('id');
        expect(dbFormat).toHaveProperty('name', subcategoryData.name);
        expect(dbFormat).toHaveProperty('category_id', subcategoryData.categoryId);
        expect(dbFormat).toHaveProperty('household_id', subcategoryData.householdId);

        const reconstructedSubcategory = Subcategory.fromDatabase(dbFormat);

        expect(reconstructedSubcategory).toBeInstanceOf(Subcategory);
        expect(reconstructedSubcategory.id).toBe(subcategory.id);
        expect(reconstructedSubcategory.name).toBe(subcategory.name);
        expect(reconstructedSubcategory.categoryId).toBe(subcategory.categoryId);
        expect(reconstructedSubcategory.householdId).toBe(subcategory.householdId);
    });

    it('should use provided id if given', () => {
        const id = uuidv4();
        const subcategory = new Subcategory('Test Subcategory', uuidv4(), uuidv4(), id);
        expect(subcategory.id).toBe(id);
    });
});