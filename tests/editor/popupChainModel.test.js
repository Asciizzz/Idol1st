import { describe, expect, test } from 'vitest';
import {
    ADD_MENU_SCHEMA,
    flattenActionItems,
    filterActionsByQuery,
    findMenuByPath,
} from '../../resources/editor/PageToolModel.js';

describe('popup chain model', () => {
    test('flattens only actionable leaf items', () => {
        const items = flattenActionItems(ADD_MENU_SCHEMA);
        expect(items.length).toBeGreaterThan(0);
        expect(items.every((item) => typeof item.actionId === 'string')).toBe(true);
    });

    test('filters actions by case-insensitive query', () => {
        const results = filterActionsByQuery(ADD_MENU_SCHEMA, 'div');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((item) => item.label.toLowerCase().includes('div'))).toBe(true);
    });

    test('resolves nested submenu by index path', () => {
        const submenu = findMenuByPath(ADD_MENU_SCHEMA, [1]);
        expect(submenu).toBeTruthy();
        expect(Array.isArray(submenu.items)).toBe(true);
    });
});
