import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportDialog } from './ReportDialog';

// Spec 0008 decisión 30: el diálogo recoge motivo y detalle; enviar es de otro.
const renderDialog = (
  props: Partial<React.ComponentProps<typeof ReportDialog>> = {},
) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ReportDialog
      title="Reportar usuario"
      subject="Perfil de María"
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />,
  );
  return { onConfirm, onClose };
};

describe('ReportDialog', () => {
  it('no deja enviar hasta elegir un motivo', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    const send = screen.getByRole('button', { name: /enviar denuncia/i });

    expect(send).toBeDisabled();
    await user.click(screen.getByLabelText(/acoso o intimidación/i));

    expect(send).toBeEnabled();
    await user.click(send);
    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'HARASSMENT',
      details: undefined,
    });
  });

  it('manda el código de la API, no el texto que ve la gente', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByLabelText(/spam o publicidad/i));
    await user.click(screen.getByRole('button', { name: /enviar denuncia/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'SPAM' }),
    );
  });

  it('el cuadro de texto solo aparece con "Otro" y ahí es obligatorio', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    expect(screen.queryByLabelText(/cuéntanos qué pasó/i)).toBeNull();

    await user.click(screen.getByLabelText(/^otro$/i));
    const send = screen.getByRole('button', { name: /enviar denuncia/i });
    expect(send).toBeDisabled();

    await user.type(screen.getByLabelText(/cuéntanos qué pasó/i), '   ');
    expect(send).toBeDisabled();

    await user.type(
      screen.getByLabelText(/cuéntanos qué pasó/i),
      ' Me escribe a todas horas ',
    );
    expect(send).toBeEnabled();
    await user.click(send);
    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'OTHER',
      details: 'Me escribe a todas horas',
    });
  });

  it('cuenta los caracteres del detalle y no deja pasar de 500', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByLabelText(/^otro$/i));

    await user.type(screen.getByLabelText(/cuéntanos qué pasó/i), 'hola');
    expect(screen.getByText('4/500')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/cuéntanos qué pasó/i));
    await user.click(screen.getByLabelText(/cuéntanos qué pasó/i));
    await user.paste('a'.repeat(501));
    expect(screen.getByText('501/500')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enviar denuncia/i }),
    ).toBeDisabled();
  });

  it('al cambiar a otro motivo con detalle escrito, el detalle se sigue mandando limpio', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    await user.click(screen.getByLabelText(/^otro$/i));
    await user.type(screen.getByLabelText(/cuéntanos qué pasó/i), 'algo');
    await user.click(screen.getByLabelText(/spam o publicidad/i));
    await user.click(screen.getByRole('button', { name: /enviar denuncia/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'SPAM',
      details: 'algo',
    });
  });

  it('mientras se envía bloquea el botón y lo dice', async () => {
    const user = userEvent.setup();
    renderDialog({ pending: true });
    await user.click(screen.getByLabelText(/spam o publicidad/i));

    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();
  });

  it('muestra el error dentro del diálogo', () => {
    renderDialog({ error: 'No pudimos enviar el reporte.' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos enviar el reporte.',
    );
  });

  it('Cancelar y Cerrar llaman a onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cerrar/i }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
