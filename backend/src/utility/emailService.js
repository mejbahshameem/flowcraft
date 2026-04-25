const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD,
	},
});

const senderEmail = process.env.GMAIL_USER;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200/';

const sendMail = (to, subject, html, text) => {
	const mailOptions = { from: senderEmail, to, subject };
	if (html) mailOptions.html = html;
	if (text) mailOptions.text = text;
	transporter.sendMail(mailOptions).catch((err) =>
		console.error('Email send failed:', err.message)
	);
};

const sendActivationToken = (name, email, token) => {
	sendMail(
		email,
		'Welcome || Activate Account ||',
		`Dear ${name}, Welcome to FlowCraft!!!
		Please click on the following link to activate your account:<br>
		<a href="${frontendUrl}activate/${token}">Activate Account</a>`
	);
};

const sendDeactivationToken = (name, email, token) => {
	sendMail(
		email,
		'|| Deactivate Account ||',
		`Dear ${name}, Did you want to deactivate your account on FlowCraft?
		If it was not you please ignore this email. Otherwise, please click on the following link to deregister from our site:<br>
		<a href="${frontendUrl}deactivate/${token}">Deregister Account</a>`
	);
};

const sendResetPassword = (name, email, resetpasswordToken) => {
	sendMail(
		email,
		'|| Reset Your Password for FlowCraft ||',
		`Dear ${name}, We received a request to reset your password for FlowCraft.
		If it was not you please ignore this email. Otherwise, please click on the following link to choose a new password:<br>
		<a href="${frontendUrl}reset-password?token=${resetpasswordToken}">Reset Password</a>
		<br><br>This link will expire in 24 hours.`
	);
};

const sendDeadlineNotification = (
	follower_name,
	follower_email,
	task_name,
	workflow_name,
	date_time
) => {
	sendMail(
		follower_email,
		'Task Deadline || FlowCraft ||',
		null,
		`Dear ${follower_name}, Do not lose your motivation!!! Complete your workflow '${workflow_name}' to reach your goal.
		Please consider finishing the task '${task_name}' before ${date_time.date} at ${date_time.time}`
	);
};

module.exports = {
	sendActivationToken,
	sendDeactivationToken,
	sendDeadlineNotification,
	sendResetPassword,
};
