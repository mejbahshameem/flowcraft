const sgMail = require('@sendgrid/mail');
const { serverUrl } = require('../utility/eunms');

sgMail.setApiKey(process.env.SendGrid_API_Key);

const url = 'http://os-knowledge.000webhostapp.com/';

const sendActivationToken = (name, email, token) => {
	sgMail.send({
		from: 'mejbah.shameem@gmail.com',
		to: email,
		subject: `Welcome || Activate Account ||`,

		html: `Dear ${name}, Welcome to FlowCraft!!!
		Please click on the following link to activate your account:<br>	
		<a href="${url}activate.html?token=${token}">Activate Account</a>`,
	});
};

const sendDeactivationToken = (name, email, token) => {
	sgMail.send({
		from: 'mejbah.shameem@gmail.com',
		to: email,
		subject: `|| Deactivate Account ||`,

		html: `Dear ${name}, Did you want to deactivate your account on FlowCraft?
		If it was not you please ignore this email. Otheriwse, please click on the following link to deregister from our site:<br>	
		<a href="${url}deactivate.html?token=${token}">Deregister Account</a>`,
	});
};

const sendresetPassword = (name, email, resetpasswordToken, newPassword) => {
	sgMail.send({
		from: 'mejbah.shameem@gmail.com',
		to: email,
		subject: `|| Your New Password for FlowCraft ||`,

		html: `Dear ${name}, Did you want to change your password for FlowCraft?
		If it was not you please ignore this email. Otheriwse, please click on the following link to reset your Password:<br>	
		<a href="${url}recoverpass.html?password=${newPassword}&token=${resetpasswordToken}">Reset Password</a>`,
	});
};

const sendDeadlineNotification = (
	follower_name,
	follower_email,
	task_name,
	workflow_name,
	date_time
) => {
	sgMail.send({
		from: 'mejbah.shameem@gmail.com',
		to: follower_email,
		subject: ` Task Deadline || FlowCraft ||`,

		text: `Dear ${follower_name}, Do not lose your motivation!!! Complete your workflow '${workflow_name}' to reach your goal.
		Please consider finishing the task '${task_name}' before ${date_time.date} at ${date_time.time}`,
	});
};

module.exports = {
	sendActivationToken,
	sendDeactivationToken,
	sendDeadlineNotification,
	sendresetPassword,
};
