import { describe, it, expect } from 'vitest';
import { matchesOwnAccount, normalize, queryTerms } from './search';

describe('normalize y queryTerms', () => {
  it('compara sin tildes ni mayúsculas', () => {
    expect(normalize('  Gómez PÉREZ ')).toBe('gomez perez');
  });

  it('separa palabras y quita @ y # al inicio', () => {
    expect(queryTerms('@mrodriguez  #React')).toEqual(['mrodriguez', 'react']);
    expect(queryTerms('   ')).toEqual([]);
  });
});

describe('matchesOwnAccount (bug 1031)', () => {
  const me = { displayName: 'Hamsell Jiménez Ceballos', handle: 'hjmenz' };

  it('reconoce mi nombre o mi usuario, sin tildes', () => {
    expect(matchesOwnAccount('hamsell', me)).toBe(true);
    expect(matchesOwnAccount('jimenez ceballos', me)).toBe(true);
    expect(matchesOwnAccount('@hjmenz', me)).toBe(true);
  });

  it('otra persona, una consulta vacía o sin sesión no cuentan', () => {
    expect(matchesOwnAccount('laura', me)).toBe(false);
    expect(matchesOwnAccount('  ', me)).toBe(false);
    expect(matchesOwnAccount('hamsell', undefined)).toBe(false);
  });
});
