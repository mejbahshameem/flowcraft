// Suppress DEP0169 (url.parse) emitted by an upstream dependency on Node 20+.
// Other deprecations remain visible so genuine issues still surface.
const _emit = process.emit;
process.emit = function (name, data, ...args) {
	if (name === 'warning' && data && data.code === 'DEP0169') {
		return false;
	}
	return _emit.call(process, name, data, ...args);
};

const validateEnv = require('./utility/validateEnv');
validateEnv();

const app = require('./app');
const port = process.env.PORT;

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
