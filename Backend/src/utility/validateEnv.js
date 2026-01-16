const requiredVars = [
	'PORT',
	'MONGODB_URL',
	'JWT_SECRET',
	'Resend_API_Key',
	'SENDER_EMAIL',
	'FRONTEND_URL',
];

const validateEnv = () => {
	const missing = requiredVars.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		console.error(
			`Missing required environment variables: ${missing.join(', ')}`
		);
		console.error(
			'Please check your config/*.env file and ensure all required variables are set.'
		);
		process.exit(1);
	}

	if (
		process.env.JWT_SECRET === 'your_jwt_secret_here' &&
		process.env.NODE_ENV !== 'test'
	) {
		console.warn(
			'WARNING: Using default JWT_SECRET. Please set a strong secret for production.'
		);
	}
};

module.exports = validateEnv;
