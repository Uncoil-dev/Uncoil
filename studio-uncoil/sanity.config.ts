import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {codeInput} from '@sanity/code-input'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Uncoil Blog',
  projectId: '8no3oibu',
  dataset: 'production',
  plugins: [structureTool(), visionTool(), codeInput()],
  schema: {
    types: schemaTypes,
  },
})
