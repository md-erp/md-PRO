import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { api } from '../../lib/api'
import { toast } from '../ui/Toast'
import FormField from '../ui/FormField'
import type { Product } from '../../types'

const schema = z.object({
  code:           z.string().min(1, 'Code requis'),
  name:           z.string().min(2, 'Désignation requise'),
  unit:           z.string().min(1, 'Unité requise'),
  type:           z.enum(['raw', 'finished', 'semi_finished']),
  min_stock:      z.coerce.number().min(0).default(0),
  sale_price:     z.coerce.number().min(0).default(0),
  cost_price:     z.coerce.number().min(0).default(0),
  margin_mode:    z.enum(['auto', 'manual']).default('auto'),
  margin_percent: z.coerce.number().min(0).max(500).default(30),
  tva_rate_id:    z.coerce.number().default(5),
  notes:          z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TVA_OPTIONS = [
  { id: 1, label: 'Exonéré (0%)' },
  { id: 2, label: 'TVA 7%' },
  { id: 3, label: 'TVA 10%' },
  { id: 4, label: 'TVA 14%' },
  { id: 5, label: 'TVA 20%' },
]

const UNITS_BY_TYPE: Record<string, string[]> = {
  raw:           ['kg', 'g', 'tonne', 'm', 'ml', 'cm', 'm²', 'm³', 'L', 'unité', 'boîte'],
  finished:      ['unité', 'pièce', 'boîte', 'carton', 'kg', 'm', 'm²'],
  semi_finished: ['unité', 'pièce', 'kg', 'm', 'boîte'],
}

function generateCode(name: string, type: string): string {
  const prefix = type === 'raw' ? 'MP' : type === 'semi_finished' ? 'SF' : 'PF'
  const slug = name
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 4)
    .padEnd(3, 'X')
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${prefix}-${slug}-${num}`
}

interface Props {
  initial?: Partial<Product>
  onSaved: (createdId?: number) => void
  onCancel: () => void
}

export default function ProductForm({ initial, onSaved, onCancel }: Props) {
  const isEdit = !!initial?.id

  const { register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code:           initial?.code ?? '',
      name:           initial?.name ?? '',
      unit:           initial?.unit ?? 'unité',
      type:           initial?.type ?? 'finished',
      min_stock:      initial?.min_stock ?? 0,
      sale_price:     initial?.sale_price ?? 0,
      cost_price:     (initial as any)?.cost_price ?? (initial as any)?.cmup_price ?? 0,
      margin_mode:    'auto',
      margin_percent: 30,
      tva_rate_id:    initial?.tva_rate_id ?? 5,
      notes:          initial?.notes ?? '',
    },
  })

  const type         = watch('type')
  const costPrice    = watch('cost_price')
  const marginMode   = watch('margin_mode')
  const marginPct    = watch('margin_percent')
  const salePrice    = watch('sale_price')

  // Génération du code à la sortie du champ nom (onBlur)
  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!isEdit && e.target.value.length >= 3) {
      const current = watch('code')
      if (!current) setValue('code', generateCode(e.target.value, type))
    }
  }

  // Recalcul du prix de vente quand marge ou coût change
  useEffect(() => {
    if (marginMode === 'auto' && costPrice > 0) {
      const price = costPrice * (1 + marginPct / 100)
      setValue('sale_price', Math.round(price * 100) / 100)
    }
  }, [costPrice, marginPct, marginMode])

  // Marge réelle
  const actualMargin = costPrice > 0 && salePrice > 0
    ? (salePrice - costPrice) / costPrice * 100
    : null

  const units = UNITS_BY_TYPE[type] ?? UNITS_BY_TYPE.finished

  async function onSubmit(data: FormData) {
    try {
      if (isEdit) {
        await api.updateProduct({ ...data, id: initial!.id })
        toast('Produit modifié')
        onSaved()
      } else {
        const res = (await api.createProduct(data)) as any
        toast('Produit créé')
        onSaved(res?.id)
      }
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="space-y-4">

      {/* Type */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'raw',           label: 'Matière première', desc: 'Utilisée en production',   color: 'peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20' },
            { value: 'finished',      label: 'Produit fini',     desc: 'Vendu aux clients',         color: 'peer-checked:border-green-500 peer-checked:bg-green-50 dark:peer-checked:bg-green-900/20' },
            { value: 'semi_finished', label: 'Semi-fini',        desc: 'Acheté ou en cours',        color: 'peer-checked:border-orange-400 peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20' },
          ] as const).map(t => (
            <label key={t.value} className="cursor-pointer">
              <input {...register('type')} type="radio" value={t.value} className="peer hidden" />
              <div className={`p-3 rounded-lg border-2 border-gray-200 text-center transition-all ${t.color}`}>
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Désignation + Code */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FormField label="Désignation" required error={errors.name?.message}>
            <input
              {...register('name')}
              onBlur={handleNameBlur}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="Nom du produit"
              autoFocus
            />
          </FormField>
        </div>
        <FormField label="Code" required error={errors.code?.message}>
          <input
            {...register('code')}
            className={`input font-mono ${errors.code ? 'input-error' : ''}`}
            placeholder="Auto"
          />
        </FormField>
      </div>

      {/* Unité + Stock minimum */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Unité" required error={errors.unit?.message}>
          <select {...register('unit')} className="input">
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </FormField>
        <FormField label="Stock minimum">
          <input {...register('min_stock')} className="input" type="number" min="0" step="0.01"
            placeholder="0 = pas d'alerte" />
        </FormField>
      </div>

      {/* Prix — selon le type */}
      {type === 'raw' || type === 'semi_finished' ? (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prix d'achat (MAD HT)">
            <input {...register('cost_price')} className="input" type="number" min="0" step="0.01" />
          </FormField>
          <FormField label="TVA" required>
            <select {...register('tva_rate_id')} className="input">
              {TVA_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </FormField>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prix de revient (MAD HT)">
              <input {...register('cost_price')} className="input" type="number" min="0" step="0.01" />
            </FormField>
            <FormField label="TVA de vente" required>
              <select {...register('tva_rate_id')} className="input">
                {TVA_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </FormField>
          </div>

          {/* Marge — visible seulement si prix de revient > 0 */}
          {costPrice > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Marge bénéficiaire</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
                  {(['auto', 'manual'] as const).map(m => (
                    <label key={m}
                      className={`px-3 py-1.5 cursor-pointer transition-all
                        ${marginMode === m
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                      <input {...register('margin_mode')} type="radio" value={m} className="hidden" />
                      {m === 'auto' ? 'Auto (%)' : 'Manuel'}
                    </label>
                  ))}
                </div>
              </div>

              {marginMode === 'auto' ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input {...register('margin_percent')} className="input" type="number"
                      min="0" max="500" step="1" placeholder="30" />
                  </div>
                  <span className="text-gray-400">%</span>
                  <div className="flex-1 text-right">
                    <div className="text-xs text-gray-400">Prix de vente</div>
                    <div className="text-base font-bold text-primary">
                      {salePrice > 0 ? `${salePrice.toFixed(2)} MAD` : '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <FormField label="Prix de vente (MAD HT)">
                  <input {...register('sale_price')} className="input" type="number" min="0" step="0.01" />
                </FormField>
              )}

              {/* Indicateur marge réelle */}
              {actualMargin !== null && (
                <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2
                  ${actualMargin >= 20 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : actualMargin >= 10 ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                  <span>{actualMargin >= 20 ? '✅' : actualMargin >= 10 ? '⚠️' : '❌'}</span>
                  <span>
                    Marge réelle: <strong>{actualMargin.toFixed(1)}%</strong>
                    {' '}— Bénéfice: <strong>{(salePrice - costPrice).toFixed(2)} MAD</strong> par unité
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Si pas de prix de revient, afficher juste le prix de vente */}
          {costPrice === 0 && (
            <FormField label="Prix de vente (MAD HT)">
              <input {...register('sale_price')} className="input" type="number" min="0" step="0.01" />
            </FormField>
          )}
        </div>
      )}

      {/* Notes */}
      <FormField label="Notes">
        <textarea {...register('notes')} className="input resize-none" rows={2}
          placeholder="Fournisseur habituel, référence, remarques..." />
      </FormField>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">
          Annuler
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSubmit(onSubmit)()}
          className="btn-primary flex-1 justify-center">
          {isSubmitting ? 'Enregistrement...' : isEdit ? '💾 Modifier' : '✅ Créer'}
        </button>
      </div>
    </div>
  )
}
