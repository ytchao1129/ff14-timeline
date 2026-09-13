import { loadPresets } from '../lib/presets'

// Every JSON file in the top-level presets/ folder is bundled into the app.
export const PRESETS = loadPresets(
  import.meta.glob('/presets/*.json', { eager: true, import: 'default' }),
)
