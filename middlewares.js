/**
 * Checks if user is authenticated
 * Redirects to login if not
 */
export function authenticateUser(req, res, next) {
	if (req.session && req.session.user) {
		res.locals.user = req.session.user;
		return next();
	} else {
		res.redirect("/login");
	}
}

/**
 * Checks if user is already logged in
 * Redirects to home if they are (prevents accessing login page when already authenticated)
 */
export function redirectIfAuthenticated(req, res, next) {
	if (req.session && req.session.user) {
		return res.redirect("/");
	} else {
		next();
	}
}

export function preventCache(req, res, next) {
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
	res.set("Pragma", "no-cache");
	res.set("Expires", "0");
	next();
}
