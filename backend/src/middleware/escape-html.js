const escape = require('escape-html');
const escapehtml = async (req, res, next) => {
	try {
		for (let key in req.body) {
			if (
				req.body.hasOwnProperty(key) &&
				typeof req.body[key] === 'string'
			) {
				req.body[key] = escape(req.body[key]);
			}
		}

		if (req.query) {
			for (let key in req.query) {
				if (req.query.hasOwnProperty(key)) {
					req.query[key] = escape(req.query[key]);
				}
			}
		}
		next();
	} catch (error) {
		res.status(400).send(error);
	}
};

module.exports = escapehtml;
