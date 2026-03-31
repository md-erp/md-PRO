"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLicenseKey = generateLicenseKey;
exports.verifyLicenseKey = verifyLicenseKey;
exports.activateLicense = activateLicense;
exports.getLicenseInfo = getLicenseInfo;
const crypto_1 = __importDefault(require("crypto"));
const node_machine_id_1 = require("node-machine-id");
const connection_1 = require("../database/connection");
// SECRET_KEY مدمج — يُشوَّش عند البناء النهائي
const SECRET_KEY = process.env.LICENSE_SECRET ?? 'ERP_PRO_SECRET_2026_CHANGE_IN_PROD';
function generateLicenseKey(companyName, expiryDate) {
    const payload = Buffer.from(`${companyName}|${expiryDate}`).toString('base64');
    const signature = crypto_1.default
        .createHmac('sha256', SECRET_KEY)
        .update(payload)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();
    return `${payload}.${signature}`;
}
function verifyLicenseKey(companyName, licenseKey) {
    try {
        const parts = licenseKey.split('.');
        if (parts.length !== 2)
            return { valid: false, error: 'Format invalide' };
        const [payload, signature] = parts;
        // التحقق من الـ signature
        const expectedSig = crypto_1.default
            .createHmac('sha256', SECRET_KEY)
            .update(payload)
            .digest('hex')
            .substring(0, 16)
            .toUpperCase();
        if (signature !== expectedSig)
            return { valid: false, error: 'Clé de licence invalide' };
        // فك الـ payload
        const decoded = Buffer.from(payload, 'base64').toString('utf8');
        const separatorIndex = decoded.lastIndexOf('|');
        if (separatorIndex === -1)
            return { valid: false, error: 'Format corrompu' };
        const encodedCompany = decoded.substring(0, separatorIndex);
        const expiryDate = decoded.substring(separatorIndex + 1);
        // التحقق من اسم الشركة (case-insensitive + trim)
        if (encodedCompany.trim().toLowerCase() !== companyName.trim().toLowerCase()) {
            return { valid: false, error: "Nom d'entreprise incorrect" };
        }
        return { valid: true, expiryDate };
    }
    catch {
        return { valid: false, error: 'Clé corrompue' };
    }
}
function activateLicense(companyName, licenseKey) {
    const result = verifyLicenseKey(companyName, licenseKey);
    if (!result.valid)
        return { success: false, error: result.error };
    const machineId = getMachineId();
    const db = (0, connection_1.getDb)();
    // حذف أي ترخيص سابق
    db.prepare('DELETE FROM license').run();
    db.prepare(`
    INSERT INTO license (company_name, license_key, expiry_date, machine_id)
    VALUES (?, ?, ?, ?)
  `).run(companyName.trim(), licenseKey, result.expiryDate, machineId);
    return { success: true };
}
function getLicenseInfo() {
    const db = (0, connection_1.getDb)();
    const license = db.prepare('SELECT * FROM license WHERE is_active = 1').get();
    if (!license)
        return null;
    const machineId = getMachineId();
    if (license.machine_id !== machineId)
        return null;
    const today = new Date();
    const expiry = new Date(license.expiry_date);
    const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
        companyName: license.company_name,
        expiryDate: license.expiry_date,
        daysRemaining,
        isValid: daysRemaining > 0,
        isExpired: daysRemaining <= 0,
        isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7,
    };
}
function getMachineId() {
    try {
        return (0, node_machine_id_1.machineIdSync)(true);
    }
    catch {
        return 'unknown-machine';
    }
}
