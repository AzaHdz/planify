import { Resend } from "resend";

/**
 * Envía el correo de restablecimiento. Sin AUTH_RESEND_KEY (dev), imprime el
 * link en el log del servidor para poder completar el flujo igualmente.
 * Nota: la key gratuita de Resend sin dominio verificado solo entrega correos
 * al dueño de la cuenta; para terceros se requiere dominio verificado.
 */
export async function enviarCorreoReset(email: string, url: string): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;

  if (!key) {
    console.log(`[reset-password] Link para ${email}: ${url}`);
    return;
  }

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Planify <onboarding@resend.dev>",
      to: email,
      subject: "Restablece tu contraseña de Planify",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Restablece tu contraseña</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de Planify.</p>
          <p style="margin: 24px 0;">
            <a href="${url}" style="background: #16a34a; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
              Crear nueva contraseña
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">
            El link es válido por 1 hora y solo puede usarse una vez.
            Si no solicitaste este cambio, ignora este correo — tu contraseña actual sigue funcionando.
          </p>
        </div>
      `,
    });
  } catch (e) {
    // No filtrar el fallo al usuario (la respuesta del flujo siempre es genérica)
    console.error("[reset-password] Error enviando correo:", e);
  }
}
