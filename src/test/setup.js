import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Sem isso um teste enxergaria o DOM que o anterior deixou para trás.
afterEach(cleanup)
