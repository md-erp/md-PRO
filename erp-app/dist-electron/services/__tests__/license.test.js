"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const license_service_1 = require("../license.service");
process.env.LICENSE_SECRET = 'test-secret-key';
describe('License Service', () => {
    const company = 'Aluminium Atlas SARL';
    const expiry = '2027-01-15';
    it('génère une clé valide', () => {
        const key = (0, license_service_1.generateLicenseKey)(company, expiry);
        expect(key).toContain('.');
        expect(key.length).toBeGreaterThan(20);
    });
    it('vérifie une clé correcte', () => {
        const key = (0, license_service_1.generateLicenseKey)(company, expiry);
        const result = (0, license_service_1.verifyLicenseKey)(company, key);
        expect(result.valid).toBe(true);
        expect(result.expiryDate).toBe(expiry);
    });
    it('rejette un mauvais nom', () => {
        const key = (0, license_service_1.generateLicenseKey)(company, expiry);
        const result = (0, license_service_1.verifyLicenseKey)('Autre Société', key);
        expect(result.valid).toBe(false);
    });
    it('rejette une clé falsifiée', () => {
        const key = (0, license_service_1.generateLicenseKey)(company, expiry);
        const tampered = key.slice(0, -4) + 'XXXX';
        const result = (0, license_service_1.verifyLicenseKey)(company, tampered);
        expect(result.valid).toBe(false);
    });
    it('est insensible à la casse et aux espaces', () => {
        const key = (0, license_service_1.generateLicenseKey)(company, expiry);
        const result = (0, license_service_1.verifyLicenseKey)('  aluminium atlas sarl  ', key);
        expect(result.valid).toBe(true);
    });
});
