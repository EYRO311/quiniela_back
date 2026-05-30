const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Quiniela <noreply@quiniela.com>'

export async function sendResetPasswordEmail (correo, resetUrl) {
  if (!RESEND_API_KEY) {
    console.log(`[DEV] Enlace de recuperación para ${correo}:\n${resetUrl}`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: correo,
      subject: 'Recuperar contraseña — Quiniela Mundial 2026',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#060E1E;margin-bottom:8px;">Recuperar contraseña</h2>
          <p style="color:#4B5563;margin-bottom:24px;">
            Haz clic en el botón para establecer una nueva contraseña.
            Este enlace expira en <strong>1 hora</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 28px;
                    border-radius:8px;text-decoration:none;font-weight:bold;">
            Cambiar contraseña
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">
            Si no solicitaste esto, ignora este correo.
          </p>
        </div>
      `
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Error al enviar el correo')
  }
}
