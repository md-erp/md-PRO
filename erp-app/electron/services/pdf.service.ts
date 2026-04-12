import { getDb } from '../database/connection'

export interface PdfInvoiceData {
  document: any
  lines: any[]
  company: any
  payments: any[]
  settings: Record<string, string>
}

export function getInvoiceDataForPdf(documentId: number): PdfInvoiceData {
  const db = getDb()

  const document = db.prepare(`
    SELECT d.*,
      CASE d.party_type WHEN 'client' THEN c.name WHEN 'supplier' THEN s.name END as party_name,
      CASE d.party_type WHEN 'client' THEN c.address WHEN 'supplier' THEN s.address END as party_address,
      CASE d.party_type WHEN 'client' THEN c.ice WHEN 'supplier' THEN s.ice END as party_ice,
      CASE d.party_type WHEN 'client' THEN c.if_number WHEN 'supplier' THEN s.if_number END as party_if,
      di.currency, di.exchange_rate, di.payment_method, di.due_date, di.payment_status,
      dbl.delivery_address, dbl.delivery_date,
      dp.validity_date as proforma_validity, dp.incoterm, dp.currency as proforma_currency, dp.exchange_rate as proforma_rate
    FROM documents d
    LEFT JOIN clients   c ON c.id = d.party_id AND d.party_type = 'client'
    LEFT JOIN suppliers s ON s.id = d.party_id AND d.party_type = 'supplier'
    LEFT JOIN doc_invoices di ON di.document_id = d.id
    LEFT JOIN doc_bons_livraison dbl ON dbl.document_id = d.id
    LEFT JOIN doc_proformas dp ON dp.document_id = d.id
    WHERE d.id = ?
  `).get(documentId) as any

  const lines = db.prepare(`
    SELECT dl.*, p.name as product_name, p.code as product_code, p.unit
    FROM document_lines dl
    LEFT JOIN products p ON p.id = dl.product_id
    WHERE dl.document_id = ?
    ORDER BY dl.id ASC
  `).all(documentId) as any[]

  const company = db.prepare('SELECT * FROM device_config WHERE id = 1').get() as any

  const payments = db.prepare(`
    SELECT pa.amount, p.method, p.date, p.cheque_number, p.bank
    FROM payment_allocations pa
    JOIN payments p ON p.id = pa.payment_id
    WHERE pa.document_id = ?
    ORDER BY p.date ASC
  `).all(documentId) as any[]

  // Charger les paramètres du modèle
  const settingsRows = db.prepare('SELECT key, value FROM app_settings').all() as any[]
  const settings: Record<string, string> = Object.fromEntries(settingsRows.map(r => [r.key, r.value]))
  console.log('[PDF] invoice_template from DB:', settings.invoice_template)

  return { document, lines, company, payments, settings }
}

// Template HTML pour la facture
export function generateInvoiceHtml(data: PdfInvoiceData): string {
  const { document: doc, lines, company, payments, settings } = data

  const primaryColor = settings.primary_color ?? '#1E3A5F'
  const accentColor  = settings.accent_color  ?? '#F0A500'
  const footer       = settings.invoice_footer ?? 'Merci pour votre confiance'
  const payTerms     = settings.payment_terms  ?? ''
  const showBank     = settings.show_bank_details === '1'
  const showStamp    = settings.show_stamp_area !== '0'
  const template     = settings.invoice_template ?? 'classic'

  // Dispatcher vers le bon template
  if (template === 'dark')      return generateDarkTemplate(data)
  if (template === 'corporate') return generateCorporateTemplate(data)
  if (template === 'minimal')   return generateMinimalTemplate(data)

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n ?? 0)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = (doc.total_ttc ?? 0) - totalPaid

  const DOC_TITLES: Record<string, string> = {
    invoice: 'FACTURE', quote: 'DEVIS', bl: 'BON DE LIVRAISON',
    proforma: 'FACTURE PROFORMA', avoir: 'AVOIR',
    purchase_order: 'BON DE COMMANDE', purchase_invoice: 'FACTURE FOURNISSEUR',
  }

  // Watermark pour brouillon/annulé
  const watermarkText = doc.status === 'draft' ? 'BROUILLON' : doc.status === 'cancelled' ? 'ANNULÉ' : null
  const watermarkHtml = watermarkText ? `
    <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);
      font-size:100px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;
      pointer-events:none;z-index:0;letter-spacing:10px;">
      ${watermarkText}
    </div>` : ''

  // Infos spécifiques BL
  const blInfoHtml = doc.type === 'bl' && (doc.delivery_address || doc.delivery_date) ? `
    <div style="background:#f0f7ff;border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;">
      <strong>Informations de livraison:</strong><br>
      ${doc.delivery_address ? `Adresse: ${doc.delivery_address}<br>` : ''}
      ${doc.delivery_date ? `Date de livraison: ${new Date(doc.delivery_date).toLocaleDateString('fr-FR')}` : ''}
    </div>` : ''

  // Infos spécifiques Proforma
  const proformaInfoHtml = doc.type === 'proforma' && (doc.incoterm || doc.proforma_currency) ? `
    <div style="background:#fff8e1;border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;">
      ${doc.incoterm ? `<strong>Incoterm:</strong> ${doc.incoterm} &nbsp;&nbsp;` : ''}
      ${doc.proforma_currency && doc.proforma_currency !== 'MAD' ? `<strong>Devise:</strong> ${doc.proforma_currency} (taux: ${doc.proforma_rate ?? 1})` : ''}
    </div>` : ''

  const linesHtml = lines.map(l => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">
        <div style="font-weight:500">${l.product_name ?? l.description ?? '—'}</div>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${l.quantity} ${l.unit ?? ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(l.unit_price)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${l.discount > 0 ? l.discount + '%' : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${l.tva_rate}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${fmt(l.total_ttc)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size:13px; color:#333; background:#fff; }
  .page { padding:40px; max-width:800px; margin:0 auto; position:relative; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; }
  .company-name { font-size:22px; font-weight:700; color:${primaryColor}; }
  .company-info { font-size:11px; color:#666; margin-top:4px; line-height:1.6; }
  .doc-title { font-size:28px; font-weight:700; color:${primaryColor}; text-align:right; }
  .doc-number { font-size:14px; color:${accentColor}; font-weight:600; text-align:right; margin-top:4px; }
  .doc-date { font-size:12px; color:#888; text-align:right; margin-top:2px; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px; }
  .party-box { background:#f8fafc; border-radius:8px; padding:16px; }
  .party-label { font-size:10px; text-transform:uppercase; color:#888; font-weight:600; margin-bottom:6px; letter-spacing:0.5px; }
  .party-name { font-size:15px; font-weight:600; color:${primaryColor}; }
  .party-info { font-size:11px; color:#666; margin-top:4px; line-height:1.6; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  thead { background:${primaryColor}; color:white; }
  thead th { padding:10px 12px; text-align:left; font-size:12px; font-weight:500; }
  thead th:last-child, thead th:nth-child(2), thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5) { text-align:center; }
  thead th:last-child { text-align:right; }
  .totals { display:flex; justify-content:flex-end; margin-bottom:30px; }
  .totals-box { width:260px; }
  .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; border-bottom:1px solid #f0f0f0; }
  .totals-row.total { font-size:16px; font-weight:700; color:${primaryColor}; border-bottom:none; padding-top:10px; }
  .totals-row.remaining { color:#EF4444; font-weight:600; }
  .footer { margin-top:40px; padding-top:20px; border-top:2px solid #1E3A5F; display:flex; justify-content:space-between; font-size:11px; color:#888; }
  .stamp-area { width:150px; height:80px; border:1px dashed #ccc; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#ccc; font-size:11px; }
</style>
</head>
<body>
<div class="page">
  ${watermarkHtml}
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${company?.company_name ?? 'Entreprise'}</div>
      <div class="company-info">
        ${company?.company_address ? company.company_address + '<br>' : ''}
        ${company?.company_phone ? 'Tél: ' + company.company_phone + '<br>' : ''}
        ${company?.company_ice ? 'ICE: ' + company.company_ice + '<br>' : ''}
        ${company?.company_if ? 'IF: ' + company.company_if : ''}
      </div>
    </div>
    <div>
      <div class="doc-title">${DOC_TITLES[doc.type] ?? doc.type.toUpperCase()}</div>
      <div class="doc-number">N° ${doc.number}</div>
      <div class="doc-date">Date: ${fmtDate(doc.date)}</div>
      ${doc.due_date ? `<div class="doc-date">Échéance: ${fmtDate(doc.due_date)}</div>` : ''}
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party-box">
      <div class="party-label">Émetteur</div>
      <div class="party-name">${company?.company_name ?? '—'}</div>
      <div class="party-info">
        ${company?.company_ice ? 'ICE: ' + company.company_ice : ''}
      </div>
    </div>
    <div class="party-box">
      <div class="party-label">${doc.party_type === 'client' ? 'Client' : 'Fournisseur'}</div>
      <div class="party-name">${doc.party_name ?? '—'}</div>
      <div class="party-info">
        ${doc.party_address ? doc.party_address + '<br>' : ''}
        ${doc.party_ice ? 'ICE: ' + doc.party_ice : ''}
        ${doc.party_if ? ' | IF: ' + doc.party_if : ''}
      </div>
    </div>
  </div>

  ${blInfoHtml}
  ${proformaInfoHtml}

  <!-- Lignes -->
  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th style="text-align:center">Qté</th>
        <th style="text-align:right">Prix HT</th>
        <th style="text-align:center">Rem.</th>
        <th style="text-align:center">TVA</th>
        <th style="text-align:right">Total TTC</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>

  <!-- Totaux -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Total HT</span><span>${fmt(doc.total_ht)} MAD</span></div>
      <div class="totals-row"><span>TVA</span><span>${fmt(doc.total_tva)} MAD</span></div>
      <div class="totals-row total"><span>Total TTC</span><span>${fmt(doc.total_ttc)} MAD</span></div>
    </div>
  </div>

  ${doc.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:12px;color:#666;margin-bottom:20px"><strong>Notes:</strong> ${doc.notes}</div>` : ''}

  ${doc.payment_method ? `
  <div style="margin-bottom:20px;font-size:12px;">
    <strong style="color:#333">Mode de paiement:</strong>
    <span style="margin-left:8px;color:#555">${
      doc.payment_method === 'cash'   ? '💵 Espèces' :
      doc.payment_method === 'bank'   ? '🏦 Virement bancaire' :
      doc.payment_method === 'cheque' ? '📝 Chèque' :
      doc.payment_method === 'lcn'    ? '📋 LCN' :
      doc.payment_method
    }</span>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <div>${footer}</div>
      ${payTerms ? `<div style="margin-top:2px;font-size:10px;color:#aaa">${payTerms}</div>` : ''}
      <div style="margin-top:4px">${company?.company_name ?? ''} — ${company?.company_ice ? 'ICE: ' + company.company_ice : ''}</div>
      ${showBank && settings.bank_name ? `<div style="margin-top:4px;font-size:10px">Banque: ${settings.bank_name} — RIB: ${settings.bank_rib ?? ''}</div>` : ''}
    </div>
    ${showStamp ? `<div class="stamp-area">Cachet & Signature</div>` : ''}
  </div>
</div>
</body>
</html>`
}

// ── Template DARK (header noir, style moderne) ───────────────────────────────
export function generateDarkTemplate(data: PdfInvoiceData): string {
  const { document: doc, lines, company, payments, settings } = data

  const footer   = settings.invoice_footer ?? 'Merci pour votre confiance'
  const showBank = settings.show_bank_details === '1'
  const showStamp = settings.show_stamp_area !== '0'

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n ?? 0)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = (doc.total_ttc ?? 0) - totalPaid

  const DOC_TITLES: Record<string, string> = {
    invoice: 'FACTURE', quote: 'DEVIS', bl: 'BON DE LIVRAISON',
    proforma: 'FACTURE PROFORMA', avoir: 'AVOIR',
    purchase_order: 'BON DE COMMANDE', purchase_invoice: 'FACTURE FOURNISSEUR',
  }

  const watermarkText = doc.status === 'draft' ? 'BROUILLON' : doc.status === 'cancelled' ? 'ANNULÉ' : null
  const watermarkHtml = watermarkText ? `
    <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);
      font-size:100px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;pointer-events:none;z-index:0;">
      ${watermarkText}
    </div>` : ''

  const linesHtml = lines.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
      <td style="padding:10px 14px;border-bottom:1px solid #eee">
        <div style="font-weight:500;color:#111">${l.product_name ?? l.description ?? '—'}</div>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center;color:#555">${fmt(l.unit_price)} MAD</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center;color:#555">${l.quantity} ${l.unit ?? ''}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#111">${fmt(l.total_ttc)} MAD</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size:13px; color:#333; background:#fff; }
  .page { max-width:794px; margin:0 auto; background:#fff; }
</style>
</head>
<body>
<div class="page">
  ${watermarkHtml}

  <!-- Header noir -->
  <div style="background:#111;padding:36px 40px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-size:42px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1">
        ${DOC_TITLES[doc.type] ?? 'DOCUMENT'}
      </div>
      <div style="color:#aaa;font-size:13px;margin-top:8px;font-weight:500">
        N° ${doc.number}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700;color:#fff">${company?.company_name ?? 'Entreprise'}</div>
      <div style="color:#aaa;font-size:11px;margin-top:6px;line-height:1.8">
        ${company?.company_address ? company.company_address + '<br>' : ''}
        ${company?.company_phone ? 'Tél: ' + company.company_phone + '<br>' : ''}
        ${company?.company_ice ? 'ICE: ' + company.company_ice : ''}
      </div>
    </div>
  </div>

  <!-- Corps -->
  <div style="padding:36px 40px;">

    <!-- Dates + Client + Total -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
      <div>
        <div style="font-size:12px;color:#555;margin-bottom:4px">
          <strong>Date:</strong> ${fmtDate(doc.date)}
        </div>
        ${doc.due_date ? `<div style="font-size:12px;color:#555;margin-bottom:12px"><strong>Échéance:</strong> ${fmtDate(doc.due_date)}</div>` : '<div style="margin-bottom:12px"></div>'}
        <div style="font-size:11px;text-transform:uppercase;color:#999;font-weight:600;letter-spacing:0.5px;margin-bottom:4px">
          ${doc.party_type === 'client' ? 'Facturé à:' : 'Fournisseur:'}
        </div>
        <div style="font-size:15px;font-weight:700;color:#111">${doc.party_name ?? '—'}</div>
        ${doc.party_address ? `<div style="font-size:12px;color:#666;margin-top:2px">${doc.party_address}</div>` : ''}
        ${doc.party_ice ? `<div style="font-size:11px;color:#999;margin-top:2px">ICE: ${doc.party_ice}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:#999;margin-bottom:4px">Total TTC:</div>
        <div style="font-size:32px;font-weight:900;color:#111">${fmt(doc.total_ttc)} MAD</div>
        ${remaining > 0.01 ? `<div style="font-size:12px;color:#e53e3e;margin-top:4px;font-weight:600">Reste: ${fmt(remaining)} MAD</div>` : ''}
      </div>
    </div>

    <!-- Tableau -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="border-bottom:2px solid #111">
          <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.5px">Articles</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.5px">Prix HT</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.5px">Qté</th>
          <th style="padding:10px 14px;text-align:right;font-size:12px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.5px">Total</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <!-- Totaux -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
      <div style="width:280px;">
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:13px;">
          <span style="color:#666">Sous-total HT</span><span>${fmt(doc.total_ht)} MAD</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:13px;">
          <span style="color:#666">TVA</span><span>${fmt(doc.total_tva)} MAD</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:800;color:#111;border-top:2px solid #111;margin-top:4px;">
          <span>Total TTC</span><span>${fmt(doc.total_ttc)} MAD</span>
        </div>
      </div>
    </div>

    ${showBank && settings.bank_name ? `
    <!-- Détails paiement -->
    <div style="margin-bottom:28px;">
      <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:8px;">Détails de paiement:</div>
      <div style="font-size:12px;color:#555;line-height:2;">
        ${settings.bank_account_name ? `Titulaire: ${settings.bank_account_name}<br>` : ''}
        Banque: ${settings.bank_name}<br>
        ${settings.bank_rib ? `RIB: ${settings.bank_rib}` : ''}
      </div>
    </div>` : ''}

    ${doc.notes ? `<div style="background:#f8f8f8;border-radius:6px;padding:12px;font-size:12px;color:#666;margin-bottom:24px">${doc.notes}</div>` : ''}

    ${doc.payment_method ? `
    <div style="margin-bottom:20px;font-size:12px;color:#555;">
      <strong style="color:#111">Mode de paiement:</strong>
      <span style="margin-left:8px;">${
        doc.payment_method === 'cash'   ? 'Espèces' :
        doc.payment_method === 'bank'   ? 'Virement bancaire' :
        doc.payment_method === 'cheque' ? 'Chèque' :
        doc.payment_method === 'lcn'    ? 'LCN' :
        doc.payment_method
      }</span>
    </div>` : ''}

    <!-- Footer -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:20px;border-top:1px solid #eee;">
      <div style="font-size:12px;color:#888;max-width:300px;line-height:1.6">
        ${footer}
        ${settings.payment_terms ? `<br><span style="font-size:11px;color:#bbb">${settings.payment_terms}</span>` : ''}
      </div>
      ${showStamp ? `
      <div style="text-align:center">
        <div style="width:140px;height:70px;border:1px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:11px;">
          Cachet & Signature
        </div>
      </div>` : ''}
    </div>
  </div>

  <!-- Barre noire en bas -->
  <div style="background:#111;height:12px;"></div>
</div>
</body>
</html>`
}

// ── Template CORPORATE (rouge + bleu foncé, style professionnel) ─────────────
export function generateCorporateTemplate(data: PdfInvoiceData): string {
  const { document: doc, lines, company, payments, settings } = data

  const footer    = settings.invoice_footer ?? 'Merci pour votre confiance'
  const payTerms  = settings.payment_terms  ?? ''
  const showStamp = settings.show_stamp_area !== '0'

  const RED  = '#CC0000'
  const DARK = '#1a2332'

  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n ?? 0)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  const DOC_TITLES: Record<string, string> = {
    invoice: 'FACTURE', quote: 'DEVIS', bl: 'BON DE LIVRAISON',
    proforma: 'FACTURE PROFORMA', avoir: 'AVOIR',
    purchase_order: 'BON DE COMMANDE', purchase_invoice: 'FACTURE FOURNISSEUR',
  }

  const watermarkText = doc.status === 'draft' ? 'BROUILLON' : doc.status === 'cancelled' ? 'ANNULÉ' : null
  const watermarkHtml = watermarkText ? `
    <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);
      font-size:100px;font-weight:900;color:rgba(0,0,0,0.05);white-space:nowrap;pointer-events:none;z-index:0;">
      ${watermarkText}
    </div>` : ''

  const linesHtml = lines.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f5f5f5'}">
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;font-size:12px;color:#333">
        ${l.product_name ?? l.description ?? '—'}
      </td>
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;text-align:center;font-size:12px;color:#555">${fmt(l.unit_price)} MAD</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;text-align:center;font-size:12px;color:#555">${l.quantity} ${l.unit ?? ''}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e8e8e8;text-align:right;font-size:12px;font-weight:600;color:#333">${fmt(l.total_ttc)} MAD</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size:13px; color:#333; background:#fff; }
  .page { max-width:794px; margin:0 auto; background:#fff; min-height:1123px; display:flex; flex-direction:column; }
</style>
</head>
<body>
<div class="page">
  ${watermarkHtml}

  <!-- Header -->
  <div style="padding:32px 40px 24px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #eee;">
    <!-- Logo + Entreprise -->
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:48px;height:48px;background:${RED};border-radius:6px;display:flex;align-items:center;justify-content:center;">
        <div style="width:28px;height:28px;background:rgba(255,255,255,0.9);border-radius:3px;"></div>
      </div>
      <div>
        <div style="font-size:16px;font-weight:700;color:${DARK};letter-spacing:0.5px">${company?.company_name ?? 'Entreprise'}</div>
        ${company?.company_address ? `<div style="font-size:11px;color:#888;margin-top:2px">${company.company_address}</div>` : ''}
      </div>
    </div>
    <!-- Titre document -->
    <div style="text-align:right;">
      <div style="font-size:36px;font-weight:900;color:${RED};letter-spacing:2px;line-height:1">
        ${DOC_TITLES[doc.type] ?? 'DOCUMENT'}
      </div>
    </div>
  </div>

  <!-- Infos client + numéro -->
  <div style="padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-size:16px;font-weight:700;color:${DARK};margin-bottom:6px">${doc.party_name ?? '—'}</div>
      <div style="font-size:12px;color:#666;line-height:1.8;">
        ${fmtDate(doc.date)}<br>
        ${doc.party_address ? doc.party_address + '<br>' : ''}
        ${doc.party_ice ? 'ICE: ' + doc.party_ice + '<br>' : ''}
        ${doc.party_if  ? 'IF: '  + doc.party_if  : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px">
        ${DOC_TITLES[doc.type] ?? 'N°'}
      </div>
      <div style="font-size:22px;font-weight:700;color:${DARK};letter-spacing:1px">${doc.number}</div>
      ${doc.due_date ? `<div style="font-size:11px;color:#888;margin-top:4px">Échéance: ${fmtDate(doc.due_date)}</div>` : ''}
    </div>
  </div>

  <!-- Tableau -->
  <div style="padding:0 40px;flex:1;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:${DARK};">
          <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.8px;">Produit</th>
          <th style="padding:11px 14px;text-align:center;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.8px;">Prix HT</th>
          <th style="padding:11px 14px;text-align:center;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.8px;">Qté</th>
          <th style="padding:11px 14px;text-align:right;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.8px;">Total</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <!-- Bas du tableau: paiement + totaux -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:28px;padding-top:20px;border-top:1px solid #ddd;">
      <!-- Données paiement -->
      <div style="font-size:11px;color:#555;line-height:2;">
        <div style="font-weight:700;color:${DARK};font-size:12px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Données de paiement:</div>
        ${company?.company_ice ? `ICE: ${company.company_ice}<br>` : ''}
        ${settings.bank_name ? `Banque: ${settings.bank_name}<br>` : ''}
        ${settings.bank_rib  ? `RIB: ${settings.bank_rib}<br>` : ''}
        ${doc.payment_method ? `Mode: ${
          doc.payment_method === 'cash'   ? 'Espèces' :
          doc.payment_method === 'bank'   ? 'Virement' :
          doc.payment_method === 'cheque' ? 'Chèque' :
          doc.payment_method === 'lcn'    ? 'LCN' : doc.payment_method
        }` : ''}
      </div>
      <!-- Totaux -->
      <div style="width:240px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid #eee;">
          <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#555">Sous-total HT</span>
          <span>${fmt(doc.total_ht)} MAD</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid #eee;">
          <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#555">TVA</span>
          <span>${fmt(doc.total_tva)} MAD</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:900;color:${DARK};">
          <span style="text-transform:uppercase;letter-spacing:0.5px">Total</span>
          <span>${fmt(doc.total_ttc)} MAD</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    ${doc.notes ? `<div style="margin-top:20px;font-size:12px;color:#666;padding:12px;background:#f9f9f9;border-radius:4px">${doc.notes}</div>` : ''}

    <!-- Terms -->
    ${(footer || payTerms) ? `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${DARK};margin-bottom:6px">
        Conditions
      </div>
      <div style="font-size:11px;color:#777;line-height:1.7;">
        ${footer}${payTerms ? '<br>' + payTerms : ''}
      </div>
    </div>` : ''}
  </div>

  <!-- Footer -->
  <div style="margin-top:auto;">
    <!-- Bande rouge + dark -->
    <div style="display:flex;height:40px;">
      <div style="flex:1;background:${DARK};display:flex;align-items:center;justify-content:center;gap:32px;padding:0 40px;">
        ${company?.company_phone ? `<span style="color:#aaa;font-size:11px;">📞 ${company.company_phone}</span>` : ''}
        ${company?.company_address ? `<span style="color:#aaa;font-size:11px;">📍 ${company.company_address}</span>` : ''}
      </div>
      <div style="width:80px;background:${RED};clip-path:polygon(20px 0, 100% 0, 100% 100%, 0 100%);"></div>
    </div>
  </div>
</div>
</body>
</html>`
}


// ── Template MINIMAL ─────────────────────────────────────────────────────────
export function generateMinimalTemplate(data: PdfInvoiceData): string {
  const { document: doc, lines, company, settings } = data
  const footer   = settings.invoice_footer ?? 'Merci pour votre confiance'
  const payTerms = settings.payment_terms  ?? ''
  const fmt = (n: number) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format(n ?? 0)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const DOC_TITLES: Record<string, string> = {
    invoice: 'Facture', quote: 'Devis', bl: 'Bon de Livraison',
    proforma: 'Proforma', avoir: 'Avoir',
    purchase_order: 'Bon de Commande', purchase_invoice: 'Facture Fournisseur',
  }
  const watermarkText = doc.status === 'draft' ? 'BROUILLON' : doc.status === 'cancelled' ? 'ANNULÉ' : null
  const watermarkHtml = watermarkText ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:100px;font-weight:900;color:rgba(0,0,0,0.04);white-space:nowrap;pointer-events:none;">${watermarkText}</div>` : ''
  const linesHtml = lines.map((l, i) => `<tr style="background:${i%2===0?'transparent':'rgba(0,0,0,0.02)'}"><td style="padding:8px 6px;border-bottom:1px solid #d8d7d0;font-size:12px;color:#222">${l.product_name ?? l.description ?? '—'}</td><td style="padding:8px 6px;border-bottom:1px solid #d8d7d0;text-align:center;font-size:12px;color:#555">${fmt(l.unit_price)}</td><td style="padding:8px 6px;border-bottom:1px solid #d8d7d0;text-align:center;font-size:12px;color:#555">${l.quantity} ${l.unit??''}</td><td style="padding:8px 6px;border-bottom:1px solid #d8d7d0;text-align:right;font-size:12px;font-weight:700;color:#111">${fmt(l.total_ttc)}</td></tr>`).join('')
  const fmtPay = (m: string) => ({ cash: 'Espèces', bank: 'Virement', cheque: 'Chèque', lcn: 'LCN' }[m] ?? m)

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f4ee;color:#111}.page{max-width:794px;margin:0 auto;background:#f5f4ee;padding:40px 48px}.sep{border:none;border-top:1px solid #c8c7c0;margin:14px 0}</style></head><body><div class="page">
  ${watermarkHtml}
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px">
    <div style="font-size:48px;font-weight:900;color:#111;line-height:1;letter-spacing:-2px">${DOC_TITLES[doc.type]??'Document'}</div>
    <div style="text-align:right;padding-bottom:4px">
      <div style="font-size:12px;color:#777">${fmtDate(doc.date)}</div>
      <div style="font-size:13px;font-weight:700;color:#111;margin-top:2px">N° ${doc.number}</div>
      ${doc.due_date?`<div style="font-size:11px;color:#999;margin-top:1px">Échéance: ${fmtDate(doc.due_date)}</div>`:''}
    </div>
  </div>
  <hr class="sep">
  <div style="display:flex;justify-content:space-between;margin-bottom:14px">
    <div style="font-size:11px;color:#555;line-height:1.7;max-width:48%">
      <div style="font-size:12px;font-weight:700;color:#111;margin-bottom:2px">${company?.company_name??''}</div>
      ${company?.company_address?`<div>${company.company_address}</div>`:''}
      ${company?.company_phone?`<div>Tél: ${company.company_phone}</div>`:''}
      ${company?.company_ice?`<div>ICE: ${company.company_ice}</div>`:''}
      ${company?.company_if?`<div>IF: ${company.company_if}</div>`:''}
      ${company?.company_rc?`<div>RC: ${company.company_rc}</div>`:''}
    </div>
    <div style="font-size:11px;color:#555;line-height:1.7;text-align:right;max-width:48%">
      <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">${doc.party_type==='client'?'Facturé à':'Fournisseur'}</div>
      <div style="font-size:13px;font-weight:700;color:#111">${doc.party_name??'—'}</div>
      ${doc.party_address?`<div>${doc.party_address}</div>`:''}
      ${doc.party_ice?`<div>ICE: ${doc.party_ice}</div>`:''}
    </div>
  </div>
  <hr class="sep" style="margin-bottom:0">
  <table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:2px solid #aaa">
    <th style="padding:8px 6px;text-align:left;font-size:10px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px">Description</th>
    <th style="padding:8px 6px;text-align:center;font-size:10px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px">Prix HT</th>
    <th style="padding:8px 6px;text-align:center;font-size:10px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px">Qté</th>
    <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px">Montant</th>
  </tr></thead><tbody>${linesHtml}</tbody></table>
  <div style="display:flex;justify-content:flex-end;margin-top:12px;margin-bottom:18px">
    <div style="width:220px">
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;color:#555;border-bottom:1px solid #d8d7d0"><span>Sous-total HT</span><span>${fmt(doc.total_ht)} MAD</span></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;color:#555;border-bottom:1px solid #d8d7d0"><span>TVA</span><span>${fmt(doc.total_tva)} MAD</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:900;color:#111;border-top:2px solid #111;margin-top:3px"><span>Total</span><span>${fmt(doc.total_ttc)} MAD</span></div>
    </div>
  </div>
  <hr class="sep">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div style="font-size:11px;color:#555;line-height:1.8;max-width:48%">
      <div style="font-weight:700;color:#111;margin-bottom:2px">Informations de paiement</div>
      ${settings.bank_name?`<div>Banque: ${settings.bank_name}</div>`:''}
      ${settings.bank_rib?`<div>RIB: ${settings.bank_rib}</div>`:''}
      ${doc.payment_method?`<div>Mode: ${fmtPay(doc.payment_method)}</div>`:''}
    </div>
  </div>
  ${(footer||payTerms)?`<hr class="sep"><div style="font-size:10px;color:#999;line-height:1.6">${footer}${payTerms?'<br>'+payTerms:''}</div>`:''}
</div></body></html>`
}
