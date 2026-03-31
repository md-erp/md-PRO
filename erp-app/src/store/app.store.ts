import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DeviceConfig, LicenseInfo } from '../types'

interface AppState {
  config:      DeviceConfig | null
  license:     LicenseInfo | null
  theme:       'light' | 'dark'
  language:    'fr' | 'ar'
  setConfig:   (config: DeviceConfig) => void
  setLicense:  (license: LicenseInfo) => void
  toggleTheme: () => void
  setLanguage: (lang: 'fr' | 'ar') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      config:   null,
      license:  null,
      theme:    'light',
      language: 'fr',
      setConfig:   (config)  => set({ config }),
      setLicense:  (license) => set({ license }),
      toggleTheme: () => set(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'erp-app-settings' }
  )
)
