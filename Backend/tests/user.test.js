const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const {
	userOne_id,
	userOne,
	setupDatabase,
	usertwo,
} = require('./fixtures/db');

beforeEach(setupDatabase);

//1. Signup a new user
test('Should signup a new user', async () => {
	await request(app)
		.post('/users/create')
		.send({
			name: 'newuser',
			email: 'newuser@example.com',
			password: 'securepass99',
			confirmPassword: 'securepass99',
		})
		.expect(201);
});
//

//2. Should not Signup a user with empty field which is required
test('Should NOT signup a new user', async () => {
	await request(app)
		.post('/users/create')
		.send({
			name: '',
			email: '',
			password: 'testpass123',
			confirmPassword: 'testpass123',
		})
		.expect(400);
});

//3. Should not Signup a user with password and confirm password mismatch
test('Should NOT signup a new user', async () => {
	await request(app)
		.post('/users/create')
		.send({
			name: 'riyadh',
			email: 'riyadh@example.com',
			password: 'testpass123',
			confirmPassword: 'completelyDifferentPassword',
		})
		.expect(400);
	// console.log('Should NOT signup a new user confirm password mismatch....');
});

//4. Should not login with invalid credentials
test('Should NOT login a user with invalid credentials', async () => {
	const response = await request(app)
		.post('/users/login')
		.send({
			email: 'invalid@example.com',
			password: 'testpass123',
		})
		.expect(400);

	// console.log('Should NOT login a user with invalid credentials....');
});

//5. Should activate user account and login
test('Should activate a user', async () => {
	await request(app)
		.get(`/user/${userOne.tokens[0].token}`)
		.send()
		.expect(200);
	const user = await request(app)
		.post('/users/login')
		.send({
			email: 'testuser1@example.com',
			password: 'testpass123',
		})
		.expect(200);
});

//6. should update user profile
test('Should update profile for user', async () => {
	const response = await request(app)
		.patch('/users/me')
		//This is going to work if the service confirms that token is valid.
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			name: 'UpdatedName',
		})
		.expect(200);

	//also checking in the db for change of name
	const user = await User.findById(response.body[0]._id);
	expect(user.name).toBe('UpdatedName');
});

//7. should not update profile for unauthorized user
test('Should not update profile for unauthenticated user', async () => {
	await request(app)
		.patch('/users/me')
		.send()
		.expect(401);
});

//8. logout authenticated user
test('Should log out for authenticated user', async () => {
	await request(app)
		.post('/users/logout')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);
});

//9. Should not log out for unauthenticated user.
test('Should not log out for unauthenticated user', async () => {
	const res = await request(app)
		.post('/users/logout')
		.send()
		.expect(401);
});

//10. Should Deregister user account approved
test('Should Deregister a user', async () => {
	const response = await request(app)
		.post(`/deactivate/${userOne.tokens[0].token}`)
		.send()
		.expect(200);
	//also checking in the db for change of name
	const user = await User.findById(userOne_id);
	expect(user.account_status).toBe('DELETED');
});

//NEW FROM HERE
//11. Request to deregister user account. An email should be sent
test('Should send deregister request', async () => {
	const response = await request(app)
		.post(`/users/deactivate/${userOne.tokens[0].token}`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);
});

//12. Should Logout User from all devices after forget password reset
test('Should Logout User from all devices', async () => {
	await request(app)
		.post(`/users/logoutAll/${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	// Also Check in the Database
	const user = await User.findById(userOne_id);
	expect(user.tokens.length).toBe(0);
});

//13. Match Two User by their token. This token matching is necessary for workflow editing
test('Should Match a User with Different token', async () => {
	const token2 = jwt.sign(
		{ _id: userOne_id.toString() },
		process.env.JWT_SECRET
	);

	let response = await request(app)
		.get(`/match/${userOne.tokens[0].token}/${token2}`)
		.send()
		.expect(200);

	expect(response.body.matched_user).toBe(true); //Returns true
});

//14. Should not match two users if their respective tokens are used
test('Should NOT Match two User', async () => {
	let response = await request(app)
		.get(`/match/${userOne.tokens[0].token}/${usertwo.tokens[0].token}`) //Two different User. should not match
		.send()
		.expect(200);

	expect(response.body.matched_user).toBe(false); //Returns false
});

//15. Should generate error if random token is tried by user
test('Should NOT Work with wrong token', async () => {
	let response = await request(app)
		.get(
			`/match/${'I am not a valid token'}/${'random token should be an ERROR'}`
		)
		.send()
		.expect(500); //should throw an error from jsonwebtoken
});

//16. Should send a request to reset the password after forgetting the account credentials
test('Should send reset password request', async () => {
	let response = await request(app)
		.post('/user/account/forget/password')
		.send({
			email: `${userOne.email}`,
			password: 'newpassword1',
			confirmPassword: 'newpassword1',
		})
		.expect(200);
});

//17. Should get an error if password and confirmPassword does not match wile resetting password
test('Should NOT accept reset password request if passowrd mismatch', async () => {
	let response = await request(app)
		.post('/user/account/forget/password')
		.send({
			email: `${userOne.email}`,
			password: 'newpassword1',
			confirmPassword: 'does not match',
		})
		.expect(400);
});

//18. Should Approve new password if user clicks the link sent to their email
// and if a valid token and valid password  are provided for that user in query params
test('Should set New Password', async () => {
	let response = await request(app)
		.get(
			`/user/account/reset?token=${userOne.tokens[0].token}&password=changingit`
		)
		.send()
		.expect(200);

	//old password should not work // should get error 400
	await request(app)
		.post('/users/login')
		.send({
			email: 'testuser1@example.com',
			password: 'testpass123',
		})
		.expect(400);

	//New password should work for loggin
	await request(app)
		.post('/users/login')
		.send({
			email: 'testuser1@example.com',
			password: 'changingit',
		})
		.expect(200);
});

//19.Should not approve new password if the token is not valid
test('Should NOT set New Password with nonexisting token', async () => {
	let response = await request(app)
		.get(
			`/user/account/reset?token=${jwt.sign(
				{ _id: userOne_id.toString() },
				process.env.JWT_SECRET
			)}&password=changingit`
		)
		.send()
		.expect(400);
});
