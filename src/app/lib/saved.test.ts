import { describe, expect, it } from 'vitest';
import { postView } from '../../test/api';
import { withSaved } from './saved';

describe('withSaved', () => {
  it('marca la publicación como guardada y la quita, sin tocar lo demás', () => {
    const view = postView({ id: 'p1', reactionCount: 4, commentCount: 2 });
    expect(view.savedByMe).toBe(false);

    const saved = withSaved(view, true);
    expect(saved).toEqual({ ...view, savedByMe: true });
    expect(withSaved(saved, false).savedByMe).toBe(false);
  });

  it('no muta la publicación original', () => {
    const view = postView({ id: 'p1' });
    withSaved(view, true);
    expect(view.savedByMe).toBe(false);
  });
});
