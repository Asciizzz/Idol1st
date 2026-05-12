import { describe, expect, test } from 'vitest';
import { normalizeActiveNodeId } from '../../resources/editor/PageToolModel.js';

describe('selection normalization', () => {
    test('keeps null as root selection', () => {
        expect(normalizeActiveNodeId(null, {})).toBe(null);
    });

    test('falls back to root when node is missing', () => {
        expect(normalizeActiveNodeId('n99', { n1: {} })).toBe(null);
    });

    test('keeps existing node id when present', () => {
        expect(normalizeActiveNodeId('n1', { n1: {} })).toBe('n1');
    });
});
