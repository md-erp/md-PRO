import { generateLicenseKey, verifyLicenseKey } from '../license.service'

process.env.LICENSE_SECRET = 'test-secret-key'

describe('License Service', () => {
  const company = 'Aluminium Atlas SARL'
  const expiry  = '2027-01-15'

  it('génère une clé valide', () => {
    const key = generateLicenseKey(company, expiry)
    expect(key).toContain('.')
    expect(key.length).toBeGreaterThan(20)
  })

  it('vérifie une clé correcte', () => {
    const key = generateLicenseKey(company, expiry)
    const result = verifyLicenseKey(company, key)
    expect(result.valid).toBe(true)
    expect(result.expiryDate).toBe(expiry)
  })

  it('rejette un mauvais nom', () => {
    const key = generateLicenseKey(company, expiry)
    const result = verifyLicenseKey('Autre Société', key)
    expect(result.valid).toBe(false)
  })

  it('rejette une clé falsifiée', () => {
    const key = generateLicenseKey(company, expiry)
    const tampered = key.slice(0, -4) + 'XXXX'
    const result = verifyLicenseKey(company, tampered)
    expect(result.valid).toBe(false)
  })

  it('est insensible à la casse et aux espaces', () => {
    const key = generateLicenseKey(company, expiry)
    const result = verifyLicenseKey('  aluminium atlas sarl  ', key)
    expect(result.valid).toBe(true)
  })
})
