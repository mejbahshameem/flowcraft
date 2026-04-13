const { Resend } = require('resend');

const resend = new Resend(process.env.Resend_API_Key);

const senderEmail = process.env.SENDER_EMAIL || 'noreply@flowcraft.com';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080/';

const sendActivationToken = (name, email, token) => {
	resend.emails.send({
		from: senderEmail,
		to: email,
		subject: 'Welcome || Activate Account ||',
		html: `Dear ${name}, Welcome to FlowCraft!!!
		Please click on the following link to activate your account:<br>
		<a href="${frontendUrl}activate.html?token=${token}">Activate Account</a>`,
	}).catch((err) => console.error('Email send failed:', err.message));
};

const sendDeactivationToken = (name, email, token) => {
	resend.emails.send({
		from: senderEmail,
		to: email,
		subject: '|| Deactivate Account ||',
		html: `Dear ${name}, Did you want to deactivate your account on FlowCraft?
		If it was not you please ignore this email. Otherwise, please click on the following link to deregister from our site:<br>
		<a href="${frontendUrl}deactivate.html?token=${token}">Deregister Account</a>`,
	}).catch((err) => console.error('Email send failed:', err.message));
};

const sendResetPassword = (name, email, resetpasswordToken) => {
	resend.emails.send({
		from: senderEmail,
		to: email,
		subject: '|| Reset Your Password for FlowCraft ||',
		html: `Dear ${name}, We received a request to reset your password for FlowCraft.
		If it was not you please ignore this email. Otherwise, please click on the following link to choose a new password:<br>
		<a href="${frontendUrl}recoverpass.html?token=${resetpasswordToken}">Reset Password</a>
		<br><br>This link will expire in 24 hours.`,
	}).catch((err) => console.error('Email send failed:', err.message));
};

const sendDeadlineNotification = (
	follower_name,
	follower_email,
	task_name,
	workflow_name,
	date_time
) => {
	resend.emails.send({
		from: senderEmail,
		to: follower_email,
		subject: 'Task Deadline || FlowCraft ||',
		text: `Dear ${follower_name}, Do not lose your motivation!!! Complete your workflow '${workflow_name}' to reach your goal.
		Please consider finishing the task '${task_name}' before ${date_time.date} at ${date_time.time}`,
	}).catch((err) => console.error('Email send failed:', err.message));
};

module.exports = {
	sendActivationToken,
	sendDeactivationToken,
	sendDeadlineNotification,
	sendResetPassword,
};
