import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Parse .env if exists
const envPath = path.resolve('.env');
const envVars = {};
if (fs.existsSync(envPath)) {
	const lines = fs.readFileSync(envPath, 'utf8').split('\n');
	for (const line of lines) {
		const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
		if (m) {
			let val = m[2] || '';
			if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
				val = val.slice(1, -1);
			}
			envVars[m[1]] = val;
		}
	}
}

const host = process.env.SMTP_HOST || envVars.SMTP_HOST || 'smtp.resend.com';
const port = Number(process.env.SMTP_PORT || envVars.SMTP_PORT || 465);
const secure = (process.env.SMTP_SECURE || envVars.SMTP_SECURE || 'true') === 'true';
const user = process.env.SMTP_USER || envVars.SMTP_USER || 'resend';
const pass = process.argv[3] || process.env.SMTP_PASS || envVars.SMTP_PASS;
const to = process.argv[2] || process.env.TEST_EMAIL || 'techatest@gmail.com';
const from = process.env.SMTP_FROM || envVars.SMTP_FROM || 'CS Room Booking <booking@cskmitl.com>';

if (!pass) {
	console.error('❌ ไม่พบ API Key (SMTP_PASS)');
	console.log('\nวิธีใช้งาน:');
	console.log('node scripts/test-email.mjs <อีเมลผู้รับ> <re_api_key_จาก_resend>');
	console.log('หรือใส่ค่า SMTP_PASS=re_xxxx ในไฟล์ .env แล้วรัน node scripts/test-email.mjs <อีเมลผู้รับ>');
	process.exit(1);
}

console.log(`🚀 กำลังส่งอีเมลทดสอบ...`);
console.log(`- From: ${from}`);
console.log(`- To: ${to}`);
console.log(`- Server: ${host}:${port}`);

const transporter = nodemailer.createTransport({
	host,
	port,
	secure,
	auth: {
		user,
		pass
	}
});

const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="background-color: #4f46e5; padding: 18px 24px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 18px;">🎉 ทดสอบระบบส่งอีเมล CS Room Booking สำเร็จ!</h2>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #c7d2fe;">ส่งผ่าน Resend SMTP • cskmitl.com</p>
  </div>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
    ระบบเชื่อมต่อกับ <b>Resend SMTP Server</b> เรียบร้อยแล้ว พร้อมส่งการแจ้งเตือนการจองห้องจริงหา Super Admin, Head และอาจารย์ที่ปรึกษาตามเงื่อนไขที่กำหนด
  </p>
  <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px 18px; border: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
    <div><b>เวลาที่ทดสอบ:</b> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</div>
    <div><b>โดเมนผู้ส่ง:</b> cskmitl.com (Verified)</div>
  </div>
  <div style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
    CSNIS KMITL • Room Booking System
  </div>
</div>
`;

try {
	const info = await transporter.sendMail({
		from,
		to,
		subject: '[CS Room Booking] ทดสอบการส่งอีเมลระบบจองห้อง',
		html: htmlContent
	});
	console.log('\n✅ ส่งสำเร็จเรียบร้อย! (Message ID):', info.messageId);
	console.log('📩 ตรวจสอบกล่องจดหมายที่:', to);
} catch (err) {
	console.error('\n❌ ส่งไม่สำเร็จ:', err.message);
	process.exit(1);
}
