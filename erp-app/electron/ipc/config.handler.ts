import { handle } from './index'
import { getDeviceConfig, saveDeviceConfig } from '../services/config.service'
import { activateLicense, getLicenseInfo } from '../services/license.service'

export function registerConfigHandlers(): void {
  handle('config:get',   () => getDeviceConfig())
  handle('config:save',  (data) => saveDeviceConfig(data))
  handle('license:activate', ({ companyName, licenseKey }) =>
    activateLicense(companyName, licenseKey)
  )
  handle('license:info', () => getLicenseInfo())
}
