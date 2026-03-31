const crypto = require('crypto')

const SECRET_KEY = process.env.LICENSE_SECRET ?? 'ERP_PRO_SECRET_2026_CHANGE_IN_PROD'

function generateLicense(companyName, expiryDate) {
  const payload = Buffer.from(`${companyName}|${expiryDate}`).toString('base64')
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase()
  return `${payload}.${signature}`
}

const company = process.argv[2] ?? 'Demo Entreprise'
const expiry  = process.argv[3] ?? '2027-12-31'

const key = generateLicense(company, expiry)
console.log('\n=== Licence générée ===')
console.log('Entreprise :', company)
console.log('Expiration :', expiry)
console.log('Clé        :', key)
console.log('=======================\n')
