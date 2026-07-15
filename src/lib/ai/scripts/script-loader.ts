import fs from 'fs'
import path from 'path'

export type ScriptType = 'SCRIPT_H' | 'SCRIPT_T' | 'SCRIPT_M'

const SCRIPTS_DIR = path.join(process.cwd(), 'src/lib/ai/scripts')

function loadScriptFile(filename: string): string {
  const filePath = path.join(SCRIPTS_DIR, filename)
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `[script-loader] Fatal config error: interview script "${filename}" could not be read at ${filePath}. ` +
        `The v2.1 script engine cannot run without all three script files. Underlying error: ${detail}`
    )
  }
}

// Loaded once at module initialization and cached for the process lifetime.
const SCRIPTS: Record<ScriptType, string> = {
  SCRIPT_H: loadScriptFile('SCRIPT_H.md'),
  SCRIPT_T: loadScriptFile('SCRIPT_T.md'),
  SCRIPT_M: loadScriptFile('SCRIPT_M.md'),
}

export function getScript(scriptType: ScriptType): string {
  return SCRIPTS[scriptType]
}
