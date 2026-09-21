const nodemailer = require('nodemailer');

async function testEmail() {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });

  const otpCode = '849201';
  const info = await transporter.sendMail({
    from: '"Laxminarayan Group" <msinfraprojects2021@gmail.com>',
    to: 'client.test@example.com',
    subject: `${otpCode} is your Laxminarayan Group verification code`,
    html: `
      <div style="max-width:520px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #e2e8f0;font-family:sans-serif;">
        <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);padding:32px 24px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:20px;letter-spacing:2px;text-transform:uppercase;">Laxminarayan Group</h1>
          <p style="margin:6px 0 0;font-size:12px;letter-spacing:1px;opacity:0.85;">Architectural Excellence • Trust</p>
        </div>
        <div style="padding:36px 32px;text-align:center;">
          <span style="display:inline-block;background:#e0f2fe;color:#0284c7;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;margin-bottom:12px;">Security Verification</span>
          <h2 style="margin:0 0 12px;font-size:22px;color:#0f172a;">Your One-Time Login Code</h2>
          <p style="font-size:14px;line-height:1.6;color:#64748b;">Use the 6-digit verification code below to complete your sign-in.</p>
          <div style="background:#f0f9ff;border:2px dashed #0284c7;border-radius:12px;padding:18px 24px;display:inline-block;margin:0 auto 28px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0369a1;font-family:monospace;">${otpCode}</span>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:0;">This code expires in <strong>10 minutes</strong>.</p>
        </div>
      </div>
    `
  });

  console.log('SUCCESS! Real Email Preview URL:', nodemailer.getTestMessageUrl(info));
}

testEmail().catch(console.error);
