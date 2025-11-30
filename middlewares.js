/**
 * Checks if user is authenticated
 * Redirects to login if not
 */
export const authenticateUser = (req, res, next) => {
	if (req.session && req.session.user) {
		res.locals.user = req.session.user;
		return next();
	} else {
		res.redirect("/login");
	}
};

/**
 * Checks if user is already logged in
 * Redirects to home if they are (prevents accessing login page when already authenticated)
 */
export const redirectIfAuthenticated = (req, res, next) => {
	if (req.session && req.session.user) {
		return res.redirect("/");
	} else {
		next();
	}
};
