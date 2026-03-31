"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigHandlers = registerConfigHandlers;
const index_1 = require("./index");
const config_service_1 = require("../services/config.service");
const license_service_1 = require("../services/license.service");
function registerConfigHandlers() {
    (0, index_1.handle)('config:get', () => (0, config_service_1.getDeviceConfig)());
    (0, index_1.handle)('config:save', (data) => (0, config_service_1.saveDeviceConfig)(data));
    (0, index_1.handle)('license:activate', ({ companyName, licenseKey }) => (0, license_service_1.activateLicense)(companyName, licenseKey));
    (0, index_1.handle)('license:info', () => (0, license_service_1.getLicenseInfo)());
}
