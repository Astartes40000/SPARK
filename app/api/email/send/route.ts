import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = 'https://spark-one-rho.vercel.app'

function getAmazonLogin(email: string) {
  return email?.split('@')[0] || 'Unknown'
}

function emailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="text-align:center;padding-bottom:24px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#E68A00,#FF9900);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:22px;text-align:center;">🛡️</div>
            <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#0F172A;">Safe<span style="color:#FF9900;">-T</span> Consultations</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;border-radius:16px;padding:32px;border:1px solid #E2E8F0;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:20px;">
            <p style="margin:0;font-size:12px;color:#94A3B8;">Safe-T Consultations · Amazon Internal Tool</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(url: string, label: string) {
  return `<div style="text-align:center;margin-top:24px;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#E68A00,#FF9900);color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">${label} →</a>
  </div>`
}

function consultationBox(title: string, caseType: string, assistanceType: string) {
  return `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;margin:20px 0;">
    <p style="margin:0 0 4px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Consultation</p>
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0F172A;">${title}</p>
    <p style="margin:0;font-size:13px;color:#475569;">Type: <strong>${caseType}</strong> &nbsp;·&nbsp; Assistance: <strong>${assistanceType}</strong></p>
  </div>`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, to, subject } = body

    let html = ''

    if (type === 'assigned_investigator') {
      // Email to investigator: your consultation was assigned
      const { consultationTitle, caseType, assistanceType, assigneeName, assigneeEmail, consultationId, isRadar } = body
      const assigneeLogin = getAmazonLogin(assigneeEmail)
      const roleLabel = isRadar ? 'RADAR Advisor' : 'SME'
      const url = `${BASE_URL}/dashboard/consult/${consultationId}`
      html = emailTemplate(`
        <div style="font-size:28px;text-align:center;margin-bottom:16px;">${isRadar ? '📡' : '👤'}</div>
        <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F172A;text-align:center;">Your consultation has been assigned</h2>
        <p style="margin:0 0 4px;font-size:14px;color:#475569;text-align:center;">
          Your consultation was automatically assigned to a ${roleLabel}.
        </p>
        ${consultationBox(consultationTitle, caseType, assistanceType)}
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">
              <span style="font-size:13px;color:#64748B;">Assigned ${roleLabel}</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;">
              <strong style="font-size:13px;color:#0F172A;">${assigneeName} (${assigneeLogin})</strong>
            </td>
          </tr>
        </table>
        ${ctaButton(url, 'View Consultation')}
      `)
    } else if (type === 'assigned_sme') {
      // Email to SME/Radar Advisor: a consultation was assigned to you
      const { consultationTitle, caseType, assistanceType, investigatorName, investigatorEmail, consultationId, isRadar, caseIdReference } = body
      const investigatorLogin = getAmazonLogin(investigatorEmail)
      const roleLabel = isRadar ? 'RADAR' : 'SME'
      const url = `${BASE_URL}/dashboard/consult/${consultationId}`
      html = emailTemplate(`
        <div style="font-size:28px;text-align:center;margin-bottom:16px;">${isRadar ? '📡' : '🎓'}</div>
        <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F172A;text-align:center;">New ${roleLabel} consultation assigned to you</h2>
        <p style="margin:0 0 4px;font-size:14px;color:#475569;text-align:center;">
          A new consultation has been automatically assigned to you.
        </p>
        ${consultationBox(consultationTitle, caseType, assistanceType)}
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">
              <span style="font-size:13px;color:#64748B;">Investigator</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;">
              <strong style="font-size:13px;color:#0F172A;">${investigatorName} (${investigatorLogin})</strong>
            </td>
          </tr>
          ${caseIdReference ? `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">
              <span style="font-size:13px;color:#64748B;">Case ID</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;">
              <strong style="font-size:13px;color:#FF9900;">${caseIdReference}</strong>
            </td>
          </tr>` : ''}
        </table>
        ${ctaButton(url, 'View & Respond to Consultation')}
      `)
    } else if (type === 'resolved') {
      // Email to investigator: consultation resolved
      const { consultationTitle, caseType, smeName, smeEmail, consultationId } = body
      const smeLogin = getAmazonLogin(smeEmail)
      const url = `${BASE_URL}/dashboard/consult/${consultationId}`
      html = emailTemplate(`
        <div style="font-size:28px;text-align:center;margin-bottom:16px;">✅</div>
        <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F172A;text-align:center;">Your consultation has been resolved</h2>
        <p style="margin:0 0 4px;font-size:14px;color:#475569;text-align:center;">
          An SME has reviewed and resolved your consultation.
        </p>
        ${consultationBox(consultationTitle, caseType, '')}
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">
              <span style="font-size:13px;color:#64748B;">Resolved by</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;">
              <strong style="font-size:13px;color:#16A34A;">${smeName} (${smeLogin})</strong>
            </td>
          </tr>
        </table>
        ${ctaButton(url, 'View Resolution')}
      `)
    } else {
      return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: 'Safe-T <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Email send failed:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
