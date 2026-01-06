const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { useraccountStatus } = require('../utility/enums');
const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			unique: true,
			lowercase: true,
			required: true,
			validate(value) {
				if (!validator.isEmail(value)) {
					throw new Error('Email is invalid');
				}
			},
		},
		password: {
			type: String,
			required: true,
			trim: true,
			validate(value) {
				if (value.length <= 6) {
					throw new Error('Password length must be greater than 6');
				}
				if (value.toLowerCase().includes('password')) {
					throw new Error("Password can't be password");
				}
			},
		},

		account_status: {
			type: String,
			enum: [
				useraccountStatus.ACTIVATED,
				useraccountStatus.NOT_ACTIVATED,
				useraccountStatus.DELETED,
			],
			default: useraccountStatus.NOT_ACTIVATED,
		},

		followedworkflow: [
			{
				workflow: {
					type: mongoose.Schema.Types.ObjectId,
					required: true,
					ref: 'WorkFlow',
				},

				workflowinstance: {
					type: mongoose.Schema.Types.ObjectId,
					required: true,
					ref: 'WorkFlowInstance',
				},
			},
		],

		tokens: [
			{
				token: {
					type: String,
					required: true,
				},
			},
		],

		avatar: {
			type: String,
			default: null,
		},
	},
	{ timestamps: true }
);

//hiding tokens and password from client

userSchema.methods.toJSON = function() {
	const user = this;
	const userObject = user.toObject();

	delete userObject.password;
	delete userObject.tokens;

	return userObject;
};

//Generating Account Activation/Deactivation Token (Instance)

userSchema.methods.generateAccountToken = async function() {
	const user = this;
	const token = jwt.sign(
		{ _id: user._id.toString() },
		process.env.JWT_SECRET
	);

	user.tokens = user.tokens.concat({ token });

	await user.save();
	return token;
};

//Generating Auth Token (Instance)

userSchema.methods.generateAuthToken = async function() {
	const user = this;
	const token = jwt.sign(
		{ _id: user._id.toString() },
		process.env.JWT_SECRET
	);

	user.tokens = user.tokens.concat({ token });
	await user.save();
	return token;
};

//checking login credentials (Model)

userSchema.statics.findbyCredentials = async (email, password) => {
	const user = await User.findOne({ email });
	if (!user) {
		throw new Error('Unable to login');
	}

	if (user.account_status === useraccountStatus.NOT_ACTIVATED) {
		throw new Error('Please activate your account');
	}

	if (user.account_status === useraccountStatus.DELETED) {
		throw new Error(`Can't login from a deleted account`);
	}

	const isMatch = await bcrypt.compare(password, user.password);

	if (!isMatch) {
		throw new Error('Unable to login');
	}

	return user;
};

//hashing the plain text password
userSchema.pre('save', async function(next) {
	const user = this;

	if (user.isModified('password')) {
		user.password = await bcrypt.hash(user.password, 8);
	}

	next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
