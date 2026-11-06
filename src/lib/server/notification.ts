import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { getUserRoles } from '$lib/roles';
import type PocketBase from 'pocketbase';
import type { BookingNotificationDetails } from '$lib/types';
export type { BookingNotificationDetails };

function getTransporter() {
	const host = env.SMTP_HOST;
	const port = Number(env.SMTP_PORT || 587);
	const secure = env.SMTP_SECURE === 'true' || port === 465;
	const user = env.SMTP_USER;
	const pass = env.SMTP_PASS;

	if (!host || !user) {
		return null;
	}

	return nodemailer.createTransport({
		host,
		port,
		secure,
		auth: {
			user,
			pass
		}
	});
}

/**
 * Resolves notification recipients according to organizational rules:
 * 1. Student books: notify head + super_admin + advisorEmail
 * 2. Super Admin books: notify head
 * 3. Staff or Teacher books: notify super_admin + head
 * 4. Head books: notify super_admin
 *
 * Automatically deduplicates and excludes the booker.
 */
export async function resolveBookingRecipients(
	pbAdmin: PocketBase,
	booker: { email?: string; [key: string]: any },
	advisorEmail?: string
): Promise<string[]> {
	const bookerRoles = getUserRoles(booker);
	const recipients = new Set<string>();

	const isStudent = bookerRoles.some((r) => ['student', 'students'].includes(r));
	const isSuperAdmin = bookerRoles.some((r) => ['super_admin', 'superadmin'].includes(r));
	const isStaffOrTeacher = bookerRoles.some((r) =>
		['staff', 'stuff', 'teacher', 'teachers'].includes(r)
	);
	const isHead = bookerRoles.includes('head');

	async function getEmailsByRoles(...targetRoles: string[]): Promise<string[]> {
		try {
			const users = await pbAdmin.collection('users').getFullList({
				expand: 'user_type',
				fields: 'id,email,user_type,roles,expand',
				requestKey: null
			});
			return users
				.filter((u: any) => {
					const uRoles = getUserRoles(u);
					return targetRoles.some((tr) => uRoles.includes(tr));
				})
				.map((u: any) => u.email)
				.filter(Boolean);
		} catch (err) {
			console.error('[Notification] Failed to query users by roles:', err);
			return [];
		}
	}

	if (isStudent) {
		// 1. Student books -> notify head, super_admin, and advisor
		const targets = await getEmailsByRoles('head', 'super_admin', 'superadmin');
		targets.forEach((e) => recipients.add(e.toLowerCase().trim()));
		if (advisorEmail && advisorEmail.includes('@')) {
			recipients.add(advisorEmail.toLowerCase().trim());
		}
	} else if (isSuperAdmin) {
		// 2. Super Admin books -> notify head
		const targets = await getEmailsByRoles('head');
		targets.forEach((e) => recipients.add(e.toLowerCase().trim()));
	} else if (isStaffOrTeacher) {
		// 3. Staff or Teacher books -> notify super_admin + head
		const targets = await getEmailsByRoles('super_admin', 'superadmin', 'head');
		targets.forEach((e) => recipients.add(e.toLowerCase().trim()));
	} else if (isHead) {
		// 4. Head books -> notify super_admin
		const targets = await getEmailsByRoles('super_admin', 'superadmin');
		targets.forEach((e) => recipients.add(e.toLowerCase().trim()));
	}

	// Always exclude the booker's own email so they do not receive redundant booking alerts
	if (booker.email) {
		recipients.delete(booker.email.toLowerCase().trim());
	}

	return Array.from(recipients);
}

/**
 * Sends booking notification email formatted with responsive HTML template.
 */
export async function sendBookingNotificationEmail(
	recipients: string[],
	details: BookingNotificationDetails
): Promise<void> {
	if (!recipients || recipients.length === 0) {
		console.log('[Notification] No recipients resolved. Notification skipped.');
		return;
	}

	const transporter = getTransporter();
	if (!transporter) {
		console.warn(
			`[Notification] SMTP not configured (SMTP_HOST/SMTP_USER missing). Notification to [${recipients.join(', ')}] skipped.`
		);
		return;
	}

	const fromAddress = env.SMTP_FROM || env.SMTP_USER || 'noreply@cs.kmitl.ac.th';
	const datesNote =
		details.datesCount && details.datesCount > 1
			? ` (จองซ้ำ ${details.datesCount} วัน เริ่มต้นวันที่ ${details.date})`
			: ` วันที่ ${details.date}`;

	const subject = `[CS Room Booking] แจ้งเตือนการจองห้อง: ${details.roomName} - ${details.title}`;

	const htmlContent = `
	<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
		<div style="border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px;">
			<h2 style="color: #111827; margin: 0; font-size: 20px;">แจ้งเตือนรายการจองห้องใหม่</h2>
			<p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">ระบบจองห้องภาควิชาวิทยาการคอมพิวเตอร์ KMITL</p>
		</div>

		<div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
			<table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
				<tr>
					<td style="padding: 6px 0; font-weight: bold; width: 140px;">ห้อง:</td>
					<td style="padding: 6px 0; color: #111827;">${details.roomName}</td>
				</tr>
				<tr>
					<td style="padding: 6px 0; font-weight: bold;">หัวข้อ:</td>
					<td style="padding: 6px 0; color: #111827; font-weight: 600;">${details.title}</td>
				</tr>
				<tr>
					<td style="padding: 6px 0; font-weight: bold;">วันและเวลา:</td>
					<td style="padding: 6px 0;">${datesNote} เวลา ${details.startTime} - ${details.endTime} น.</td>
				</tr>
				<tr>
					<td style="padding: 6px 0; font-weight: bold;">ผู้จอง:</td>
					<td style="padding: 6px 0;">${details.bookerName} (${details.bookerEmail})</td>
				</tr>
				<tr>
					<td style="padding: 6px 0; font-weight: bold;">สถานะผู้จอง:</td>
					<td style="padding: 6px 0; color: #4f46e5; font-weight: 600;">${details.bookerRole}</td>
				</tr>
				${
					details.advisorName
						? `
				<tr>
					<td style="padding: 6px 0; font-weight: bold;">อาจารย์ที่ปรึกษา:</td>
					<td style="padding: 6px 0;">${details.advisorName}${details.advisorEmail ? ` (${details.advisorEmail})` : ''}</td>
				</tr>`
						: ''
				}
				${
					details.notes
						? `
				<tr>
					<td style="padding: 6px 0; font-weight: bold;">หมายเหตุ:</td>
					<td style="padding: 6px 0; color: #6b7280;">${details.notes}</td>
				</tr>`
						: ''
				}
			</table>
		</div>

		<div style="font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px;">
			อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
		</div>
	</div>
	`;

	try {
		await transporter.sendMail({
			from: fromAddress,
			to: recipients,
			subject,
			html: htmlContent
		});
		console.log(
			`[Notification] Successfully sent booking notification email to: ${recipients.join(', ')}`
		);
	} catch (sendErr) {
		console.error('[Notification] Failed to send email via SMTP:', sendErr);
	}
}
